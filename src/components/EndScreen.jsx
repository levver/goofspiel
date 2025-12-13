import React, { useEffect, useState, useRef } from 'react';
import { RATING_ANIMATION_DURATION, RATING_ANIMATION_DELAY } from '../utils/constants';

const EndScreen = ({
    myData,
    oppData,
    rematchStatus,
    onRequestRematch,
    onDeclineRematch,
    ratingUpdate
}) => {
    // Rating Animation State
    const [displayRating, setDisplayRating] = useState(ratingUpdate ? ratingUpdate.previousRating : null);
    const [ratingChange, setRatingChange] = useState(0);
    const [showThump, setShowThump] = useState(false);
    const hasAnimated = useRef(false);

    useEffect(() => {
        if (!ratingUpdate || !ratingUpdate.previousRating || !ratingUpdate.rating) return;
        if (hasAnimated.current) return;

        hasAnimated.current = true; // Mark as animated

        const start = ratingUpdate.previousRating;
        const end = ratingUpdate.rating;
        const diff = end - start;
        setRatingChange(diff);

        // Start animation after a short delay
        const delayTimer = setTimeout(() => {
            const duration = RATING_ANIMATION_DURATION;
            const startTime = Date.now();

            const animate = () => {
                const now = Date.now();
                const progress = Math.min((now - startTime) / duration, 1);

                // Ease out quart
                const ease = 1 - Math.pow(1 - progress, 4);

                const current = Math.round(start + (diff * ease));
                setDisplayRating(current);

                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    setDisplayRating(end);
                    setShowThump(true); // Trigger thump effect at the end
                }
            };

            requestAnimationFrame(animate);
        }, RATING_ANIMATION_DELAY);

        return () => clearTimeout(delayTimer);
    }, [ratingUpdate]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/95 backdrop-blur-md animate-pop-in p-8">
            <div className="flex flex-col items-center w-full max-w-sm border border-slate-700 rounded-2xl p-8 bg-black/50 shadow-2xl">
                <h1 className="text-5xl font-black text-white mb-2 tracking-tighter">
                    {myData.score > oppData.score ? <span className="text-cyan-400 drop-shadow-glow-cyan">VICTORY</span> :
                        myData.score < oppData.score ? <span className="text-fuchsia-500 drop-shadow-glow-purple">DEFEAT</span> :
                            "DRAW"}
                </h1>

                {/* Rating Display */}
                {ratingUpdate && (
                    <div className="flex flex-col items-center justify-center my-4 h-24">
                        <div className="text-slate-400 text-xs uppercase tracking-widest mb-1">RATING UPDATE</div>
                        <div className={`text-6xl font-black font-mono relative transition-colors duration-300 ${ratingChange > 0 ? 'text-green-400' : ratingChange < 0 ? 'text-red-400' : 'text-slate-200'}`}>
                            {displayRating !== null ? Math.round(displayRating) : '---'}

                            {/* Thump Effect Overlay */}
                            {showThump && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-20"></div>
                                    <div className="animate-thump absolute text-current opacity-0 transform scale-150">
                                        {Math.round(displayRating)}
                                    </div>
                                </div>
                            )}
                        </div>
                        {showThump && ratingChange !== 0 && (
                            <div className={`text-sm font-bold animate-fade-in-up ${ratingChange > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {ratingChange > 0 ? '+' : ''}{Math.round(ratingChange)}
                            </div>
                        )}
                    </div>
                )}

                {!ratingUpdate && (
                    <div className="w-full h-px bg-gradient-to-r from-transparent via-slate-500 to-transparent my-6"></div>
                )}

                <div className="flex justify-between w-full px-4 mb-8">
                    <div className="text-center">
                        <div className="text-xs text-slate-500 mb-1">YOUR SCORE</div>
                        <div className="text-3xl font-mono font-bold text-cyan-400 drop-shadow-glow-cyan">{myData.score}</div>
                    </div>
                    <div className="text-center">
                        <div className="text-xs text-slate-500 mb-1">OPPONENT</div>
                        <div className="text-3xl font-mono font-bold text-fuchsia-500 drop-shadow-glow-purple">{oppData.score}</div>
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
                            onClick={onRequestRematch}
                            className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-bold py-4 rounded-lg transition-all uppercase tracking-widest shadow-glow-cyan"
                        >
                            ACCEPT
                        </button>
                        <button
                            onClick={onDeclineRematch}
                            className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-4 rounded-lg transition-all uppercase tracking-widest"
                        >
                            DECLINE
                        </button>
                    </div>
                ) : rematchStatus === 'accepted' ? (
                    <div className="w-full bg-cyan-500/20 text-cyan-400 font-bold py-4 rounded-lg uppercase tracking-widest text-center border border-cyan-500/50 shadow-glow-cyan">
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
                            onClick={onRequestRematch}
                            className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-bold py-4 rounded-lg hover:scale-105 transition-all uppercase tracking-widest shadow-glow-cyan"
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
    );
};

export default EndScreen;
