import React from 'react';

const EndScreen = ({
    myData,
    oppData,
    rematchStatus,
    onRequestRematch,
    onDeclineRematch
}) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/95 backdrop-blur-md animate-pop-in p-8">
            <div className="flex flex-col items-center w-full max-w-sm border border-slate-700 rounded-2xl p-8 bg-black/50 shadow-2xl">
                <h1 className="text-5xl font-black text-white mb-2 tracking-tighter">
                    {myData.score > oppData.score ? <span className="text-cyan-400 drop-shadow-glow-cyan">VICTORY</span> :
                        myData.score < oppData.score ? <span className="text-fuchsia-500 drop-shadow-glow-purple">DEFEAT</span> :
                            "DRAW"}
                </h1>
                <div className="w-full h-px bg-gradient-to-r from-transparent via-slate-500 to-transparent my-6"></div>
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
