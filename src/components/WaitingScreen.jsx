import React from 'react';

const WaitingScreen = ({ gameId }) => {
    return (
        <div className="fixed inset-0 bg-[#0a0e17] flex flex-col items-center justify-center text-white font-mono gap-4">
            <div className="text-2xl">WAITING FOR OPPONENT</div>
            <div className="text-4xl font-bold text-cyan-400 tracking-widest border-2 border-dashed border-cyan-500/50 p-4 rounded-xl">
                {gameId}
            </div>
            <div className="text-sm text-slate-500">SHARE THIS CODE</div>
        </div>
    );
};

export default WaitingScreen;
