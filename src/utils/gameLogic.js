import { ref, update, get, serverTimestamp } from "firebase/database";
import { db } from "./firebaseConfig";
import { GAME_STATUS, FIREBASE_PATHS, TIMINGS, ROLES, MESSAGES, LOG_TYPES } from "./constants";
import { calculateNewRating } from "./glicko";
import { getUserProfile, updateUserProfile } from "./userManager";

// Helper function to generate short game IDs (6 characters, alphanumeric)
export const generateShortGameId = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluding ambiguous chars (I, O, 0, 1, L)
    let id = '';
    for (let i = 0; i < 6; i++) {
        id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
};

/**
 * processes rating updates for a finished game
 * @param {string} gameId 
 * @param {object} gameData 
 * @param {number} hostScore 
 * @param {number} guestScore 
 */
export const processGameEndRatings = async (gameId, gameData, hostScore, guestScore) => {
    // Prevent double processing if already done
    if (gameData.ratingUpdates) return;

    const hostId = gameData.host.id;
    const guestId = gameData.guest.id;

    if (!hostId || !guestId) return;

    const p1 = await getUserProfile(hostId);
    const p2 = await getUserProfile(guestId);

    let outcome = 0.5;
    if (hostScore > guestScore) outcome = 1;
    else if (guestScore > hostScore) outcome = 0;

    const newP1 = calculateNewRating(p1, p2, outcome);
    const newP2 = calculateNewRating(p2, p1, 1 - outcome);

    // Store rating updates in the game object
    const ratingUpdates = {
        host: {
            gamesPlayed: (p1.gamesPlayed || 0) + 1,
            gamesWon: (p1.gamesWon || 0) + (outcome === 1 ? 1 : 0),
            rating: newP1.rating,
            rd: newP1.rd,
            vol: newP1.vol
        },
        guest: {
            gamesPlayed: (p2.gamesPlayed || 0) + 1,
            gamesWon: (p2.gamesWon || 0) + (outcome === 0 ? 1 : 0),
            rating: newP2.rating,
            rd: newP2.rd,
            vol: newP2.vol
        }
    };

    const updates = {};
    updates[`${FIREBASE_PATHS.GAMES}/${gameId}/ratingUpdates`] = ratingUpdates;

    await update(ref(db), updates);

    // Also update the users' profiles directly here to ensure consistency
    await updateUserProfile(hostId, ratingUpdates.host);
    await updateUserProfile(guestId, ratingUpdates.guest);

    return ratingUpdates;
};

export const resolveGame = async (gameId, gameData) => {
    console.log('[CLEANUP] Resolving stuck game:', gameId);

    const host = gameData.host;
    const guest = gameData.guest;
    let hostScore = host.score;
    let guestScore = guest.score;

    const hostLastSeen = gameData.presence?.host?.lastSeen || gameData.presence?.host?.disconnectedAt || 0;
    const guestLastSeen = gameData.presence?.guest?.lastSeen || gameData.presence?.guest?.disconnectedAt || 0;

    let msg = "GAME ENDED";
    let type = LOG_TYPES.NEUTRAL;

    let hostWins = false;
    let guestWins = false;

    if (hostScore > guestScore) {
        hostWins = true;
    } else if (guestScore > hostScore) {
        guestWins = true;
    } else {
        // Tied score - Tiebreaker: Last Seen
        // The one who stayed longer (later timestamp) wins
        if (hostLastSeen > guestLastSeen) {
            hostWins = true;
            console.log('[CLEANUP] Scores tied, Host wins by timestamps', hostLastSeen, '>', guestLastSeen);
        } else if (guestLastSeen > hostLastSeen) {
            guestWins = true;
            console.log('[CLEANUP] Scores tied, Guest wins by timestamps', guestLastSeen, '>', hostLastSeen);
        } else {
            console.log('[CLEANUP] Scores tied and timestamps equal (or missing), pure tie');
        }
    }

    if (hostWins) {
        msg = "HOST WINS (RESOLVED)";
        type = ROLES.HOST;
    } else if (guestWins) {
        msg = "GUEST WINS (RESOLVED)";
        type = ROLES.GUEST;
    } else {
        msg = MESSAGES.TIED;
    }

    // Update Game
    const updates = {};
    updates[`${FIREBASE_PATHS.GAMES}/${gameId}/status`] = GAME_STATUS.END;
    updates[`${FIREBASE_PATHS.GAMES}/${gameId}/log`] = { msg, type };

    await update(ref(db), updates);

    // Calculate Ratings
    await processGameEndRatings(gameId, gameData, hostScore, guestScore);
};

export const checkAndCleanupGame = async (gameId, gameData) => {
    if (!gameData) return false;

    // If game is already ended or abandoned, it's not active
    if (gameData.status === GAME_STATUS.END || gameData.status === GAME_STATUS.ABANDONED) {
        return false;
    }

    // Only check for abandonment in PLAYING games
    if (gameData.status !== GAME_STATUS.PLAYING && gameData.status !== GAME_STATUS.RESOLVING) {
        return true;
    }

    // Check for abandonment (both players offline for > 60s)
    const hostPresence = gameData.presence?.host;
    const guestPresence = gameData.presence?.guest;

    // If presence data doesn't exist, game was just created, don't mark as abandoned
    if (!hostPresence || !guestPresence) {
        return true;
    }

    const isHostOffline = !hostPresence.online;
    const isGuestOffline = !guestPresence.online;

    if (isHostOffline && isGuestOffline) {
        const now = Date.now();
        const hostLastSeen = hostPresence.lastSeen || hostPresence.disconnectedAt || 0;
        const guestLastSeen = guestPresence.lastSeen || guestPresence.disconnectedAt || 0;

        // If timestamps are 0 or very small, presence isn't set up yet
        if (hostLastSeen === 0 || guestLastSeen === 0) {
            return true;
        }

        const hostTimeSince = now - hostLastSeen;
        const guestTimeSince = now - guestLastSeen;

        // If both offline for more than 60 seconds
        if (hostTimeSince > TIMINGS.ABANDONMENT_TIMEOUT && guestTimeSince > TIMINGS.ABANDONMENT_TIMEOUT) {
            console.log('[CLEANUP] Game abandoned (both offline > 60s):', gameId);

            // RESOLVE THE GAME INSTEAD OF JUST ABANDONING
            await resolveGame(gameId, gameData);

            return false;
        }
    }

    return true;
};

export const checkUnresolvedGames = async (userId) => {
    console.log('[CLEANUP] Checking for unresolved games for user:', userId);
    const gamesRef = ref(db, FIREBASE_PATHS.GAMES);

    try {
        const snapshot = await get(gamesRef);
        if (!snapshot.exists()) return;

        const allGames = snapshot.val();
        const promises = [];

        for (const [gameId, game] of Object.entries(allGames)) {
            // Check if game is relevant to user
            const isParticipant = game.host?.id === userId || game.guest?.id === userId;

            if (isParticipant) {
                // Use the shared check/cleanup logic
                // This checks if it's stale and resolves it if so
                promises.push(checkAndCleanupGame(gameId, game));
            }
        }

        await Promise.all(promises);

    } catch (e) {
        console.error("Error checking unresolved games:", e);
    }
};
