import React from 'react';

const HUD = ({ gameData, currentLog, onForfeit }) => {
    return (
        <div className="relative z-20 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 p-3 flex justify-between items-center shadow-xl">
            <div className="flex flex-col">
                <span className="text-[10px] text-slate-500 font-mono tracking-widest">ROUND</span>
                <span className="text-xl font-bold text-white font-mono leading-none drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">
                    {gameData.round}<span className="text-slate-600 text-sm">/13</span>
                </span>
            </div>

            <div className={`px-3 py-1 rounded text-xs font-mono font-bold tracking-wider transition-colors duration-300
                ${currentLog.type === 'success' ? 'bg-cyan-900/50 text-cyan-400 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.4)]' :
                    currentLog.type === 'danger' ? 'bg-fuchsia-900/50 text-fuchsia-400 border border-fuchsia-500/30 shadow-[0_0_15px_rgba(217,70,239,0.4)]' :
                        'bg-slate-800 text-slate-300 border border-slate-700'}
            `}>
                {currentLog.msg}
            </div>

            <div className="flex flex-col items-end">
                <span className="text-[10px] text-slate-500 font-mono tracking-widest">REMAINING POOL</span>
                <span className="text-xl font-bold text-yellow-500 font-mono leading-none drop-shadow-[0_0_10px_rgba(234,179,8,0.6)]">
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
