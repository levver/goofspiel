import React, { useState, useEffect, useRef } from 'react';
import { Cpu, Hexagon, Activity } from './components/Icons';
import DataChip from './components/DataChip';
import { VerticalGraveyard, HorizontalGraveyard } from './components/Graveyard';
import ProgressBar from './components/ProgressBar';
import StatBlock from './components/StatBlock';
import EndScreen from './components/EndScreen';
import HUD from './components/HUD';
import WaitingScreen from './components/WaitingScreen';
import DisconnectWarning from './components/DisconnectWarning';
import Lobby from './components/Lobby';
import LoginScreen from './components/LoginScreen';
import {
    RANKS,
    RESOLVE_ROUND_TIMER,
    INITIAL_TIME,
    CARD_LANDING_FLASH_DURATION,
    TIE_ANIMATION_DURATION,
    CARD_FLIGHT_DURATION,
    PRIZE_ANIMATION_DELAY,
    PRIZE_ANIMATION_DURATION,
    PRIZE_ANIMATION_CLEANUP,
    GAME_STATUS,
    ROLES,
    MESSAGES,
    UI_TEXT,
    FIREBASE_PATHS,
    LOCAL_STORAGE_KEYS,
    REMATCH_STATUS,
    LOG_TYPES,
    TIMINGS
} from './utils/constants';
import { shuffle } from './utils/helpers';
import { db } from './utils/firebaseConfig';
import { ref, set, onValue, update, push, child, get, serverTimestamp, onDisconnect, remove } from "firebase/database";
import { getUserId, getUserName, getUserProfile, updateUserProfile } from './utils/userManager';

import { auth } from './utils/firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { findBestMatch, isHigherRated } from './utils/matchmaking';
import { setupPresence, sendHeartbeat, cleanupPresence } from './utils/presence';
import { generateShortGameId, checkAndCleanupGame, checkUnresolvedGames, processGameEndRatings } from './utils/gameLogic';
import SoundManager from './utils/SoundManager';


