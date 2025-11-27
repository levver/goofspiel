import React from 'react';

const WaitingScreen = ({ gameId, onCancel }) => {
    return (
        <div className="fixed inset-0 bg-[#0a0e17] flex flex-col items-center justify-center text-white font-mono gap-4">
            <div className="text-2xl">WAITING FOR OPPONENT</div>
            <div className="text-4xl font-bold text-cyan-400 tracking-widest border-2 border-dashed border-cyan-500/50 p-4 rounded-xl shadow-glow-cyan drop-shadow-glow-cyan">
                {gameId}
            </div>
            <div className="text-sm text-slate-500">SHARE THIS CODE</div>
            {onCancel && (
                <button
                    onClick={onCancel}
                    className="mt-4 px-6 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 rounded-lg transition-all duration-200 font-mono text-sm"
                >
                    CANCEL
                </button>
            )}
        </div>
    );
};

export default WaitingScreen;
