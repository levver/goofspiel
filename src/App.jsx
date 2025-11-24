import React, { useState, useEffect, useRef } from 'react';
import { Cpu, Hexagon, Activity } from './components/Icons';
import DataChip from './components/DataChip';
import { VerticalGraveyard, HorizontalGraveyard } from './components/Graveyard';
import StatBlock from './components/StatBlock';
import Lobby from './components/Lobby';
import { RANKS, RESOLVE_ROUND_TIMER } from './utils/constants';
import { shuffle } from './utils/helpers';
import { db } from './utils/firebaseConfig';
import { ref, set, onValue, update, push, child, get, serverTimestamp } from "firebase/database";

function App() {
    // --- Firebase State ---
    const [gameId, setGameId] = useState(null);
    const [playerId, setPlayerId] = useState(null); // 'host' or 'guest'
    const [gameData, setGameData] = useState(null);

    // --- Local UI State ---
    const [log, setLog] = useState({ msg: "SYSTEM READY", type: 'neutral' });
    const [animatingCard, setAnimatingCard] = useState(null);
    const [animationProps, setAnimationProps] = useState(null);
    const [localTime, setLocalTime] = useState(600);
    const [oppLocalTime, setOppLocalTime] = useState(600);
    const playerSlotRef = useRef(null);

    // --- Firebase Logic ---

    const createGame = () => {
        const newGameRef = push(child(ref(db), 'games'));
        const newGameId = newGameRef.key;

        const initialGameData = {
            status: 'WAITING',
            round: 1,
            prizeDeck: shuffle([...RANKS]),
            currentPrize: null,
            host: { score: 0, hand: [...RANKS], bid: null, graveyard: [], time: 600 },
            guest: { score: 0, hand: [...RANKS], bid: null, graveyard: [], time: 600 },
            prizeGraveyard: [],
            lastAction: Date.now(),
            roundStart: serverTimestamp()
        };

        // Set initial prize
        initialGameData.currentPrize = initialGameData.prizeDeck[0];
        initialGameData.prizeDeck = initialGameData.prizeDeck.slice(1);

        set(newGameRef, initialGameData);
        setGameId(newGameId);
        setPlayerId('host');
    };

    const joinGame = (code) => {
        const gameRef = ref(db, `games/${code}`);

        // Check if game exists
        get(gameRef).then((snapshot) => {
            if (snapshot.exists()) {
                setGameId(code);
                setPlayerId('guest');
                update(gameRef, { status: 'PLAYING' });
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
            }

            update(ref(db), nextUpdates);
        }, 3000); // 3 seconds to see result
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

    if (!gameId) {
        return <Lobby onCreateGame={createGame} onJoinGame={joinGame} />;
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
                        {(gameData.prizeGraveyard ? gameData.prizeGraveyard.reduce((a, b) => a + b, 0) : 0) + (gameData.currentPrize || 0)}
                    </span>
                </div>
            </div>

            {/* Main Arena */}
            <div className="flex-1 relative flex flex-col w-full max-w-md mx-auto">

                {/* Opponent Bar */}
                <div className="px-4 py-2 flex justify-end items-end border-b border-slate-800/30">
                    <StatBlock
                        label="OPPONENT"
                        value={oppData.score}
                        time={oppLocalTime}
                        color="text-fuchsia-500"
                        icon={Hexagon}
                        align="right"
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
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full bg-slate-100 text-slate-900 font-bold py-4 rounded-lg hover:bg-cyan-400 hover:scale-105 transition-all uppercase tracking-widest shadow-lg"
                        >
                            RETURN TO LOBBY
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;
