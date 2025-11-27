import React, { useState, useEffect } from 'react';
import { auth } from '../utils/firebaseConfig';
import { signOut } from 'firebase/auth';
import { Shield, Trophy, LogOut } from './Icons';

const Lobby = ({ onCreateGame, onJoinGame, currentUser, isSearching, searchStartTime, onFindMatch, onCancelSearch }) => {
    const [joinCode, setJoinCode] = useState('');
    const [isJoining, setIsJoining] = useState(false);
    const [profile, setProfile] = useState(null);

    useEffect(() => {
        const loadProfile = async () => {
            if (currentUser?.uid) {
                const { getUserProfile } = await import('../utils/userManager');
                const userProfile = await getUserProfile(currentUser.uid);
                setProfile(userProfile);
            }
        };
        loadProfile();
    }, [currentUser]);

    const [searchTime, setSearchTime] = useState(0);
    useEffect(() => {
        if (!isSearching || !searchStartTime) return;

        const interval = setInterval(() => {
            setSearchTime(Math.floor((Date.now() - searchStartTime) / 1000));
        }, 1000);

        return () => clearInterval(interval);
    }, [isSearching, searchStartTime]);

    const handleSignOut = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

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
                {/* Header */}
                <div className="text-center mb-8">
                    <Shield className="w-20 h-20 mx-auto mb-4 text-cyan-400 drop-shadow-glow-cyan" />
                    <h1 className="text-5xl font-black text-white mb-2 tracking-tighter">GOOFSPIEL</h1>
                    <p className="text-slate-400 font-mono text-sm tracking-widest">CYBER OPS PROTOCOL</p>

                    {/* User Info & Sign Out */}
                    <div className="mt-4 space-y-2">
                        {profile && (
                            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 text-xs font-mono">
                                <div className="text-center text-white font-bold mb-2">
                                    {currentUser?.email || 'GUEST'}
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-center">
                                    <div>
                                        <div className="text-slate-500">RATING</div>
                                        <div className="text-cyan-400 font-bold">{Math.round(profile.rating || 1000)}</div>
                                    </div>
                                    <div>
                                        <div className="text-slate-500">W/L</div>
                                        <div className="text-white font-bold">{profile.gamesWon || 0}/{(profile.gamesPlayed || 0) - (profile.gamesWon || 0)}</div>
                                    </div>
                                    <div>
                                        <div className="text-slate-500">WR</div>
                                        <div className="text-green-400 font-bold">
                                            {profile.gamesPlayed > 0 ? Math.round((profile.gamesWon / profile.gamesPlayed) * 100) : 0}%
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <button
                            onClick={handleSignOut}
                            className="w-full flex items-center justify-center gap-2 text-xs text-slate-400 hover:text-red-400 transition-colors font-mono py-2 border border-slate-700 rounded hover:border-red-500/50"
                        >
                            <LogOut className="w-3 h-3" />
                            SIGN OUT
                        </button>
                    </div>
                </div>

                <div className="flex flex-col gap-4 w-full z-10">
                    {isSearching ? (
                        <div className="bg-cyan-500/10 border border-cyan-500/50 rounded-lg p-6 text-center space-y-3 shadow-glow-cyan">
                            <div className="text-cyan-400 font-bold text-lg uppercase tracking-widest animate-pulse">
                                SEARCHING FOR OPPONENT...
                            </div>
                            <div className="text-slate-400 font-mono text-sm">
                                {searchTime}s
                            </div>
                            <button
                                onClick={onCancelSearch}
                                className="w-full bg-red-500/20 hover:bg-red-500/30 text-red-400 font-bold py-3 rounded transition-all border border-red-500/50 uppercase tracking-widest"
                            >
                                CANCEL SEARCH
                            </button>
                        </div>
                    ) : (
                        <>
                            <button
                                onClick={onFindMatch}
                                className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-black font-bold py-4 px-6 rounded-lg transition-all transform hover:scale-105 shadow-glow-cyan-soft uppercase tracking-widest"
                            >
                                FIND MATCH
                            </button>

                            <div className="relative flex items-center py-2">
                                <div className="flex-grow border-t border-slate-700"></div>
                                <span className="flex-shrink-0 mx-4 text-slate-500 text-xs font-mono">OR</span>
                                <div className="flex-grow border-t border-slate-700"></div>
                            </div>
                        </>
                    )}
                    <button
                        onClick={onCreateGame}
                        className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold py-3 px-6 rounded transition-all transform hover:scale-105 shadow-glow-cyan-soft uppercase tracking-widest"
                    >
                        Create New Game
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
                            className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-3 text-center font-mono text-lg tracking-widest text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 focus:shadow-glow-cyan transition-all"
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