function App() {
    // --- Firebase State ---
    const [gameId, setGameId] = useState(null);
    const [playerId, setPlayerId] = useState(null); // ROLES.HOST or ROLES.GUEST
    const [gameData, setGameData] = useState(null);
    const [hostProfile, setHostProfile] = useState(null);
    const [guestProfile, setGuestProfile] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);

    // --- Local UI State ---
    const [log, setLog] = useState({ msg: MESSAGES.SYSTEM_READY, type: LOG_TYPES.NEUTRAL });
    const [animatingCard, setAnimatingCard] = useState(null);
    const [animationProps, setAnimationProps] = useState(null);
    const [localTime, setLocalTime] = useState(INITIAL_TIME);
    const [oppLocalTime, setOppLocalTime] = useState(INITIAL_TIME);

    // Refs for timer logic to avoid dependency cycles and interval resets
    const localTimeRef = useRef(INITIAL_TIME);
    const oppLocalTimeRef = useRef(INITIAL_TIME);

    // Keep refs in sync with state for heartbeat consumption
    useEffect(() => {
        localTimeRef.current = localTime;
    }, [localTime]);

    const [rematchStatus, setRematchStatus] = useState(null); // REMATCH_STATUS.WAITING, REMATCH_STATUS.OPPONENT_REQUESTED, REMATCH_STATUS.DECLINED, REMATCH_STATUS.LEFT
    const [isSearching, setIsSearching] = useState(false);
    const [searchStartTime, setSearchStartTime] = useState(null);
    const [oppDisconnectTime, setOppDisconnectTime] = useState(null);
    const [showDisconnectWarning, setShowDisconnectWarning] = useState(false);
    const [showEndScreen, setShowEndScreen] = useState(false);
    const playerSlotRef = useRef(null);

    // --- Audio Logic ---
    useEffect(() => {
        // Initialize audio on first user interaction if possible, or just rely on lazy init
        const handleInteraction = () => {
            SoundManager.resume();
            window.removeEventListener('click', handleInteraction);
        };
        window.addEventListener('click', handleInteraction);
        return () => window.removeEventListener('click', handleInteraction);
    }, []);

    // Manage Background Music based on state
    useEffect(() => {
        if (!gameData) {
            // Main Menu (Lobby)
            SoundManager.startMenuMusic();
        } else if (gameData.status === GAME_STATUS.WAITING) {
            SoundManager.startMenuMusic();
        } else if (gameData.status === GAME_STATUS.PLAYING || gameData.status === GAME_STATUS.RESOLVING) {
            SoundManager.startGameMusic();
        } else if (gameData.status === GAME_STATUS.END) {
            SoundManager.startMenuMusic(); // Back to chill
        }
    }, [gameData?.status]);


    // --- Firebase Auth Logic ---
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setCurrentUser(user);
            setAuthLoading(false);
            if (user) {
                checkUnresolvedGames(user.uid);
            }
        });
        return unsubscribe;
    }, []);

    // Check for active game on load (reconnection)
    useEffect(() => {
        if (authLoading || !currentUser) return;

        const activeGameData = localStorage.getItem(LOCAL_STORAGE_KEYS.ACTIVE_GAME);
        if (activeGameData) {
            const { gameId: savedGameId, playerId: savedPlayerId, timestamp } = JSON.parse(activeGameData);

            // Check if game is less than 1 hour old
            if (Date.now() - timestamp < TIMINGS.RECONNECT_TIMEOUT) {
                console.log('[RECONNECT] Checking for active game...', savedGameId);

                get(ref(db, `${FIREBASE_PATHS.GAMES}/${savedGameId}`)).then(snapshot => {
                    if (snapshot.exists()) {
                        const gameData = snapshot.val();
                        if (gameData.status === GAME_STATUS.PLAYING || gameData.status === GAME_STATUS.WAITING || gameData.status === GAME_STATUS.RESOLVING) {
                            // Check for abandonment before reconnecting
                            checkAndCleanupGame(savedGameId, gameData).then(isValid => {
                                if (isValid) {
                                    console.log('[RECONNECT] Reconnecting to game...', gameData.status);
                                    setGameId(savedGameId);
                                    setPlayerId(savedPlayerId);
                                } else {
                                    console.log('[RECONNECT] Game abandoned or invalid, clearing localStorage');
                                    localStorage.removeItem(LOCAL_STORAGE_KEYS.ACTIVE_GAME);
                                }
                            });
                        } else {
                            console.log('[RECONNECT] Game ended or invalid status:', gameData.status);
                            localStorage.removeItem(LOCAL_STORAGE_KEYS.ACTIVE_GAME);
                        }
                    } else {
                        console.log('[RECONNECT] Game not found, clearing localStorage');
                        localStorage.removeItem(LOCAL_STORAGE_KEYS.ACTIVE_GAME);
                    }
                }).catch(err => {
                    console.error('[RECONNECT] Error checking game:', err);
                });
            } else {
                console.log('[RECONNECT] Game too old, clearing localStorage');
                localStorage.removeItem(LOCAL_STORAGE_KEYS.ACTIVE_GAME);
            }
        }
    }, [authLoading, currentUser]);

    // --- Firebase Logic ---

    const createGame = () => {
        SoundManager.playClick();
        const newGameId = generateShortGameId();

        const initialGameData = {
            status: GAME_STATUS.WAITING,
            round: 1,
            prizeDeck: shuffle([...RANKS]),
            currentPrize: null,
            host: { score: 0, matchScore: 0, hand: [...RANKS], bid: null, graveyard: [], time: INITIAL_TIME, id: getUserId(), name: getUserName() },
            guest: { score: 0, matchScore: 0, hand: [...RANKS], bid: null, graveyard: [], time: INITIAL_TIME },
            prizeGraveyard: [],
            lastAction: Date.now(),
            roundStart: serverTimestamp(),
            rematch: {
                hostRequest: false,
                guestRequest: false,
                accepted: false
            },
            presence: {
                host: { online: true, lastSeen: serverTimestamp(), disconnectedAt: null },
                guest: { online: false, lastSeen: null, disconnectedAt: null }
            }
        };

        // Set initial prize
        initialGameData.currentPrize = initialGameData.prizeDeck[0];
        initialGameData.prizeDeck = initialGameData.prizeDeck.slice(1);

        set(ref(db, `${FIREBASE_PATHS.GAMES}/${newGameId}`), initialGameData);
        setGameId(newGameId);
        setPlayerId(ROLES.HOST);
        setLocalTime(INITIAL_TIME);
        setOppLocalTime(INITIAL_TIME);
        setGameData(null);

        // Save to localStorage for reconnection
        localStorage.setItem(LOCAL_STORAGE_KEYS.ACTIVE_GAME, JSON.stringify({
            gameId: newGameId,
            playerId: ROLES.HOST,
            timestamp: Date.now()
        }));
        console.log('[RECONNECT] Saved game to localStorage');
    };

    const joinGame = (code) => {
        SoundManager.playClick();
        const gameRef = ref(db, `${FIREBASE_PATHS.GAMES}/${code}`);

        // Check if game exists
        get(gameRef).then((snapshot) => {
            if (snapshot.exists()) {
                const gameData = snapshot.val();
                const myUserId = getUserId();

                // Determine role based on ID in game data
                // If ID matches host, I am host. If matches guest, I am guest.
                // If neither (manual join), I am guest and I take the seat.
                let role = ROLES.GUEST;

                if (gameData.host && gameData.host.id === myUserId) {
                    role = ROLES.HOST;
                } else if (gameData.guest && gameData.guest.id === myUserId) {
                    role = ROLES.GUEST;
                } else {
                    // Manual join - take guest seat
                    role = ROLES.GUEST;
                    // Only update DB if I'm taking the seat for the first time
                    update(gameRef, {
                        status: GAME_STATUS.PLAYING,
                        'guest/id': myUserId,
                        'guest/name': getUserName()
                    });
                }

                setGameId(code);
                setPlayerId(role);
                setLocalTime(INITIAL_TIME);
                setOppLocalTime(INITIAL_TIME);
                setGameData(null);

                // Save to localStorage for reconnection
                localStorage.setItem(LOCAL_STORAGE_KEYS.ACTIVE_GAME, JSON.stringify({
                    gameId: code,
                    playerId: role,
                    timestamp: Date.now()
                }));
                console.log('[JOIN] Joined game as', role);
            } else {
                alert("Game not found! Check the code.");
            }
        }).catch((error) => {
            console.error("Error joining game:", error);
            alert("Error connecting to database.");
        });
    };

    const startNextGame = async () => {
        SoundManager.playClick();
        if (!gameId || !gameData) return;

        const newPrizeDeck = shuffle([...RANKS]);
        const currentPrize = newPrizeDeck[0];
        const remainingPrizeDeck = newPrizeDeck.slice(1);

        const updates = {};
        updates[`${FIREBASE_PATHS.GAMES}/${gameId}/status`] = GAME_STATUS.PLAYING;
        updates[`${FIREBASE_PATHS.GAMES}/${gameId}/round`] = 1; // Reset round
        updates[`${FIREBASE_PATHS.GAMES}/${gameId}/prizeDeck`] = remainingPrizeDeck;
        updates[`${FIREBASE_PATHS.GAMES}/${gameId}/currentPrize`] = currentPrize;
        updates[`${FIREBASE_PATHS.GAMES}/${gameId}/prizeGraveyard`] = [];
        updates[`${FIREBASE_PATHS.GAMES}/${gameId}/tie`] = false;

        // Reset Player States (Hands, Game Scores, Bids, Graveyards)
        // KEEP Match Scores!
        updates[`${FIREBASE_PATHS.GAMES}/${gameId}/host/score`] = 0;
        updates[`${FIREBASE_PATHS.GAMES}/${gameId}/host/hand`] = [...RANKS];
        updates[`${FIREBASE_PATHS.GAMES}/${gameId}/host/bid`] = null;
        updates[`${FIREBASE_PATHS.GAMES}/${gameId}/host/graveyard`] = [];

        updates[`${FIREBASE_PATHS.GAMES}/${gameId}/guest/score`] = 0;
        updates[`${FIREBASE_PATHS.GAMES}/${gameId}/guest/hand`] = [...RANKS];
        updates[`${FIREBASE_PATHS.GAMES}/${gameId}/guest/bid`] = null;
        updates[`${FIREBASE_PATHS.GAMES}/${gameId}/guest/graveyard`] = [];

        updates[`${FIREBASE_PATHS.GAMES}/${gameId}/log`] = {
            msg: `GAME ${gameData.host.matchScore + gameData.guest.matchScore + 1} STARTED`,
            type: LOG_TYPES.NEUTRAL
        };
        updates[`${FIREBASE_PATHS.GAMES}/${gameId}/roundStart`] = serverTimestamp();

        await update(ref(db), updates);
        console.log('[GAME] Started next game in match');
    };

    useEffect(() => {
        if (!gameId) return;

        const gameRef = ref(db, `${FIREBASE_PATHS.GAMES}/${gameId}`);
        const unsubscribe = onValue(gameRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setGameData(data);

                // Game Logic Triggers based on data changes
                if (data.status === GAME_STATUS.RESOLVING && !data.resolved) {
                    // Trigger resolution animation/logic locally if needed
                    // But actual state update should be done by Host
                }
            }
        });

        return () => unsubscribe();
    }, [gameId]);

    // Setup presence tracking - ONLY run on mount/change of gameId/playerId
    useEffect(() => {
        if (!gameId || !playerId) return;

        // Setup presence on connect
        setupPresence(gameId, playerId);

        return () => {
            cleanupPresence(gameId, playerId);
        };
    }, [gameId, playerId]);



    // Send Heartbeat - Independent interval
    useEffect(() => {
        if (!gameId || !playerId) return;

        // Send heartbeat every 5 seconds
        // IMPORTANT: Use localTimeRef.current to avoid resetting the interval when time changes
        const heartbeatInterval = setInterval(() => {
            sendHeartbeat(gameId, playerId, localTimeRef.current);
        }, TIMINGS.HEARTBEAT_INTERVAL);

        return () => {
            clearInterval(heartbeatInterval);
        };
    }, [gameId, playerId]);

    // Detect when matched into a game (for the waiting user)
    useEffect(() => {
        if (!isSearching || gameId) return;

        const userId = getUserId();
        const gamesRef = ref(db, 'games');

        console.log('[MATCHMAKING] Monitoring for game creation...');

        const unsubscribe = onValue(gamesRef, (snapshot) => {
            const allGames = snapshot.val();
            if (!allGames) return;

            // Find a game where I'm either host or guest
            for (const [id, game] of Object.entries(allGames)) {
                if (game.host?.id === userId || game.guest?.id === userId) {
                    // Check validity first
                    checkAndCleanupGame(id, game).then(isValid => {
                        if (isValid) {
                            console.log('[MATCHMAKING] Found my game!', id);

                            // Remove myself from queue
                            set(ref(db, `${FIREBASE_PATHS.QUEUE}/${userId}`), null);

                            // Join the game
                            setGameId(id);
                            setPlayerId(game.host?.id === userId ? ROLES.HOST : ROLES.GUEST);
                            setIsSearching(false);
                            setSearchStartTime(null);
                        }
                    });
                    break;
                }
            }
        });

        return () => unsubscribe();
    }, [isSearching, gameId]);

    // Fetch Profiles (and refetch when game resets/rematch)
    useEffect(() => {
        if (gameData?.host?.id) {
            getUserProfile(gameData.host.id).then(setHostProfile);
        }
        if (gameData?.guest?.id) {
            getUserProfile(gameData.guest.id).then(setGuestProfile);
        }
    }, [gameData?.host?.id, gameData?.guest?.id, gameData?.round]);

    // Apply rating updates when game ends
    useEffect(() => {
        if (!gameData || gameData.status !== GAME_STATUS.END || !gameData.ratingUpdates) return;

        const myUserId = getUserId();
        const amHost = playerId === ROLES.HOST; // Calculate locally to avoid initialization order issues
        const myRatingUpdate = amHost ? gameData.ratingUpdates.host : gameData.ratingUpdates.guest;

        if (myRatingUpdate && myUserId) {
            // Each player updates their own profile
            updateUserProfile(myUserId, myRatingUpdate).then(() => {
                console.log('[RATING] Updated my profile with new rating');
            }).catch(err => {
                console.error('[RATING] Error updating profile:', err);
            });
        }
    }, [gameData?.status, gameData?.ratingUpdates, playerId]);

    // Derived State for UI
    const isHost = playerId === ROLES.HOST;
    const myData = (gameData && (isHost ? gameData.host : gameData.guest)) || {};
    const oppData = (gameData && (isHost ? gameData.guest : gameData.host)) || {};

    // Bids
    const myBid = myData.bid;
    const oppBid = oppData.bid;

    // Opponent Card Landing Effect - only show when both players have played
    useEffect(() => {
        if (oppBid && gameData?.status === GAME_STATUS.RESOLVING) {
            setOppCardLanded(true);
            const timer = setTimeout(() => setOppCardLanded(false), CARD_LANDING_FLASH_DURATION);
            return () => clearTimeout(timer);
        }
    }, [oppBid, gameData?.status]);

    // Sync local time with server time ONLY when round changes
    // We do NOT want to sync constantly because we are the source of truth for our own time
    useEffect(() => {
        // Sync my time only if I don't have a local bid yet (timer running) OR it's a new round
        if (gameData?.round !== undefined) {
            // For opponent, we ALWAYS sync from server because that's our source of truth for them
            // EXCEPT when they have acted continuously. We trust our local countdown for smoothness
            // but re-sync if the deviation is large? actually, let's just sync safely.
            // Simpler approach: Sync once per round start.
        }

        // We use a separate effect for precise control or combine here.
        // Let's rely on the previous logic but made stricter.

        // Initial / Round sync
        if (myData && myData.time !== undefined) {
            // Only force update if it's potentially a new game or round reset (time is high)
            // or if we are way out of sync (e.g. page reload)
            // Checking if time > localTime is a rough heuristic for "reset"
            if (myData.time > localTimeRef.current + 5) {
                setLocalTime(myData.time);
            }
        }
    }, [gameData?.round, myData?.time]);

    // Sync opponent time continuously (with checks to prevent stutter)
    useEffect(() => {
        if (oppData && oppData.time !== undefined) {
            const diff = Math.abs(oppData.time - oppLocalTime);
            // If opponent time deviates significantly, sync it.
            // Otherwise trust our local tick to be smoother.
            if (diff > 2) {
                setOppLocalTime(oppData.time);
            }
        }
    }, [oppData?.time]);


    // Timer Tick Logic - FIXED
    useEffect(() => {
        let interval = null;
        if (gameData?.status === GAME_STATUS.PLAYING) {
            interval = setInterval(() => {
                // Tick my time
                setLocalTime(t => {
                    if (!myBid && t > 0) return t - 1;
                    return t;
                });

                // Tick opponent time
                setOppLocalTime(t => {
                    if (t > 0 && !oppBid) return t - 1;
                    return t;
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [gameData?.status, myBid, oppBid]);

    // Monitor Opponent Disconnect
    useEffect(() => {
        if (!gameData || gameData.status !== GAME_STATUS.PLAYING || !gameData.presence) return;

        const oppPresence = isHost ? gameData.presence.guest : gameData.presence.host;

        if (!oppPresence?.online && oppPresence?.disconnectedAt) {
            const disconnectTime = oppPresence.disconnectedAt;
            setOppDisconnectTime(disconnectTime);
            setShowDisconnectWarning(true);

            console.log('[DISCONNECT] Opponent disconnected at:', disconnectTime);

            // Check if 30 seconds have passed
            const checkTimeout = setInterval(() => {
                const elapsed = Date.now() - disconnectTime;

                if (elapsed >= TIMINGS.DISCONNECT_TIMEOUT) {
                    console.log('[DISCONNECT] 30s timeout reached, ending game');
                    clearInterval(checkTimeout);
                    handleOpponentDisconnect();
                }
            }, 1000);

            return () => clearInterval(checkTimeout);
        } else {
            // Opponent is online
            if (showDisconnectWarning) {
                console.log('[DISCONNECT] Opponent reconnected');
                setShowDisconnectWarning(false);
                setOppDisconnectTime(null);
            }
        }
    }, [gameData?.presence, gameData?.status, isHost, showDisconnectWarning]);

    // Monitor Rematch State
    useEffect(() => {
        if (!gameData || gameData.status !== GAME_STATUS.END) return;

        const rematch = gameData.rematch;
        if (!rematch) return;

        // Check if opponent requested
        const oppRequested = playerId === ROLES.HOST ? rematch.guestRequest : rematch.hostRequest;
        const myRequest = playerId === ROLES.HOST ? rematch.hostRequest : rematch.guestRequest;

        if (oppRequested && !myRequest && rematchStatus !== REMATCH_STATUS.OPPONENT_REQUESTED) {
            setRematchStatus(REMATCH_STATUS.OPPONENT_REQUESTED);
        }

        // Check if both accepted OR both requested (race condition fix)
        // AND newGameId doesn't exist yet (prevent duplicate creation)
        if ((rematch.accepted || (rematch.hostRequest && rematch.guestRequest)) && rematchStatus !== REMATCH_STATUS.ACCEPTED && !rematch.newGameId) {
            setRematchStatus(REMATCH_STATUS.ACCEPTED);
            // Only host creates the game
            if (playerId === ROLES.HOST) {
                handleRematchAccepted();
            }
        }

        // Check if new game has been created (both players detect it)
        if (rematch.newGameId && rematchStatus === REMATCH_STATUS.ACCEPTED) {
            console.log('[REMATCH] Detected new game, transitioning...', rematch.newGameId);

            // Clean up presence for old game
            cleanupPresence(gameId, playerId);

            // Reset local state
            setTieAnimation(false);
            setShowEndScreen(false);
            setMyCardLanded(false);
            setOppCardLanded(false);
            setAnimatingPrize(null);
            setAnimatingPrizeWinner(null);
            setPrizeAnimationProps(null);
            setAnimatingCard(null);
            setAnimationProps(null);
            if (tieTimerRef.current) clearTimeout(tieTimerRef.current);

            // Transition to new game
            setGameId(rematch.newGameId);
            setLocalTime(INITIAL_TIME);
            setOppLocalTime(INITIAL_TIME);
            setGameData(null);
            setRematchStatus(null);

            // Update localStorage
            localStorage.setItem(LOCAL_STORAGE_KEYS.ACTIVE_GAME, JSON.stringify({
                gameId: rematch.newGameId,
                playerId: playerId,
                timestamp: Date.now()
            }));

            console.log('[REMATCH] Transitioned to new game:', rematch.newGameId);
        }

        // Check if opponent left (their data becomes null or undefined)
        if (!oppData || (!oppData.id && myRequest)) {
            if (rematchStatus !== REMATCH_STATUS.LEFT) {
                setRematchStatus(REMATCH_STATUS.LEFT);
                setTimeout(() => {
                    window.location.reload();
                }, 3000);
            }
        }
    }, [gameData?.rematch, gameData?.status, oppData, playerId, rematchStatus]);

    // Monitor for timeouts
    useEffect(() => {
        if (!gameData || !gameId || !playerId) return;
        if (gameData.status !== GAME_STATUS.PLAYING) return;

        const myData = playerId === ROLES.HOST ? gameData.host : gameData.guest;
        const oppData = playerId === ROLES.HOST ? gameData.guest : gameData.host;

        // Check if either player timed out
        // Only timeout if they haven't bid yet
        if ((localTime <= 0 && !myData.bid) || (oppLocalTime <= 0 && !oppBid)) {
            const iTimedOut = localTime <= 0 && !myData.bid;
            const oppTimedOut = oppLocalTime <= 0 && !oppBid;

            // Only host processes the timeout
            if (playerId === ROLES.HOST) {
                const hostTimedOut = isHost ? iTimedOut : oppTimedOut;
                const guestTimedOut = isHost ? oppTimedOut : iTimedOut;

                // Determine scores (timed out player loses)
                let hostScore, guestScore;
                if (hostTimedOut && !guestTimedOut) {
                    hostScore = 0;
                    guestScore = 999;
                } else if (guestTimedOut && !hostTimedOut) {
                    hostScore = 999;
                    guestScore = 0;
                } else {
                    // Both timed out (shouldn't happen) - use current scores
                    hostScore = gameData.host.score;
                    guestScore = gameData.guest.score;
                }

                console.log('[TIMEOUT] Player timed out:', hostTimedOut ? ROLES.HOST : ROLES.GUEST);

                // End the game
                const updates = {};
                updates[`${FIREBASE_PATHS.GAMES}/${gameId}/status`] = GAME_STATUS.END;
                updates[`${FIREBASE_PATHS.GAMES}/${gameId}/host/score`] = hostScore;
                updates[`${FIREBASE_PATHS.GAMES}/${gameId}/guest/score`] = guestScore;
                updates[`${FIREBASE_PATHS.GAMES}/${gameId}/log`] = {
                    msg: hostTimedOut ? MESSAGES.HOST_TIMED_OUT : MESSAGES.GUEST_TIMED_OUT,
                    type: LOG_TYPES.DANGER
                };

                update(ref(db), updates).then(() => {
                    // Update ratings
                    handleGameEnd(hostScore, guestScore);

                    // Clear localStorage
                    localStorage.removeItem(LOCAL_STORAGE_KEYS.ACTIVE_GAME);
                });
            } else {
                // Guest just clears their localStorage
                localStorage.removeItem(LOCAL_STORAGE_KEYS.ACTIVE_GAME);
            }
        }
    }, [gameData, gameId, playerId, localTime, oppLocalTime, isHost, myData, oppBid]);

    // Prize Animation Effect
    useEffect(() => {
        if (!gameData?.log) return;

        // Check if log changed and is a win
        const currentLog = gameData.log;
        const prevLog = prevLogRef.current;

        // Compare by message and type, not object reference
        const logChanged = !prevLog ||
            prevLog.msg !== currentLog.msg ||
            prevLog.type !== currentLog.type;

        if (logChanged) {
            prevLogRef.current = { msg: currentLog.msg, type: currentLog.type };

            // If it's a win message
            if (currentLog.msg && currentLog.msg.includes(MESSAGES.WON) && (currentLog.type === ROLES.HOST || currentLog.type === ROLES.GUEST)) {
                // Determine if I won
                const iWon = currentLog.type === playerId;

                if (iWon) SoundManager.playWin();
                else SoundManager.playLose();

                // Get prize rank from message "WON 10" or "WON (+10)"
                const match = currentLog.msg.match(/(\d+)/);
                const prizeRank = match ? parseInt(match[1]) : null;

                if (prizeRank && prizeSlotRef.current && progressBarRef.current) {
                    // Delay the animation start slightly to let cards reveal first
                    setTimeout(() => {
                        if (!prizeSlotRef.current || !progressBarRef.current) return;

                        const startRect = prizeSlotRef.current.getBoundingClientRect();
                        const endRect = progressBarRef.current.getBoundingClientRect();

                        // Calculate current edge of progress bar based on scores
                        const totalAvailablePoints = 91 - (gameData.prizeGraveyard || []).reduce((a, b) => a + b, 0) + myData.score + oppData.score;
                        const myPercentage = totalAvailablePoints > 0 ? (myData.score / totalAvailablePoints) * 100 : 0;
                        const oppPercentage = totalAvailablePoints > 0 ? (oppData.score / totalAvailablePoints) * 100 : 0;

                        // Target width is 10% of progress bar total width
                        const targetWidth = endRect.width * 0.1;

                        // Calculate target position (edge of winner's current progress)
                        let targetX;
                        if (iWon) {
                            // Position at my current edge
                            targetX = endRect.left + (endRect.width * (myPercentage / 100));
                        } else {
                            // Position at opponent's current edge
                            targetX = endRect.right - (endRect.width * (oppPercentage / 100)) - targetWidth;
                        }

                        const targetY = endRect.top + (endRect.height / 2) - (startRect.height / 2);

                        setAnimatingPrize(prizeRank);
                        setAnimatingPrizeWinner(iWon ? 'player' : 'cpu'); // Store winner type
                        setPrizeAnimationProps({
                            position: 'fixed',
                            top: startRect.top,
                            left: startRect.left,
                            width: startRect.width,
                            height: startRect.height,
                            zIndex: 100,
                            transition: 'none',
                            transform: 'scale(1)',
                            opacity: 1
                        });

                        requestAnimationFrame(() => {
                            requestAnimationFrame(() => {
                                // Calculate scale to shrink to progress bar height
                                const scaleAmount = endRect.height / startRect.height;

                                setPrizeAnimationProps({
                                    position: 'fixed',
                                    top: targetY,
                                    left: targetX,
                                    width: startRect.width,
                                    height: startRect.height,
                                    zIndex: 100,
                                    transition: `all ${PRIZE_ANIMATION_DURATION}ms cubic-bezier(0.34, 1.56, 0.64, 1)`,
                                    transform: `scale(${scaleAmount})`,
                                    opacity: 0.8
                                });
                            });
                        });

                        // Cleanup after animation completes
                        setTimeout(() => {
                            setAnimatingPrize(null);
                            setAnimatingPrizeWinner(null);
                            setPrizeAnimationProps(null);
                        }, PRIZE_ANIMATION_CLEANUP);
                    }, PRIZE_ANIMATION_DELAY);
                }
            }
        }
    }, [gameData?.log, playerId]);



    const [isMatching, setIsMatching] = useState(false);
    const [tieAnimation, setTieAnimation] = useState(false);
    const tieTimerRef = useRef(null);

    // Sync tie animation from database tie flag
    useEffect(() => {
        if (gameData?.tie) {
            setTieAnimation(true);
            SoundManager.playTie();

            // Clear any existing timer
            if (tieTimerRef.current) clearTimeout(tieTimerRef.current);

            // Set new timer
            tieTimerRef.current = setTimeout(() => {
                setTieAnimation(false);
                tieTimerRef.current = null;
            }, TIE_ANIMATION_DURATION);
        }
    }, [gameData?.tie]);

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (tieTimerRef.current) clearTimeout(tieTimerRef.current);
        };
    }, []);

    // Prize Animation State
    const prizeSlotRef = useRef(null);
    const progressBarRef = useRef(null);
    const [animatingPrize, setAnimatingPrize] = useState(null);
    const [animatingPrizeWinner, setAnimatingPrizeWinner] = useState(null);
    const [prizeAnimationProps, setPrizeAnimationProps] = useState(null);
    const prevLogRef = useRef(null);

    // Card Landing Effects
    const [myCardLanded, setMyCardLanded] = useState(false);
    const [oppCardLanded, setOppCardLanded] = useState(false);

    // Monitor Matchmaking Queue
    useEffect(() => {
        if (!isSearching) {
            setIsMatching(false);
            return;
        }

        const userId = getUserId();
        const queueRef = ref(db, 'queue');

        console.log('[MATCHMAKING] Starting queue monitor...', { userId });

        const unsubscribe = onValue(queueRef, async (snapshot) => {
            const queueData = snapshot.val();
            console.log('[MATCHMAKING] Queue updated:', queueData);

            if (!queueData) {
                console.log('[MATCHMAKING] Queue is empty');
                return;
            }

            // Check if I have been assigned a game (by the opponent)
            // Since we can't write to other users' queue entries, the creator writes to THEIR OWN entry
            // and we look for it here.
            const opponentWithGame = Object.values(queueData).find(u =>
                u.userId !== userId &&
                u.gameId &&
                u.matchedWith === userId
            );

            if (opponentWithGame) {
                console.log('[MATCHMAKING] Game assigned by opponent! Joining:', opponentWithGame.gameId);
                setIsMatching(true); // Lock

                // Join the game
                joinGame(opponentWithGame.gameId);

                // Remove self from queue
                remove(ref(db, `${FIREBASE_PATHS.QUEUE}/${userId}`));
                return;
            }

            if (isMatching) return; // Stop if already matching/locked

            // Convert to array and filter out self
            const queueUsers = Object.values(queueData).filter(u => u.userId !== userId);
            console.log('[MATCHMAKING] Other users in queue:', queueUsers);

            if (queueUsers.length === 0) {
                console.log('[MATCHMAKING] No other users, waiting...');
                return; // No one else in queue
            }

            // Find best match
            const myProfile = await getUserProfile(userId);
            const myRating = myProfile.rating || 1000;
            console.log('[MATCHMAKING] My rating:', myRating);

            const bestMatch = findBestMatch(myRating, queueUsers);
            console.log('[MATCHMAKING] Best match found:', bestMatch);

            if (bestMatch) {
                const ratingDiff = Math.abs(myRating - bestMatch.rating);
                console.log('[MATCHMAKING] Rating difference:', ratingDiff);

                // Deterministic game creation: only the user with the lexicographically smaller userId creates
                // This prevents both users from trying to create a game simultaneously
                const shouldCreateGame = userId < bestMatch.userId;
                console.log('[MATCHMAKING] Should I create game?', shouldCreateGame, '(my userId:', userId, 'vs', bestMatch.userId, ')');

                if (shouldCreateGame) {
                    // Double-check both still in queue
                    const oppStillInQueue = await get(ref(db, `${FIREBASE_PATHS.QUEUE}/${bestMatch.userId}`));
                    const iStillInQueue = await get(ref(db, `${FIREBASE_PATHS.QUEUE}/${userId}`));

                    console.log('[MATCHMAKING] Still in queue?', {
                        me: iStillInQueue.exists(),
                        opponent: oppStillInQueue.exists()
                    });

                    if (oppStillInQueue.exists() && iStillInQueue.exists()) {
                        console.log('[MATCHMAKING] Creating game!');
                        setIsMatching(true); // Lock
                        await createMatchedGame(bestMatch);
                    } else {
                        console.log('[MATCHMAKING] One or both users left queue, aborting');
                    }
                } else {
                    console.log('[MATCHMAKING] Waiting for opponent to create game...');
                    // Do NOT lock here, keep listening for the gameId assignment
                }
            } else {
                console.log('[MATCHMAKING] No match found (should not happen)');
            }
        });

        return () => {
            console.log('[MATCHMAKING] Stopping queue monitor');
            unsubscribe();
        };
    }, [isSearching, isMatching]);

    // Host Logic for Resolution
    useEffect(() => {
        if (playerId !== ROLES.HOST || !gameData) return;

        if (gameData.status === GAME_STATUS.PLAYING && gameData.host.bid && gameData.guest.bid) {
            // Both players have bid, trigger resolution
            resolveRound(gameData.host.bid, gameData.guest.bid);
        }

        // Check for game end (e.g. forfeit) to trigger rating updates
        // If status is END but no ratingUpdates exist yet, calculate them
        if (gameData.status === GAME_STATUS.END && !gameData.ratingUpdates) {
            console.log('[HOST] Game ended, calculating ratings...');
            handleGameEnd(gameData.host.score, gameData.guest.score);
        }
    }, [gameData, playerId]);

    // Delay EndScreen to allow win animation to complete
    useEffect(() => {
        if (gameData?.status === GAME_STATUS.END && !showEndScreen) {
            const timer = setTimeout(() => {
                setShowEndScreen(true);
            }, 2500); // Wait for animation (shake 500ms + shatter 300ms + overflow 700ms + buffer 1000ms)
            return () => clearTimeout(timer);
        } else if (gameData?.status !== GAME_STATUS.END) {
            setShowEndScreen(false);
        }
    }, [gameData?.status, showEndScreen]);

    // Play game end music when game ends
    useEffect(() => {
        if (gameData?.status === GAME_STATUS.END && myData?.score !== undefined && oppData?.score !== undefined) {
            // Delay to sync with animation
            const timer = setTimeout(() => {
                if (myData.score > oppData.score) {
                    SoundManager.playGameWin();
                } else if (myData.score < oppData.score) {
                    SoundManager.playGameLose();
                }
                // If tied, no special end music (already played tie sound during the tie round)
            }, 800); // After shake phase starts
            return () => clearTimeout(timer);
        }
    }, [gameData?.status, myData?.score, oppData?.score]);

    // --- Round Resolution ---
    const resolveRound = () => {
        if (!gameData) return;

        console.log('[RESOLVE] Starting round resolution', {
            round: gameData.round,
            hostBid: gameData.host.bid,
            guestBid: gameData.guest.bid,
            prize: gameData.currentPrize,
            currentScores: { host: gameData.host.score, guest: gameData.guest.score }
        });

        const hostBid = gameData.host.bid;
        const guestBid = gameData.guest.bid;

        const prize = gameData.currentPrize;

        let msg = MESSAGES.TIED;
        let type = "warning";
        const isTie = hostBid === guestBid;

        let hostScore = gameData.host.score;
        let guestScore = gameData.guest.score;

        if (hostBid > guestBid) {
            hostScore += prize;
            msg = `${MESSAGES.WON} ${prize}`;
            type = ROLES.HOST;
        } else if (guestBid > hostBid) {
            guestScore += prize;
            msg = `${MESSAGES.WON} ${prize}`;
            type = ROLES.GUEST;
        }

        console.log('[RESOLVE] Calculated outcome', {
            winner: type,
            newScores: { host: hostScore, guest: guestScore },
            msg,
            isTie
        });

        // Check for early win (insurmountable lead)
        // Use prizeGraveyard to account for tied points (which aren't awarded to anyone)
        // MUST include the current prize which was just played!
        const currentPrizeGraveyardSum = (gameData.prizeGraveyard || []).reduce((sum, p) => sum + p, 0);
        const totalPlayedPoints = currentPrizeGraveyardSum + prize;
        const pointsRemaining = 91 - totalPlayedPoints;  // Points from cards not yet played

        // A player has insurmountable lead if their score > opponent's score + all remaining points
        const hostHasWon = hostScore > guestScore + pointsRemaining;
        const guestHasWon = guestScore > hostScore + pointsRemaining;

        // Calculate Time Deductions
        const roundStart = gameData.roundStart || Date.now();
        const hostDuration = Math.max(0, Math.floor(((gameData.host.bidAt || Date.now()) - roundStart) / 1000));
        const guestDuration = Math.max(0, Math.floor(((gameData.guest.bidAt || Date.now()) - roundStart) / 1000));

        const newHostTime = Math.max(0, (gameData.host.time || 600) - hostDuration);
        const newGuestTime = Math.max(0, (gameData.guest.time || 600) - guestDuration);

        // Move bids to graveyard immediately (visual update)
        const newHostGraveyard = [...(gameData.host.graveyard || []), hostBid];
        const newGuestGraveyard = [...(gameData.guest.graveyard || []), guestBid];
        const newPrizeGraveyard = [...(gameData.prizeGraveyard || []), prize];

        // Update DB with results
        const updates = {};
        updates[`${FIREBASE_PATHS.GAMES}/${gameId}/status`] = GAME_STATUS.RESOLVING;
        updates[`${FIREBASE_PATHS.GAMES}/${gameId}/host/score`] = hostScore;
        updates[`${FIREBASE_PATHS.GAMES}/${gameId}/guest/score`] = guestScore;
        updates[`${FIREBASE_PATHS.GAMES}/${gameId}/host/time`] = newHostTime;
        updates[`${FIREBASE_PATHS.GAMES}/${gameId}/guest/time`] = newGuestTime;
        updates[`${FIREBASE_PATHS.GAMES}/${gameId}/log`] = { msg, type }; // Shared log
        updates[`${FIREBASE_PATHS.GAMES}/${gameId}/host/graveyard`] = newHostGraveyard;
        updates[`${FIREBASE_PATHS.GAMES}/${gameId}/guest/graveyard`] = newGuestGraveyard;
        updates[`${FIREBASE_PATHS.GAMES}/${gameId}/prizeGraveyard`] = newPrizeGraveyard;
        updates[`${FIREBASE_PATHS.GAMES}/${gameId}/tie`] = isTie; // Set tie flag for both players to read

        console.log('[RESOLVE] Sending immediate updates', updates);
        update(ref(db), updates);

        // Delay for next round
        console.log(`[RESOLVE] Waiting ${RESOLVE_ROUND_TIMER}ms for next round...`);
        setTimeout(() => {
            console.log('[RESOLVE] Timer finished, preparing next round updates');
            const nextUpdates = {};

            // Clear bids
            nextUpdates[`${FIREBASE_PATHS.GAMES}/${gameId}/host/bid`] = null;
            nextUpdates[`${FIREBASE_PATHS.GAMES}/${gameId}/guest/bid`] = null;
            nextUpdates[`${FIREBASE_PATHS.GAMES}/${gameId}/tie`] = false; // Clear tie flag

            // Next Prize
            if ((gameData.prizeDeck && gameData.prizeDeck.length > 0) && !hostHasWon && !guestHasWon) {
                nextUpdates[`${FIREBASE_PATHS.GAMES}/${gameId}/currentPrize`] = gameData.prizeDeck[0];
                nextUpdates[`${FIREBASE_PATHS.GAMES}/${gameId}/prizeDeck`] = gameData.prizeDeck.slice(1);
                nextUpdates[`${FIREBASE_PATHS.GAMES}/${gameId}/status`] = GAME_STATUS.PLAYING;
                nextUpdates[`${FIREBASE_PATHS.GAMES}/${gameId}/round`] = gameData.round + 1;
                nextUpdates[`${FIREBASE_PATHS.GAMES}/${gameId}/roundStart`] = serverTimestamp();
            } else {
                // Game ends (either no more cards or early win)

                // Determine Game Winner and update Match Scores
                const currentHostMatchScore = gameData.host.matchScore || 0;
                const currentGuestMatchScore = gameData.guest.matchScore || 0;

                let newHostMatchScore = currentHostMatchScore;
                let newGuestMatchScore = currentGuestMatchScore;

                if (hostHasWon) {
                    newHostMatchScore += 1;
                } else if (guestHasWon) {
                    newGuestMatchScore += 1;
                } else if (hostScore > guestScore) {
                    newHostMatchScore += 1;
                } else if (guestScore > hostScore) {
                    newGuestMatchScore += 1;
                } else {
                    // Tie game - no one gets a point? or both? 
                    // Usually Bo3 ignores ties or counts as draw. Let's do: no point awarded, replay game effectively.
                    // But for Goofspiel, ties are rare if not effectively broken by timestamps.
                    // If it's a DEAD TIE, play another game.
                }

                nextUpdates[`${FIREBASE_PATHS.GAMES}/${gameId}/host/matchScore`] = newHostMatchScore;
                nextUpdates[`${FIREBASE_PATHS.GAMES}/${gameId}/guest/matchScore`] = newGuestMatchScore;

                // Check for Match Win
                if (newHostMatchScore >= 2 || newGuestMatchScore >= 2) {
                    nextUpdates[`${FIREBASE_PATHS.GAMES}/${gameId}/status`] = GAME_STATUS.END;

                    // Match Log
                    const matchWinner = newHostMatchScore > newGuestMatchScore ? ROLES.HOST : ROLES.GUEST;
                    nextUpdates[`${FIREBASE_PATHS.GAMES}/${gameId}/log`] = {
                        msg: matchWinner === ROLES.HOST ? "HOST WINS MATCH!" : "GUEST WINS MATCH!",
                        type: matchWinner
                    };

                    // We let the useEffect trigger the rating updates, but we need to ensure handleGameEnd uses match scores?
                    // actually, handleGameEnd processGameEndRatings uses the "hostScore" vs "guestScore" explicitly passed to it.
                    // We need to change that flow.
                    // For now, let's keep status END, and we will update handleGameEnd logic separately.
                    handleGameEnd(newHostMatchScore, newGuestMatchScore);
                } else {
                    // Match continues -> Intermission
                    nextUpdates[`${FIREBASE_PATHS.GAMES}/${gameId}/status`] = GAME_STATUS.BETWEEN_GAMES;
                    nextUpdates[`${FIREBASE_PATHS.GAMES}/${gameId}/log`] = {
                        msg: hostHasWon || hostScore > guestScore ? "HOST WINS GAME" : "GUEST WINS GAME",
                        type: LOG_TYPES.NEUTRAL
                    };
                }

                nextUpdates[`${FIREBASE_PATHS.GAMES}/${gameId}/currentPrize`] = null;
            }

            console.log('[RESOLVE] Sending next round updates', nextUpdates);
            update(ref(db), nextUpdates);
        }, RESOLVE_ROUND_TIMER); // 1 seconds to see result
    };

    const handleOpponentDisconnect = async () => {
        // Removed host-only check to allow guest to claim win if host drops

        console.log('[DISCONNECT] Ending game due to opponent disconnect');

        const updates = {};
        updates[`${FIREBASE_PATHS.GAMES}/${gameId}/status`] = GAME_STATUS.END;

        // Award MATCH victory to connected player (me), loss to disconnected player
        // 2-0 Match Score
        const myMatchScore = 2;
        const oppMatchScore = 0;

        if (isHost) {
            updates[`${FIREBASE_PATHS.GAMES}/${gameId}/host/matchScore`] = myMatchScore;
            updates[`${FIREBASE_PATHS.GAMES}/${gameId}/guest/matchScore`] = oppMatchScore;
            // Optional: Set game score to show forfeiture? e.g. 999
            updates[`${FIREBASE_PATHS.GAMES}/${gameId}/host/score`] = 999;
        } else {
            updates[`${FIREBASE_PATHS.GAMES}/${gameId}/guest/matchScore`] = myMatchScore;
            updates[`${FIREBASE_PATHS.GAMES}/${gameId}/host/matchScore`] = oppMatchScore;
            updates[`${FIREBASE_PATHS.GAMES}/${gameId}/guest/score`] = 999;
        }

        await update(ref(db), updates);

        // Update ratings (I win match, opponent loses)
        await handleGameEnd(isHost ? myMatchScore : oppMatchScore, isHost ? oppMatchScore : myMatchScore);

        // Clear localStorage
        localStorage.removeItem(LOCAL_STORAGE_KEYS.ACTIVE_GAME);

        setShowDisconnectWarning(false);
    };

    const handleGameEnd = async (hostScore, guestScore) => {
        // Race condition handling:
        // If I am Guest, I should ONLY calculate ratings if the Host has been disconnected for the timeout duration.
        // Otherwise, I should let the Host handle it to avoid double-writes or race conditions.
        if (playerId !== ROLES.HOST) {
            const hostPresence = gameData?.presence?.host;
            const disconnectTime = hostPresence?.disconnectedAt;
            const isHostOffline = !hostPresence?.online;

            if (!isHostOffline || !disconnectTime || (Date.now() - disconnectTime < TIMINGS.DISCONNECT_TIMEOUT)) {
                console.log('[RATING] Guest skipping rating calculation (Host is active or not timed out)');
                return;
            }
        }

        const hostId = gameData.host.id;
        const guestId = gameData.guest.id;

        if (!hostId || !guestId) return;

        // Use centralized rating processing
        await processGameEndRatings(gameId, gameData, hostScore, guestScore);
    };

    const handleRequestRematch = () => {
        if (!gameId || !playerId) return;

        setRematchStatus(REMATCH_STATUS.WAITING);
        const updates = {};
        updates[`${FIREBASE_PATHS.GAMES}/${gameId}/rematch/${playerId}Request`] = true;

        // Check if opponent already requested
        const oppRequested = playerId === ROLES.HOST ? gameData.rematch?.guestRequest : gameData.rematch?.hostRequest;
        if (oppRequested) {
            updates[`${FIREBASE_PATHS.GAMES}/${gameId}/rematch/accepted`] = true;
        }

        update(ref(db), updates);
    };

    const handleDeclineRematch = () => {
        setRematchStatus(REMATCH_STATUS.DECLINED);
        setTimeout(() => {
            window.location.reload(); // Return to lobby
        }, TIMINGS.DECLINE_RELOAD_DELAY);
    };

    const handleCancelWaiting = async () => {
        if (!gameId) return;

        console.log('[CANCEL] Cancelling game creation:', gameId);

        // Remove the game from database
        await set(ref(db, `${FIREBASE_PATHS.GAMES}/${gameId}`), null);

        // Clear localStorage
        localStorage.removeItem(LOCAL_STORAGE_KEYS.ACTIVE_GAME);

        // Reset state to return to lobby
        setGameId(null);
        setPlayerId(null);
        setGameData(null);
    };

    // --- Rematch Logic ---
    // When both players accept, the Host creates a new game and links it to the old one.
    // Both players then detect the link and transition.
    const handleRematchAccepted = async () => {
        if (playerId !== ROLES.HOST || !gameData) return; // Only host creates the new game

        console.log('[REMATCH] Creating new game for rematch...');

        // Create a new game (instead of resetting the old one)
        const newGameId = generateShortGameId();

        const prizeDeck = shuffle([...RANKS]);
        const newGameData = {
            status: GAME_STATUS.PLAYING,
            round: 1,
            prizeDeck: prizeDeck.slice(1),
            currentPrize: prizeDeck[0],
            host: {
                score: 0,
                hand: [...RANKS],
                bid: null,
                graveyard: [],
                time: INITIAL_TIME,
                id: gameData.host.id,
                name: gameData.host.name
            },
            guest: {
                score: 0,
                hand: [...RANKS],
                bid: null,
                graveyard: [],
                time: INITIAL_TIME,
                id: gameData.guest.id,
                name: gameData.guest.name
            },
            prizeGraveyard: [],
            log: { msg: `${MESSAGES.ROUND_PREFIX}1`, type: LOG_TYPES.NEUTRAL },
            lastAction: Date.now(),
            roundStart: serverTimestamp(),
            rematch: {
                hostRequest: false,
                guestRequest: false,
                accepted: false
            },
            presence: {
                host: { online: true, lastSeen: serverTimestamp(), disconnectedAt: null },
                guest: { online: true, lastSeen: serverTimestamp(), disconnectedAt: null }
            },
            previousGameId: gameId // Track the previous game for history
        };

        // Create the new game
        await set(ref(db, `${FIREBASE_PATHS.GAMES}/${newGameId}`), newGameData);

        console.log('[REMATCH] New game created:', newGameId);

        // Update the old game to mark it as rematched
        await update(ref(db, `${FIREBASE_PATHS.GAMES}/${gameId}`), {
            rematchedTo: newGameId
        });

        // Store reference to new game in state variable so both players can transition
        await update(ref(db, `${FIREBASE_PATHS.GAMES}/${gameId}/rematch`), {
            newGameId: newGameId
        });

        console.log('[REMATCH] Transitioning to new game...');
    };

    const handleForfeit = async () => {
        if (!gameId || !playerId || !gameData) return;

        // Only allow forfeit during active gameplay
        if (gameData.status !== GAME_STATUS.PLAYING && gameData.status !== GAME_STATUS.RESOLVING) return;

        // Confirm forfeit
        const confirmed = window.confirm(UI_TEXT.FORFEIT_CONFIRM);
        if (!confirmed) return;

        console.log('[FORFEIT] Player forfeiting:', playerId);

        // Determine scores (forfeiter loses, opponent wins)
        const myScore = 0;
        const oppScore = 999;

        const updates = {};
        updates[`${FIREBASE_PATHS.GAMES}/${gameId}/status`] = GAME_STATUS.END;

        // I lose match (0-2)
        const myMatchScore = 0;
        const oppMatchScore = 2;

        if (isHost) {
            updates[`${FIREBASE_PATHS.GAMES}/${gameId}/host/matchScore`] = myMatchScore;
            updates[`${FIREBASE_PATHS.GAMES}/${gameId}/guest/matchScore`] = oppMatchScore;
            updates[`${FIREBASE_PATHS.GAMES}/${gameId}/guest/score`] = 999; // Cosmetic game score
        } else {
            updates[`${FIREBASE_PATHS.GAMES}/${gameId}/guest/matchScore`] = myMatchScore;
            updates[`${FIREBASE_PATHS.GAMES}/${gameId}/host/matchScore`] = oppMatchScore;
            updates[`${FIREBASE_PATHS.GAMES}/${gameId}/host/score`] = 999;
        }

        await update(ref(db), updates);

        // Update ratings (I lose, opponent wins) - Force calculation
        // Race condition note: If I forfeit, I should calculate. Host will eventually see it but might not calculate if status is already END.
        await processGameEndRatings(gameId, gameData, isHost ? myMatchScore : oppMatchScore, isHost ? oppMatchScore : myMatchScore);

        localStorage.removeItem(LOCAL_STORAGE_KEYS.ACTIVE_GAME);

        console.log('[FORFEIT] Game ended');
    };


    const handleFindMatch = async () => {
        const userId = getUserId();
        const myProfile = await getUserProfile(userId);

        console.log('[MATCHMAKING] Starting search...', { userId, rating: myProfile.rating || 1000, name: getUserName() });

        setIsSearching(true);
        setSearchStartTime(Date.now());

        // Add to queue
        const queueEntryRef = ref(db, `${FIREBASE_PATHS.QUEUE}/${userId}`);
        await set(queueEntryRef, {
            userId,
            rating: myProfile.rating || 1000,
            name: getUserName(),
            timestamp: serverTimestamp()
        });

        // Set up onDisconnect to auto-remove
        await onDisconnect(queueEntryRef).remove();

        console.log('[MATCHMAKING] Added to queue');
    };

    const handleCancelSearch = async () => {
        const userId = getUserId();
        console.log('[MATCHMAKING] Cancelling search...', { userId });
        await set(ref(db, `${FIREBASE_PATHS.QUEUE}/${userId}`), null); // Remove from queue
        setIsSearching(false);
        setIsMatching(false); // Reset matching state
        setSearchStartTime(null);
    };

    const createMatchedGame = async (opponent) => {
        const userId = getUserId();
        const myProfile = await getUserProfile(userId);
        const myRating = myProfile.rating || 1000;

        console.log('[MATCHMAKING] Creating matched game...', {
            me: { userId, rating: myRating },
            opponent: { userId: opponent.userId, rating: opponent.rating }
        });

        // Determine who is host (higher rating)
        const iAmHost = isHigherRated(myRating, opponent.rating);

        console.log('[MATCHMAKING] Host assignment:', iAmHost ? 'I am host' : 'Opponent is host');

        const newGameId = generateShortGameId();

        const prizeDeck = shuffle([...RANKS]);
        const initialGameData = {
            status: GAME_STATUS.PLAYING,
            round: 1,
            prizeDeck: prizeDeck.slice(1),
            currentPrize: prizeDeck[0],
            host: iAmHost ? {
                score: 0,
                matchScore: 0,
                hand: [...RANKS],
                bid: null,
                graveyard: [],
                time: INITIAL_TIME,
                id: userId,
                name: getUserName()
            } : {
                score: 0,
                matchScore: 0,
                hand: [...RANKS],
                bid: null,
                graveyard: [],
                time: INITIAL_TIME,
                id: opponent.userId,
                name: opponent.name
            },
            guest: iAmHost ? {
                score: 0,
                matchScore: 0,
                hand: [...RANKS],
                bid: null,
                graveyard: [],
                time: INITIAL_TIME,
                id: opponent.userId,
                name: opponent.name
            } : {
                score: 0,
                matchScore: 0,
                hand: [...RANKS],
                bid: null,
                graveyard: [],
                time: INITIAL_TIME,
                id: userId,
                name: getUserName()
            },
            prizeGraveyard: [],
            log: { msg: `${MESSAGES.ROUND_PREFIX}1`, type: LOG_TYPES.NEUTRAL },
            lastAction: Date.now(),
            roundStart: serverTimestamp(),
            rematch: {
                hostRequest: false,
                guestRequest: false,
                accepted: false
            },
            presence: {
                host: { online: true, lastSeen: serverTimestamp(), disconnectedAt: null },
                guest: { online: true, lastSeen: serverTimestamp(), disconnectedAt: null }
            }
        };

        // Create the game
        await set(ref(db, `${FIREBASE_PATHS.GAMES}/${newGameId}`), initialGameData);
        console.log('[MATCHMAKING] Game created:', newGameId);

        // Update MY queue entry with the gameId
        // The opponent is watching the queue and will see that I have created a game
        // and that they are matched with me
        await update(ref(db, `${FIREBASE_PATHS.QUEUE}/${userId}`), {
            gameId: newGameId,
            matchedWith: opponent.userId
        });

        console.log('[MATCHMAKING] Updated my queue entry with game info');

        // Wait a moment for opponent to see it before removing myself
        // Ideally we would wait for them to join, but for now a small delay + local join is fine
        // The opponent will see the gameId in my entry and join

        // Join the game locally
        setGameId(newGameId);
        setPlayerId(iAmHost ? ROLES.HOST : ROLES.GUEST);
        setLocalTime(INITIAL_TIME);
        setOppLocalTime(INITIAL_TIME);
        setGameData(null);
        setIsSearching(false);
        setIsMatching(false); // Reset matching state
        setSearchStartTime(null);

        // Save to localStorage for reconnection
        localStorage.setItem(LOCAL_STORAGE_KEYS.ACTIVE_GAME, JSON.stringify({
            gameId: newGameId,
            playerId: iAmHost ? ROLES.HOST : ROLES.GUEST,
            timestamp: Date.now()
        }));
        console.log('[RECONNECT] Saved matched game to localStorage');

        // Remove myself from queue after a delay to ensure opponent sees it
        setTimeout(() => {
            remove(ref(db, `${FIREBASE_PATHS.QUEUE}/${userId}`));
            console.log('[MATCHMAKING] Removed myself from queue');
        }, TIMINGS.HEARTBEAT_INTERVAL);

        console.log('[MATCHMAKING] Match complete!');
    };

    const handleCardClick = (rank, e) => {
        if (!gameData || gameData.status !== GAME_STATUS.PLAYING || animatingCard) return;

        SoundManager.playCardSlide();

        // Check if already bid
        const myData = playerId === 'host' ? gameData.host : gameData.guest;
        if (myData.bid) return;

        // Animation
        const cardWrapper = e.currentTarget.parentElement;
        const startRect = cardWrapper.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(cardWrapper);
        const slotRect = playerSlotRef.current.getBoundingClientRect();

        setAnimatingCard(rank);
        setAnimationProps({
            position: 'fixed',
            top: startRect.top,
            left: startRect.left,
            transform: computedStyle.transform,
            zIndex: 100,
            transition: 'none'
        });

        requestAnimationFrame(() => {
            const destTop = slotRect.top + (slotRect.height - startRect.height) / 2;
            const destLeft = slotRect.left + (slotRect.width - startRect.width) / 2;

            requestAnimationFrame(() => {
                setAnimationProps({
                    position: 'fixed',
                    top: destTop,
                    left: destLeft,
                    transform: 'rotate(0deg)',
                    zIndex: 100,
                    transition: 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)'
                });
            });
        });

        setTimeout(() => {
            // Commit Bid to Firebase
            const updates = {};
            updates[`${FIREBASE_PATHS.GAMES}/${gameId}/${playerId}/bid`] = rank;

            // Remove from hand
            const currentHand = playerId === ROLES.HOST ? gameData.host.hand : gameData.guest.hand;
            const newHand = currentHand.filter(c => c !== rank);
            updates[`${FIREBASE_PATHS.GAMES}/${gameId}/${playerId}/hand`] = newHand;

            // Save Time
            updates[`${FIREBASE_PATHS.GAMES}/${gameId}/${playerId}/bidAt`] = serverTimestamp();

            update(ref(db), updates);

            setAnimatingCard(null);
            setAnimationProps(null);

            // Trigger landing effect
            setMyCardLanded(true);
            setTimeout(() => setMyCardLanded(false), CARD_LANDING_FLASH_DURATION);
        }, CARD_FLIGHT_DURATION);
    };


    // --- Render Helpers ---

    if (authLoading) {
        return <div className="fixed inset-0 bg-[#0a0e17] flex items-center justify-center text-cyan-500 font-mono animate-pulse">{UI_TEXT.AUTHENTICATING}</div>;
    }

    if (!currentUser) {
        return <LoginScreen />;
    }

    if (!gameId) {
        return <Lobby
            onCreateGame={createGame}
            onJoinGame={joinGame}
            currentUser={currentUser}
            isSearching={isSearching}
            searchStartTime={searchStartTime}
            onFindMatch={handleFindMatch}
            onCancelSearch={handleCancelSearch}
        />;
    }

    if (!gameData) {
        return <div className="fixed inset-0 bg-[#0a0e17] flex items-center justify-center text-cyan-500 font-mono animate-pulse">{UI_TEXT.CONNECTING}</div>;
    }

    if (gameData.status === GAME_STATUS.WAITING) {
        return <WaitingScreen gameId={gameId} onCancel={playerId === ROLES.HOST ? handleCancelWaiting : null} />;
    }



    // Opponent Hand (Hidden)
    const oppHandCount = oppData.hand ? oppData.hand.length : 0;
    const oppHand = Array(oppHandCount).fill(0).map((_, i) => i + 1); // Dummy array for rendering

    // Show bids only if resolving or if it's my bid
    const showMyBid = !!myBid;
    const showOppBid = gameData.status === GAME_STATUS.RESOLVING || gameData.status === GAME_STATUS.END; // Only show opp bid when resolving

    const currentLog = gameData.log || { msg: `${MESSAGES.ROUND_PREFIX}${gameData.round}`, type: LOG_TYPES.NEUTRAL };

    const getCardStyle = (index, total) => {
        const isMobile = window.innerWidth < 640;
        const arcStrength = isMobile ? 6 : 8;
        const spread = isMobile ? 30 : 45;
        const middle = (total - 1) / 2;
        const diff = index - middle;
        const rotation = diff * (isMobile ? 5 : 6);
        const yOffset = Math.abs(diff) * arcStrength;

        return {
            transform: `rotate(${rotation}deg) translateY(${yOffset}px)`,
            left: `calc(50% + ${(index - middle) * spread}px)`,
            bottom: '10px',
            zIndex: index + 10,
        };
    };

    return (
        <div className="fixed inset-0 bg-[#0a0e17] font-sans text-slate-200 flex flex-col overflow-hidden selection:bg-cyan-500/30">

            {/* Background Grid */}
            <div className="absolute inset-0 pointer-events-none opacity-20" style={{
                backgroundImage: 'linear-gradient(#1e293b 1px, transparent 1px), linear-gradient(90deg, #1e293b 1px, transparent 1px)',
                backgroundSize: '20px 20px'
            }}></div>

            {/* HUD */}
            <HUD
                gameData={gameData}
                currentLog={currentLog}
                onForfeit={handleForfeit}
                playerId={playerId}
            />

            {/* Main Arena */}
            <div className="flex-1 relative flex flex-col w-full max-w-md mx-auto">

                {/* Opponent Bar */}
                <div className="px-4 py-2 flex justify-end items-end border-b border-slate-800/30">
                    <StatBlock
                        label={oppData.name || UI_TEXT.OPPONENT_DEFAULT_NAME}
                        value={oppData.score}
                        time={oppLocalTime}
                        color="text-fuchsia-500"
                        icon={Hexagon}
                        align="right"
                        profile={isHost ? guestProfile : hostProfile}
                        playerName={oppData.name}
                    />
                </div>

                {/* Arena Middle */}
                <div className="flex-1 flex items-stretch relative overflow-hidden">

                    {/* Player Graveyard (Left) */}
                    <VerticalGraveyard usedCards={myData.graveyard || []} type="player" />

                    {/* Center Card Area */}
                    <div className="flex-1 flex flex-col items-center justify-center relative">

                        {/* Progress Bar */}
                        <div ref={progressBarRef} className="w-full flex justify-center">
                            <ProgressBar
                                key={gameId}
                                myScore={myData.score}
                                oppScore={oppData.score}
                                prizeGraveyard={gameData.prizeGraveyard}
                                status={gameData.status}
                                currentPrize={gameData.currentPrize}
                                winner={gameData.status === GAME_STATUS.END ? (myData.score > oppData.score ? 'player' : myData.score < oppData.score ? 'cpu' : null) : null}
                                tie={tieAnimation}
                            />
                        </div>

                        <HorizontalGraveyard usedCards={gameData.prizeGraveyard || []} type="prize" />

                        <div className="flex-1 flex items-center justify-center w-full">
                            <div className="flex items-center justify-center gap-2 sm:gap-6 w-full scale-90 sm:scale-100">

                                {/* Player Slot (Left) */}
                                <div
                                    ref={playerSlotRef}
                                    className={`relative w-24 h-32 border border-dashed border-slate-700 rounded-xl flex items-center justify-center bg-slate-900/30 ${myCardLanded ? 'animate-flash shadow-glow-cyan' : ''}`}
                                >
                                    <span className="text-[8px] font-mono text-cyan-500/50 absolute -top-3">{UI_TEXT.YOU}</span>
                                    {myBid && !animatingCard && (
                                        <div className="animate-in fade-in zoom-in duration-300">
                                            <DataChip rank={myBid} type="player" compact={true} />
                                        </div>
                                    )}
                                </div>

                                {/* Prize Slot */}
                                <div ref={prizeSlotRef} className="relative z-10 -mt-6">
                                    <div className="absolute -inset-4 bg-yellow-500/10 blur-xl rounded-full animate-pulse"></div>
                                    {gameData.currentPrize ? (
                                        <div className={tieAnimation ? 'animate-shatter' : ''}>
                                            <DataChip rank={gameData.currentPrize} type="prize" highlight={true} />
                                        </div>
                                    ) : (
                                        <div className="w-24 h-32 border border-yellow-500/30 rounded-xl flex items-center justify-center">
                                            <Activity className="text-yellow-500 animate-spin" />
                                        </div>
                                    )}
                                </div>

                                {/* Opponent Slot (Right) */}
                                <div className={`relative w-24 h-32 border border-dashed border-slate-700 rounded-xl flex items-center justify-center bg-slate-900/30 ${oppCardLanded ? 'animate-flash shadow-glow-purple' : ''}`}>
                                    <span className="text-[8px] font-mono text-fuchsia-500/50 absolute -top-3">{UI_TEXT.OPP}</span>
                                    {oppBid ? (
                                        <div className="relative w-24 h-32 [perspective:1000px]">
                                            <div className={`w-full h-full transition-transform duration-700 [transform-style:preserve-3d] ${showOppBid ? '[transform:rotateY(180deg)]' : ''}`}>
                                                {/* Front (Face Down) */}
                                                <div className="absolute inset-0 [backface-visibility:hidden] flex items-center justify-center">
                                                    <DataChip
                                                        rank={0}
                                                        type="cpu"
                                                        faceDown={true}
                                                        compact={true}
                                                    />
                                                </div>
                                                {/* Back (Face Up) */}
                                                <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] flex items-center justify-center">
                                                    <DataChip
                                                        rank={oppBid}
                                                        type="cpu"
                                                        faceDown={false}
                                                        compact={true}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            {/* Empty slot or waiting indicator */}
                                            <div className="w-2 h-2 bg-slate-800 rounded-full animate-pulse"></div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Opponent Graveyard (Right) */}
                    <VerticalGraveyard usedCards={oppData.graveyard || []} type="cpu" />

                </div>

                {/* Player Stats */}
                <div className="px-4 py-2 flex justify-between items-start border-t border-slate-800/30 bg-slate-900/20">
                    <StatBlock
                        label={UI_TEXT.YOU}
                        value={myData.score}
                        time={localTime}
                        color="text-cyan-400"
                        icon={Cpu}
                        align="left"
                        profile={isHost ? hostProfile : guestProfile}
                        playerName={myData.name}
                    />
                </div>

                {/* Player Hand Area */}
                <div className="h-40 sm:h-48 w-full relative touch-none">
                    <div className="absolute inset-0 flex justify-center items-end pb-4">
                        {myData.hand && myData.hand.map((rank, index) => {
                            const isAnimating = rank === animatingCard;
                            if (rank === myBid && !isAnimating) return null;

                            const baseStyle = getCardStyle(index, myData.hand.length);
                            const style = isAnimating && animationProps ? animationProps : baseStyle;
                            const isInteractionDisabled = gameData.status !== GAME_STATUS.PLAYING || (animatingCard && !isAnimating) || !!myBid;

                            return (
                                <div
                                    key={rank}
                                    className={`
                                        absolute transition-all duration-300 ease-out origin-bottom
                                        ${!isAnimating && !isInteractionDisabled ? 'hover:!transform-none hover:!translate-y-[-30px] hover:!z-[100] hover:scale-110 cursor-pointer' : ''}
                                    `}
                                    style={style}
                                >
                                    <DataChip
                                        rank={rank}
                                        type="player"
                                        onClick={handleCardClick}
                                        disabled={isInteractionDisabled}
                                        compact={true}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Disconnect Warning Banner */}
            {gameData.status === GAME_STATUS.PLAYING && showDisconnectWarning && oppDisconnectTime && (
                <DisconnectWarning oppDisconnectTime={oppDisconnectTime} />
            )}

            {/* Tie Animation Overlay */}
            {tieAnimation && (
                <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
                    <div className="text-6xl font-black text-yellow-400 tracking-tighter animate-shake drop-shadow-[0_0_15px_rgba(255,255,0,0.8)]">
                        {UI_TEXT.TIE}
                    </div>
                </div>
            )}

            {/* Intermission Screen (Between Games) */}
            {gameData.status === GAME_STATUS.BETWEEN_GAMES && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/90 backdrop-blur-md animate-fade-in">
                    <div className="flex flex-col items-center p-8 border border-slate-700 bg-black/60 rounded-2xl shadow-2xl max-w-sm w-full mx-4">
                        <div className="text-cyan-400 font-mono text-sm tracking-widest mb-2">MATCH SCORE</div>
                        <div className="flex items-center gap-6 mb-8">
                            <div className="text-center">
                                <div className="text-xs text-slate-500 mb-1">YOU</div>
                                <div className="text-5xl font-black text-white">{isHost ? gameData.host.matchScore : gameData.guest.matchScore}</div>
                            </div>
                            <div className="text-2xl text-slate-600 font-black">-</div>
                            <div className="text-center">
                                <div className="text-xs text-slate-500 mb-1">OPP</div>
                                <div className="text-5xl font-black text-slate-400">{isHost ? gameData.guest.matchScore : gameData.host.matchScore}</div>
                            </div>
                        </div>

                        {isHost ? (
                            <button
                                onClick={startNextGame}
                                className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-bold py-4 rounded-lg transition-all uppercase tracking-widest shadow-glow-cyan hover:scale-105"
                            >
                                START GAME {((gameData.host.matchScore || 0) + (gameData.guest.matchScore || 0)) + 1}
                            </button>
                        ) : (
                            <div className="w-full bg-slate-800 text-cyan-400 font-bold py-4 rounded-lg uppercase tracking-widest text-center animate-pulse border border-slate-700">
                                WAITING FOR HOST...
                            </div>
                        )}
                    </div>
                </div>
            )}


            {/* End Screen */}
            {showEndScreen && gameData.status === GAME_STATUS.END && (
                <EndScreen
                    myData={myData}
                    oppData={oppData}
                    rematchStatus={rematchStatus}
                    onRequestRematch={handleRequestRematch}
                    onDeclineRematch={handleDeclineRematch}
                    ratingUpdate={gameData.ratingUpdates ? (isHost ? gameData.ratingUpdates.host : gameData.ratingUpdates.guest) : null}
                />
            )}
            {/* Animating Prize Card */}
            {animatingPrize && prizeAnimationProps && (
                <div
                    className="fixed pointer-events-none overflow-hidden rounded-xl"
                    style={{
                        position: prizeAnimationProps.position,
                        top: prizeAnimationProps.top,
                        left: prizeAnimationProps.left,
                        width: prizeAnimationProps.width,
                        height: prizeAnimationProps.height,
                        zIndex: prizeAnimationProps.zIndex,
                        transition: prizeAnimationProps.transition,
                        transform: prizeAnimationProps.transform,
                        opacity: prizeAnimationProps.opacity
                    }}
                >
                    <DataChip
                        rank={animatingPrize}
                        type={animatingPrizeWinner || 'prize'}
                        highlight={true}
                        style={{ filter: prizeAnimationProps.filter, width: '100%', height: '100%' }}
                    />
                </div>
            )}
        </div>
    );
}

export default App;
