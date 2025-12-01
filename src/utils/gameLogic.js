import { ref, update } from "firebase/database";
import { db } from "./firebaseConfig";
import { GAME_STATUS, FIREBASE_PATHS, TIMINGS } from "./constants";

// Helper function to generate short game IDs (6 characters, alphanumeric)
export const generateShortGameId = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluding ambiguous chars (I, O, 0, 1, L)
    let id = '';
    for (let i = 0; i < 6; i++) {
        id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
};

export const checkAndCleanupGame = async (gameId, gameData) => {
    if (!gameData) return false;

    // If game is already ended or abandoned, it's not active
    if (gameData.status === GAME_STATUS.END || gameData.status === GAME_STATUS.ABANDONED) {
        return false;
    }

    // Only check for abandonment in PLAYING games
    // WAITING games haven't started yet, so one player being missing is expected
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

            // Mark as abandoned
            await update(ref(db, `${FIREBASE_PATHS.GAMES}/${gameId}`), {
                status: GAME_STATUS.ABANDONED
            });

            return false;
        }
    }

    return true;
};
