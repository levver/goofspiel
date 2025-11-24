import React, { useState } from 'react';
import { Shield, Trophy } from './Icons';

const Lobby = ({ onCreateGame, onJoinGame }) => {
    const [joinCode, setJoinCode] = useState('');
    const [isJoining, setIsJoining] = useState(false);

    const handleJoin = (e) => {
        e.preventDefault();
        if (joinCode.trim()) {
            setIsJoining(true);
            onJoinGame(joinCode.trim());
        }
    };

    return (
        <div className="fixed inset-0 bg-[#0a0e17] flex items-center justify-center p-4">
            <div className="absolute inset-0 pointer-events-none opacity-20" style={{
                backgroundImage: 'linear-gradient(#1e293b 1px, transparent 1px), linear-gradient(90deg, #1e293b 1px, transparent 1px)',
                backgroundSize: '20px 20px'
            }}></div>

            <div className="relative w-full max-w-md bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-2xl p-8 shadow-2xl">
                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 bg-cyan-500/10 rounded-2xl flex items-center justify-center mb-4 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                        <Shield className="w-8 h-8 text-cyan-400" />
                    </div>
                    <h1 className="text-3xl font-black text-white tracking-tighter mb-2">GOOFSPIEL</h1>
                    <p className="text-slate-400 font-mono text-sm tracking-widest">CYBER OPS PROTOCOL</p>
                </div>

                <div className="space-y-4">
                    <button
                        onClick={onCreateGame}
                        className="w-full py-4 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-bold rounded-xl transition-all transform hover:scale-[1.02] shadow-lg flex items-center justify-center gap-2 group"
                    >
                        <Shield className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                        CREATE NEW OPERATION
                    </button>

                    <div className="relative flex items-center py-2">
                        <div className="flex-grow border-t border-slate-700"></div>
                        <span className="flex-shrink-0 mx-4 text-slate-500 text-xs font-mono">OR JOIN EXISTING</span>
                        <div className="flex-grow border-t border-slate-700"></div>
                    </div>

                    <form onSubmit={handleJoin} className="space-y-3">
                        <input
                            type="text"
                            value={joinCode}
                            onChange={(e) => setJoinCode(e.target.value)}
                            placeholder="ENTER ACCESS CODE"
                            className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-3 text-center font-mono text-lg tracking-widest text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all"
                        />
                        <button
                            type="submit"
                            disabled={!joinCode.trim() || isJoining}
                            className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isJoining ? (
                                <span className="animate-pulse">CONNECTING...</span>
                            ) : (
                                <>
                                    <Trophy className="w-4 h-4" />
                                    JOIN OPERATION
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Lobby;
