import React, { useState, useEffect, useRef } from 'react';
import { Cpu, Hexagon, Activity } from './components/Icons';
import DataChip from './components/DataChip';
import { VerticalGraveyard, HorizontalGraveyard } from './components/Graveyard';
import StatBlock from './components/StatBlock';
import Lobby from './components/Lobby';
import LoginScreen from './components/LoginScreen';
import { RANKS, RESOLVE_ROUND_TIMER, INITIAL_TIME } from './utils/constants';
import { shuffle } from './utils/helpers';
import { db } from './utils/firebaseConfig';
import { ref, set, onValue, update, push, child, get, serverTimestamp } from "firebase/database";
import { getUserId, getUserName, getUserProfile, updateUserProfile, migrateOldProfile } from './utils/userManager';
import { calculateNewRating } from './utils/glicko';
import { auth } from './utils/firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { findBestMatch, isHigherRated } from './utils/matchmaking';
import { setupPresence, sendHeartbeat, cleanupPresence } from './utils/presence';

function App() {
    // --- Firebase State ---
    const [gameId, setGameId] = useState(null);
    const [playerId, setPlayerId] = useState(null); // 'host' or 'guest'
    const [gameData, setGameData] = useState(null);
    const [hostProfile, setHostProfile] = useState(null);
    const [guestProfile, setGuestProfile] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);

    // --- Local UI State ---
    const [log, setLog] = useState({ msg: "SYSTEM READY", type: 'neutral' });
    const [animatingCard, setAnimatingCard] = useState(null);
    const [animationProps, setAnimationProps] = useState(null);
    const [localTime, setLocalTime] = useState(INITIAL_TIME);
    const [oppLocalTime, setOppLocalTime] = useState(INITIAL_TIME);
    const [rematchStatus, setRematchStatus] = useState(null); // 'waiting', 'opponent-requested', 'declined', 'left'
    const [isSearching, setIsSearching] = useState(false);
    const [searchStartTime, setSearchStartTime] = useState(null);
    const [oppDisconnectTime, setOppDisconnectTime] = useState(null);
    const [showDisconnectWarning, setShowDisconnectWarning] = useState(false);
    const playerSlotRef = useRef(null);

    // --- Firebase Auth Logic ---
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setCurrentUser(user);
            setAuthLoading(false);
            if (user) {
                // Attempt migration on first sign-in
                await migrateOldProfile();
            }
        });
        return unsubscribe;
    }, []);

    // Check for active game on load (reconnection)
    useEffect(() => {
        if (authLoading || !currentUser) return;

        const activeGameData = localStorage.getItem('activeGame');
        if (activeGameData) {
            const { gameId: savedGameId, playerId: savedPlayerId, timestamp } = JSON.parse(activeGameData);

            // Check if game is less than 1 hour old
            if (Date.now() - timestamp < 3600000) {
                console.log('[RECONNECT] Checking for active game...', savedGameId);

                get(ref(db, `games/${savedGameId}`)).then(snapshot => {
                    if (snapshot.exists()) {
                        const gameData = snapshot.val();
                        if (gameData.status === 'PLAYING' || gameData.status === 'WAITING') {
                            console.log('[RECONNECT] Reconnecting to game...');
                            setGameId(savedGameId);
                            setPlayerId(savedPlayerId);
                        } else {
                            console.log('[RECONNECT] Game ended, clearing localStorage');
                            localStorage.removeItem('activeGame');
                            // Game ended, it will be cleaned up by the last player to leave
                        }
                    } else {
                        console.log('[RECONNECT] Game not found, clearing localStorage');
                        localStorage.removeItem('activeGame');
                    }
                });
            } else {
                console.log('[RECONNECT] Game too old, clearing localStorage');
                localStorage.removeItem('activeGame');
            }
        }
    }, [authLoading, currentUser]);

    // --- Firebase Logic ---

    const createGame = () => {
        const newGameRef = push(child(ref(db), 'games'));
        const newGameId = newGameRef.key;

        const initialGameData = {
            status: 'WAITING',
            round: 1,
            prizeDeck: shuffle([...RANKS]),
            currentPrize: null,
            host: { score: 0, hand: [...RANKS], bid: null, graveyard: [], time: INITIAL_TIME, id: getUserId(), name: getUserName() },
            guest: { score: 0, hand: [...RANKS], bid: null, graveyard: [], time: INITIAL_TIME },
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

        set(newGameRef, initialGameData);
        setGameId(newGameId);
        setPlayerId('host');

        // Save to localStorage for reconnection
        localStorage.setItem('activeGame', JSON.stringify({
            gameId: newGameId,
            playerId: 'host',
            timestamp: Date.now()
        }));
        console.log('[RECONNECT] Saved game to localStorage');
    };

    const joinGame = (code) => {
        const gameRef = ref(db, `games/${code}`);

        // Check if game exists
        get(gameRef).then((snapshot) => {
            if (snapshot.exists()) {
                setGameId(code);
                setPlayerId('guest');

                // Save to localStorage for reconnection
                localStorage.setItem('activeGame', JSON.stringify({
                    gameId: code,
                    playerId: 'guest',
                    timestamp: Date.now()
                }));
                console.log('[RECONNECT] Saved game to localStorage');
                update(gameRef, {
                    status: 'PLAYING',
                    'guest/id': getUserId(),
                    'guest/name': getUserName()
                });
            } else {
                alert("Game not found! Check the code.");
            }
        }).catch((error) => {
            console.error("Error joining game:", error);
            alert("Error connecting to database.");
        });
    };

    useEffect(() => {
        if (!gameId) return;

        const gameRef = ref(db, `games/${gameId}`);
        const unsubscribe = onValue(gameRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setGameData(data);

                // Game Logic Triggers based on data changes
                if (data.status === 'RESOLVING' && !data.resolved) {
                    // Trigger resolution animation/logic locally if needed
                    // But actual state update should be done by Host
                }
            }
        });

        return () => unsubscribe();
    }, [gameId]);

    // Setup presence tracking and heartbeat
    useEffect(() => {
        if (!gameId || !playerId) return;

        // Setup presence on connect
        setupPresence(gameId, playerId);

        // Send heartbeat every 5 seconds
        const heartbeatInterval = setInterval(() => {
            sendHeartbeat(gameId, playerId);
        }, 5000);

        return () => {
            clearInterval(heartbeatInterval);
            cleanupPresence(gameId, playerId);
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
                    console.log('[MATCHMAKING] Found my game!', id);

                    // Remove myself from queue
                    set(ref(db, `queue/${userId}`), null);

                    // Join the game
                    setGameId(id);
                    setPlayerId(game.host?.id === userId ? 'host' : 'guest');
                    setIsSearching(false);
                    setSearchStartTime(null);

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

    // Derived State for UI
    const isHost = playerId === 'host';
    const myData = (gameData && (isHost ? gameData.host : gameData.guest)) || {};
    const oppData = (gameData && (isHost ? gameData.guest : gameData.host)) || {};

    // Sync local time with server time when round changes or game starts
    useEffect(() => {
        if (myData && myData.time !== undefined) {
            setLocalTime(myData.time);
        }
        setOppLocalTime(oppData.time);
    }, [gameData?.round, myData?.time, oppData?.time]);

    // Timer Tick Logic
    useEffect(() => {
        let interval = null;
        if (gameData?.status === 'PLAYING') {
            interval = setInterval(() => {
                if (!myData?.bid && localTime > 0) {
                    setLocalTime(t => Math.max(0, t - 1));
                }
                if (oppLocalTime > 0) {
                    setOppLocalTime(t => Math.max(0, t - 1));
                }
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [gameData?.status, myData?.bid, localTime, oppLocalTime]);

    // Monitor Opponent Disconnect
    useEffect(() => {
        if (!gameData || gameData.status !== 'PLAYING' || !gameData.presence) return;

        const oppPresence = isHost ? gameData.presence.guest : gameData.presence.host;

        if (!oppPresence?.online && oppPresence?.disconnectedAt) {
            const disconnectTime = oppPresence.disconnectedAt;
            setOppDisconnectTime(disconnectTime);
            setShowDisconnectWarning(true);

            console.log('[DISCONNECT] Opponent disconnected at:', disconnectTime);

            // Check if 30 seconds have passed
            const checkTimeout = setInterval(() => {
                const elapsed = Date.now() - disconnectTime;

                if (elapsed >= 30000) {
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
        if (!gameData || gameData.status !== 'END') return;

        const rematch = gameData.rematch;
        if (!rematch) return;

        // Check if opponent requested
        const oppRequested = playerId === 'host' ? rematch.guestRequest : rematch.hostRequest;
        const myRequest = playerId === 'host' ? rematch.hostRequest : rematch.guestRequest;

        if (oppRequested && !myRequest && rematchStatus !== 'opponent-requested') {
            setRematchStatus('opponent-requested');
        }

        // Check if both accepted
        if (rematch.accepted && rematchStatus !== 'accepted') {
            setRematchStatus('accepted');
            handleRematchAccepted();
        }

        // Check if opponent left (their data becomes null or undefined)
        if (!oppData || (!oppData.id && myRequest)) {
            if (rematchStatus !== 'left') {
                setRematchStatus('left');
                setTimeout(() => {
                    window.location.reload();
                }, 3000);
            }
        }
    }, [gameData?.rematch, gameData?.status, oppData, playerId, rematchStatus]);

    // Monitor Matchmaking Queue
    useEffect(() => {
        if (!isSearching) return;

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
                    const oppStillInQueue = await get(ref(db, `queue/${bestMatch.userId}`));
                    const iStillInQueue = await get(ref(db, `queue/${userId}`));

                    console.log('[MATCHMAKING] Still in queue?', {
                        me: iStillInQueue.exists(),
                        opponent: oppStillInQueue.exists()
                    });

                    if (oppStillInQueue.exists() && iStillInQueue.exists()) {
                        console.log('[MATCHMAKING] Creating game!');
                        await createMatchedGame(bestMatch);
                    } else {
                        console.log('[MATCHMAKING] One or both users left queue, aborting');
                    }
                } else {
                    console.log('[MATCHMAKING] Waiting for opponent to create game...');
                }
            } else {
                console.log('[MATCHMAKING] No match found (should not happen)');
            }
        });

        return () => {
            console.log('[MATCHMAKING] Stopping queue monitor');
            unsubscribe();
        };
    }, [isSearching]);

    // Host Logic for Resolution
    useEffect(() => {
        if (playerId !== 'host' || !gameData) return;

        if (gameData.status === 'PLAYING' && gameData.host.bid && gameData.guest.bid) {
            // Both players have bid, trigger resolution
            resolveRound();
        }
    }, [gameData, playerId]);

    const resolveRound = () => {
        if (!gameData) return;

        const hostBid = gameData.host.bid;
        const guestBid = gameData.guest.bid;
        const prize = gameData.currentPrize;

        let hostScore = gameData.host.score;
        let guestScore = gameData.guest.score;
        let msg = "TIED (0)";
        let type = "warning";

        if (hostBid > guestBid) {
            hostScore += prize;
            msg = `HOST WON (+${prize})`;
            type = "success";
        } else if (guestBid > hostBid) {
            guestScore += prize;
            msg = `GUEST WON (+${prize})`;
            type = "danger";
        }

        // Calculate Time Deductions
        const roundStart = gameData.roundStart || Date.now();
        const hostDuration = Math.max(0, Math.floor(((gameData.host.bidAt || Date.now()) - roundStart) / 1000));
        const guestDuration = Math.max(0, Math.floor(((gameData.guest.bidAt || Date.now()) - roundStart) / 1000));

        const newHostTime = Math.max(0, (gameData.host.time || 600) - hostDuration);
        const newGuestTime = Math.max(0, (gameData.guest.time || 600) - guestDuration);

        // Update DB with results
        const updates = {};
        updates[`games/${gameId}/status`] = 'RESOLVING';
        updates[`games/${gameId}/host/score`] = hostScore;
        updates[`games/${gameId}/guest/score`] = guestScore;
        updates[`games/${gameId}/host/time`] = newHostTime;
        updates[`games/${gameId}/guest/time`] = newGuestTime;
        updates[`games/${gameId}/log`] = { msg, type }; // Shared log

        update(ref(db), updates);

        // Delay for next round
        setTimeout(() => {
            const nextUpdates = {};

            // Move bids to graveyard
            const newHostGraveyard = [...(gameData.host.graveyard || []), hostBid];
            const newGuestGraveyard = [...(gameData.guest.graveyard || []), guestBid];
            const newPrizeGraveyard = [...(gameData.prizeGraveyard || []), prize];

            nextUpdates[`games/${gameId}/host/bid`] = null;
            nextUpdates[`games/${gameId}/guest/bid`] = null;
            nextUpdates[`games/${gameId}/host/graveyard`] = newHostGraveyard;
            nextUpdates[`games/${gameId}/guest/graveyard`] = newGuestGraveyard;
            nextUpdates[`games/${gameId}/prizeGraveyard`] = newPrizeGraveyard;

            // Next Prize
            if (gameData.prizeDeck && gameData.prizeDeck.length > 0) {
                nextUpdates[`games/${gameId}/currentPrize`] = gameData.prizeDeck[0];
                nextUpdates[`games/${gameId}/prizeDeck`] = gameData.prizeDeck.slice(1);
                nextUpdates[`games/${gameId}/status`] = 'PLAYING';
                nextUpdates[`games/${gameId}/round`] = gameData.round + 1;
                nextUpdates[`games/${gameId}/roundStart`] = serverTimestamp();
            } else {
                nextUpdates[`games/${gameId}/status`] = 'END';
                nextUpdates[`games/${gameId}/currentPrize`] = null;
                // Handle Game End (Rating Updates) - Only Host runs this
                handleGameEnd(hostScore, guestScore);
            }

            update(ref(db), nextUpdates);
        }, 3000); // 3 seconds to see result
    };

    const handleOpponentDisconnect = async () => {
        if (playerId !== 'host') return; // Only host ends the game

        console.log('[DISCONNECT] Ending game due to opponent disconnect');

        const updates = {};
        updates[`games/${gameId}/status`] = 'END';

        // Award victory to connected player (me), loss to disconnected player
        const myScore = 999;
        const oppScore = 0;

        if (isHost) {
            updates[`games/${gameId}/host/score`] = myScore;
            updates[`games/${gameId}/guest/score`] = oppScore;
        } else {
            updates[`games/${gameId}/guest/score`] = myScore;
            updates[`games/${gameId}/host/score`] = oppScore;
        }

        await update(ref(db), updates);

        // Update ratings (I win, opponent loses)
        await handleGameEnd(isHost ? myScore : oppScore, isHost ? oppScore : myScore);

        // Clear localStorage
        localStorage.removeItem('activeGame');

        setShowDisconnectWarning(false);
    };

    const handleGameEnd = async (hostScore, guestScore) => {
        if (playerId !== 'host') return;

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

        // Update Host
        updateUserProfile(hostId, {
            gamesPlayed: (p1.gamesPlayed || 0) + 1,
            gamesWon: (p1.gamesWon || 0) + (outcome === 1 ? 1 : 0),
            rating: newP1.rating,
            rd: newP1.rd,
            vol: newP1.vol
        });

        // Update Guest
        updateUserProfile(guestId, {
            gamesPlayed: (p2.gamesPlayed || 0) + 1,
            gamesWon: (p2.gamesWon || 0) + (outcome === 0 ? 1 : 0),
            rating: newP2.rating,
            rd: newP2.rd,
            vol: newP2.vol
        });
    };

    const handleRequestRematch = () => {
        if (!gameId || !playerId) return;

        setRematchStatus('waiting');
        const updates = {};
        updates[`games/${gameId}/rematch/${playerId}Request`] = true;

        // Check if opponent already requested
        const oppRequested = playerId === 'host' ? gameData.rematch?.guestRequest : gameData.rematch?.hostRequest;
        if (oppRequested) {
            updates[`games/${gameId}/rematch/accepted`] = true;
        }

        update(ref(db), updates);
    };

    const handleDeclineRematch = () => {
        setRematchStatus('declined');
        setTimeout(() => {
            window.location.reload(); // Return to lobby
        }, 2000);
    };

    const handleRematchAccepted = () => {
        if (playerId !== 'host' || !gameData) return; // Only host resets the game

        const resetUpdates = {};
        const newPrizeDeck = shuffle([...RANKS]);

        resetUpdates[`games/${gameId}/status`] = 'PLAYING';
        resetUpdates[`games/${gameId}/round`] = 1;
        resetUpdates[`games/${gameId}/prizeDeck`] = newPrizeDeck.slice(1);
        resetUpdates[`games/${gameId}/currentPrize`] = newPrizeDeck[0];
        resetUpdates[`games/${gameId}/prizeGraveyard`] = [];
        resetUpdates[`games/${gameId}/roundStart`] = serverTimestamp();

        // Reset host
        resetUpdates[`games/${gameId}/host/score`] = 0;
        resetUpdates[`games/${gameId}/host/hand`] = [...RANKS];
        resetUpdates[`games/${gameId}/host/bid`] = null;
        resetUpdates[`games/${gameId}/host/graveyard`] = [];
        resetUpdates[`games/${gameId}/host/time`] = INITIAL_TIME;

        // Reset guest
        resetUpdates[`games/${gameId}/guest/score`] = 0;
        resetUpdates[`games/${gameId}/guest/hand`] = [...RANKS];
        resetUpdates[`games/${gameId}/guest/bid`] = null;
        resetUpdates[`games/${gameId}/guest/graveyard`] = [];
        resetUpdates[`games/${gameId}/guest/time`] = INITIAL_TIME;

        // Reset rematch
        resetUpdates[`games/${gameId}/rematch`] = {
            hostRequest: false,
            guestRequest: false,
            accepted: false
        };

        update(ref(db), resetUpdates);
        setRematchStatus(null);
    };

    const handleFindMatch = async () => {
        const userId = getUserId();
        const myProfile = await getUserProfile(userId);

        console.log('[MATCHMAKING] Starting search...', { userId, rating: myProfile.rating || 1000, name: getUserName() });

        setIsSearching(true);
        setSearchStartTime(Date.now());

        // Add to queue
        const queueEntryRef = ref(db, `queue/${userId}`);
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
        await set(ref(db, `queue/${userId}`), null); // Remove from queue
        setIsSearching(false);
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

        const newGameRef = push(child(ref(db), 'games'));
        const newGameId = newGameRef.key;

        const prizeDeck = shuffle([...RANKS]);
        const initialGameData = {
            status: 'PLAYING',
            round: 1,
            prizeDeck: prizeDeck.slice(1),
            currentPrize: prizeDeck[0],
            host: {
                score: 0,
                hand: [...RANKS],
                bid: null,
                graveyard: [],
                time: INITIAL_TIME,
                id: iAmHost ? userId : opponent.userId,
                name: iAmHost ? getUserName() : opponent.name
            },
            guest: {
                score: 0,
                hand: [...RANKS],
                bid: null,
                graveyard: [],
                time: INITIAL_TIME,
                id: iAmHost ? opponent.userId : userId,
                name: iAmHost ? opponent.name : getUserName()
            },
            prizeGraveyard: [],
            lastAction: Date.now(),
            roundStart: serverTimestamp(),
            rematch: {
                hostRequest: false,
                guestRequest: false,
                accepted: false
            }
        };

        await set(newGameRef, initialGameData);

        console.log('[MATCHMAKING] Game created:', newGameId);

        // Clean up queue - only remove myself (opponent will detect game and remove themselves)
        await set(ref(db, `queue/${userId}`), null);

        console.log('[MATCHMAKING] Removed myself from queue');

        // Set game state
        setGameId(newGameId);
        setPlayerId(iAmHost ? 'host' : 'guest');
        setIsSearching(false);
        setSearchStartTime(null);

        // Save to localStorage for reconnection
        localStorage.setItem('activeGame', JSON.stringify({
            gameId: newGameId,
            playerId: iAmHost ? 'host' : 'guest',
            timestamp: Date.now()
        }));
        console.log('[RECONNECT] Saved matched game to localStorage');

        console.log('[MATCHMAKING] Match complete!');
    };

    const handleCardClick = (rank, e) => {
        if (!gameData || gameData.status !== 'PLAYING' || animatingCard) return;

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
            updates[`games/${gameId}/${playerId}/bid`] = rank;

            // Remove from hand
            const currentHand = playerId === 'host' ? gameData.host.hand : gameData.guest.hand;
            const newHand = currentHand.filter(c => c !== rank);
            updates[`games/${gameId}/${playerId}/hand`] = newHand;

            // Save Time
            updates[`games/${gameId}/${playerId}/bidAt`] = serverTimestamp();

            update(ref(db), updates);

            setAnimatingCard(null);
            setAnimationProps(null);
        }, 600);
    };


    // --- Render Helpers ---

    if (authLoading) {
        return <div className="fixed inset-0 bg-[#0a0e17] flex items-center justify-center text-cyan-500 font-mono animate-pulse">AUTHENTICATING...</div>;
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
        return <div className="fixed inset-0 bg-[#0a0e17] flex items-center justify-center text-cyan-500 font-mono animate-pulse">CONNECTING TO NEURAL NET...</div>;
    }

    if (gameData.status === 'WAITING') {
        return (
            <div className="fixed inset-0 bg-[#0a0e17] flex flex-col items-center justify-center text-white font-mono gap-4">
                <div className="text-2xl">WAITING FOR OPPONENT</div>
                <div className="text-4xl font-bold text-cyan-400 tracking-widest border-2 border-dashed border-cyan-500/50 p-4 rounded-xl">
                    {gameId}
                </div>
                <div className="text-sm text-slate-500">SHARE THIS CODE</div>
            </div>
        );
    }



    // Opponent Hand (Hidden)
    const oppHandCount = oppData.hand ? oppData.hand.length : 0;
    const oppHand = Array(oppHandCount).fill(0).map((_, i) => i + 1); // Dummy array for rendering

    // Bids
    const myBid = myData.bid;
    const oppBid = oppData.bid;

    // Show bids only if resolving or if it's my bid
    const showMyBid = !!myBid;
    const showOppBid = gameData.status === 'RESOLVING' || gameData.status === 'END'; // Only show opp bid when resolving

    const currentLog = gameData.log || { msg: `ROUND ${gameData.round}`, type: 'neutral' };

    const getCardStyle = (index, total) => {
        const isMobile = window.innerWidth < 640;
        const arcStrength = isMobile ? 4 : 6;
        const spread = isMobile ? 25 : 35;
        const middle = (total - 1) / 2;
        const diff = index - middle;
        const rotation = diff * (isMobile ? 3 : 4);
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
            <div className="relative z-20 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 p-3 flex justify-between items-center shadow-xl">
                <div className="flex flex-col">
                    <span className="text-[10px] text-slate-500 font-mono tracking-widest">ROUND</span>
                    <span className="text-xl font-bold text-white font-mono leading-none">{gameData.round}<span className="text-slate-600 text-sm">/13</span></span>
                </div>

                <div className={`px-3 py-1 rounded text-xs font-mono font-bold tracking-wider transition-colors duration-300
                    ${currentLog.type === 'success' ? 'bg-cyan-900/50 text-cyan-400 border border-cyan-500/30' :
                        currentLog.type === 'danger' ? 'bg-fuchsia-900/50 text-fuchsia-400 border border-fuchsia-500/30' :
                            'bg-slate-800 text-slate-300 border border-slate-700'}
                `}>
                    {currentLog.msg}
                </div>

                <div className="flex flex-col items-end">
                    <span className="text-[10px] text-slate-500 font-mono tracking-widest">POOL</span>
                    <span className="text-xl font-bold text-yellow-500 font-mono leading-none">
                        {91 - (gameData.prizeGraveyard ? gameData.prizeGraveyard.reduce((a, b) => a + b, 0) : 0) - (gameData.currentPrize || 0)}
                    </span>
                </div>
            </div>

            {/* Main Arena */}
            <div className="flex-1 relative flex flex-col w-full max-w-md mx-auto">

                {/* Opponent Bar */}
                <div className="px-4 py-2 flex justify-end items-end border-b border-slate-800/30">
                    <StatBlock
                        label={oppData.name || 'OPPONENT'}
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

                    {/* Opponent Graveyard */}
                    <VerticalGraveyard usedCards={oppData.graveyard || []} type="cpu" />

                    {/* Center Card Area */}
                    <div className="flex-1 flex flex-col items-center justify-center relative">

                        <HorizontalGraveyard usedCards={gameData.prizeGraveyard || []} type="prize" />

                        <div className="flex-1 flex items-center justify-center w-full">
                            <div className="flex items-center justify-center gap-2 sm:gap-6 w-full scale-90 sm:scale-100">

                                {/* Opponent Slot */}
                                <div className="relative w-20 h-28 border border-dashed border-slate-700 rounded-xl flex items-center justify-center bg-slate-900/30">
                                    <span className="text-[8px] font-mono text-fuchsia-500/50 absolute -top-3">OPP</span>
                                    {oppBid && showOppBid ? (
                                        <div className="animate-in fade-in zoom-in duration-300">
                                            <DataChip
                                                rank={oppBid}
                                                type="cpu"
                                                faceDown={false}
                                                compact={true}
                                            />
                                        </div>
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            {/* Empty slot or waiting indicator */}
                                            <div className="w-2 h-2 bg-slate-800 rounded-full animate-pulse"></div>
                                        </div>
                                    )}
                                </div>

                                {/* Prize Slot */}
                                <div className="relative z-10 -mt-6">
                                    <div className="absolute -inset-4 bg-yellow-500/10 blur-xl rounded-full animate-pulse"></div>
                                    {gameData.currentPrize ? (
                                        <DataChip rank={gameData.currentPrize} type="prize" highlight={true} />
                                    ) : (
                                        <div className="w-20 h-28 border border-yellow-500/30 rounded-xl flex items-center justify-center">
                                            <Activity className="text-yellow-500 animate-spin" />
                                        </div>
                                    )}
                                </div>

                                {/* Player Slot */}
                                <div
                                    ref={playerSlotRef}
                                    className="relative w-20 h-28 border border-dashed border-slate-700 rounded-xl flex items-center justify-center bg-slate-900/30"
                                >
                                    <span className="text-[8px] font-mono text-cyan-500/50 absolute -top-3">YOU</span>
                                    {myBid && !animatingCard && (
                                        <div className="animate-in fade-in zoom-in duration-300">
                                            <DataChip rank={myBid} type="player" compact={true} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Player Graveyard */}
                    <VerticalGraveyard usedCards={myData.graveyard || []} type="player" />

                </div>

                {/* Player Stats */}
                <div className="px-4 py-2 flex justify-between items-start border-t border-slate-800/30 bg-slate-900/20">
                    <StatBlock
                        label="YOU"
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
                            const isInteractionDisabled = gameData.status !== 'PLAYING' || (animatingCard && !isAnimating) || !!myBid;

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
            {gameData.status === 'PLAYING' && showDisconnectWarning && oppDisconnectTime && (
                <div className="absolute top-0 left-0 right-0 bg-red-900/95 border-b border-red-500 p-3 text-center z-50 animate-in slide-in-from-top">
                    <div className="text-red-200 font-bold text-sm uppercase tracking-wide">
                        ⚠️ OPPONENT DISCONNECTED
                    </div>
                    <div className="text-red-300 text-xs font-mono mt-1">
                        Waiting for reconnection... {Math.max(0, 30 - Math.floor((Date.now() - oppDisconnectTime) / 1000))}s
                    </div>
                </div>
            )}

            {/* End Screen */}
            {gameData.status === 'END' && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/95 backdrop-blur-md animate-in fade-in p-8">
                    <div className="flex flex-col items-center w-full max-w-sm border border-slate-700 rounded-2xl p-8 bg-black/50 shadow-2xl">
                        <h1 className="text-5xl font-black text-white mb-2 tracking-tighter">
                            {myData.score > oppData.score ? <span className="text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]">VICTORY</span> :
                                myData.score < oppData.score ? <span className="text-fuchsia-500 drop-shadow-[0_0_10px_rgba(217,70,239,0.5)]">DEFEAT</span> :
                                    "DRAW"}
                        </h1>
                        <div className="w-full h-px bg-gradient-to-r from-transparent via-slate-500 to-transparent my-6"></div>
                        <div className="flex justify-between w-full px-4 mb-8">
                            <div className="text-center">
                                <div className="text-xs text-slate-500 mb-1">YOUR SCORE</div>
                                <div className="text-3xl font-mono font-bold text-cyan-400">{myData.score}</div>
                            </div>
                            <div className="text-center">
                                <div className="text-xs text-slate-500 mb-1">OPPONENT</div>
                                <div className="text-3xl font-mono font-bold text-fuchsia-500">{oppData.score}</div>
                            </div>
                        </div>
                        {rematchStatus === 'waiting' ? (
                            <div className="w-full bg-slate-800/50 text-cyan-400 font-bold py-4 rounded-lg uppercase tracking-widest text-center animate-pulse">
                                WAITING FOR OPPONENT...
                            </div>
                        ) : rematchStatus === 'opponent-requested' ? (
                            <div className="space-y-3 w-full">
                                <div className="text-center text-cyan-400 font-mono text-sm mb-2">
                                    OPPONENT WANTS REMATCH
                                </div>
                                <button
                                    onClick={handleRequestRematch}
                                    className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-bold py-4 rounded-lg transition-all uppercase tracking-widest shadow-lg"
                                >
                                    ACCEPT
                                </button>
                                <button
                                    onClick={handleDeclineRematch}
                                    className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-4 rounded-lg transition-all uppercase tracking-widest"
                                >
                                    DECLINE
                                </button>
                            </div>
                        ) : rematchStatus === 'accepted' ? (
                            <div className="w-full bg-cyan-500/20 text-cyan-400 font-bold py-4 rounded-lg uppercase tracking-widest text-center border border-cyan-500/50">
                                STARTING NEW GAME...
                            </div>
                        ) : rematchStatus === 'declined' ? (
                            <div className="w-full bg-slate-800/50 text-slate-400 font-bold py-4 rounded-lg uppercase tracking-widest text-center">
                                RETURNING TO LOBBY...
                            </div>
                        ) : rematchStatus === 'left' ? (
                            <div className="w-full bg-red-900/50 text-red-400 font-bold py-4 rounded-lg uppercase tracking-widest text-center border border-red-500/50">
                                OPPONENT LEFT
                            </div>
                        ) : (
                            <div className="space-y-3 w-full">
                                <button
                                    onClick={handleRequestRematch}
                                    className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-bold py-4 rounded-lg hover:scale-105 transition-all uppercase tracking-widest shadow-lg"
                                >
                                    PLAY AGAIN
                                </button>
                                <button
                                    onClick={() => window.location.reload()}
                                    className="w-full bg-slate-100 text-slate-900 font-bold py-4 rounded-lg hover:scale-105 transition-all uppercase tracking-widest shadow-lg"
                                >
                                    RETURN TO LOBBY
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;
