import React from 'react';

const HUD = ({ gameData, currentLog, onForfeit, playerId }) => {
    // Determine log style based on who won relative to current player
    let logStyle = 'bg-slate-800 text-slate-300 border border-slate-700';

    if (currentLog.type === playerId) {
        // I won
        logStyle = 'bg-cyan-900/50 text-cyan-400 border border-cyan-500/30 shadow-glow-cyan';
    } else if (currentLog.type === 'host' || currentLog.type === 'guest') {
        // Opponent won (assuming type is host/guest and not me)
        logStyle = 'bg-fuchsia-900/50 text-fuchsia-400 border border-fuchsia-500/30 shadow-glow-purple';
    } else if (currentLog.type === 'success') {
        // Legacy/Special success
        logStyle = 'bg-cyan-900/50 text-cyan-400 border border-cyan-500/30 shadow-glow-cyan';
    } else if (currentLog.type === 'danger') {
        // Legacy/Special danger
        logStyle = 'bg-fuchsia-900/50 text-fuchsia-400 border border-fuchsia-500/30 shadow-glow-purple';
    }

    return (
        <div className="relative z-20 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 p-3 flex justify-between items-center shadow-xl">
            <div className="flex flex-col">
                <span className="text-[10px] text-slate-500 font-mono tracking-widest">ROUND</span>
                <span className="text-xl font-bold text-white font-mono leading-none drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">
                    {gameData.round}<span className="text-slate-600 text-sm">/13</span>
                </span>
            </div>

            <div className={`px-3 py-1 rounded text-xs font-mono font-bold tracking-wider transition-colors duration-300 ${logStyle}`}>
                {currentLog.msg}
            </div>

            <div className="flex flex-col items-end">
                <span className="text-[10px] text-slate-500 font-mono tracking-widest">REMAINING POOL</span>
                <span className="text-xl font-bold text-yellow-500 font-mono leading-none drop-shadow-glow-gold">
                    {91 - (gameData.prizeGraveyard ? gameData.prizeGraveyard.reduce((a, b) => a + b, 0) : 0) - (gameData.currentPrize || 0)}
                </span>
            </div>

            {/* Forfeit Button */}
            {(gameData.status === 'PLAYING' || gameData.status === 'RESOLVING') && (
                <button
                    onClick={onForfeit}
                    className="px-3 py-1 bg-red-900/50 hover:bg-red-800/70 border border-red-700 rounded text-red-200 text-xs font-mono uppercase tracking-wider transition-all shadow-[0_0_10px_rgba(185,28,28,0.3)] hover:shadow-[0_0_15px_rgba(185,28,28,0.5)]"
                >
                    Forfeit
                </button>
            )}
        </div>
    );
};

export default HUD;
