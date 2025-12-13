import React, { useState, useEffect } from 'react';
import { getLeaderboard } from '../utils/userManager';
import { Trophy, X } from './Icons';

const Leaderboard = ({ onClose }) => {
    const [players, setPlayers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            const data = await getLeaderboard();
            setPlayers(data);
            setLoading(false);
        };
        fetchLeaderboard();
    }, []);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-2xl bg-slate-900/90 border border-slate-700 rounded-2xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-700/50 bg-slate-800/50">
                    <div className="flex items-center gap-3">
                        <Trophy className="w-6 h-6 text-yellow-500 drop-shadow-glow-yellow" />
                        <h2 className="text-2xl font-black text-white tracking-tight uppercase">Leaderboard</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-700 rounded-full transition-colors text-slate-400 hover:text-white"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 space-y-4">
                            <Trophy className="w-12 h-12 text-slate-700 animate-pulse" />
                            <div className="text-slate-500 font-mono text-sm animate-pulse">Loading Rankings...</div>
                        </div>
                    ) : players.length === 0 ? (
                        <div className="text-center py-12 text-slate-500 font-mono">
                            No players found.
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="text-slate-500 text-xs font-mono uppercase tracking-wider border-b border-slate-800">
                                    <th className="py-3 px-4 font-normal">#</th>
                                    <th className="py-3 px-4 font-normal">Player</th>
                                    <th className="py-3 px-4 font-normal text-right">Rating</th>
                                    <th className="py-3 px-4 font-normal text-right">Win Rate</th>
                                    <th className="py-3 px-4 font-normal text-right hidden sm:table-cell">Games</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {players.map((player, index) => {
                                    const winRate = player.gamesPlayed > 0
                                        ? Math.round((player.gamesWon / player.gamesPlayed) * 100)
                                        : 0;

                                    const isTop3 = index < 3;
                                    const rankColor = index === 0 ? 'text-yellow-400' : index === 1 ? 'text-slate-300' : index === 2 ? 'text-amber-600' : 'text-slate-500';

                                    return (
                                        <tr key={index} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors group">
                                            <td className={`py-4 px-4 font-mono font-bold ${rankColor}`}>
                                                {index + 1}
                                            </td>
                                            <td className="py-4 px-4 font-bold text-slate-200 group-hover:text-white transition-colors">
                                                {player.name || 'Unknown Player'}
                                            </td>
                                            <td className="py-4 px-4 text-right font-mono text-cyan-400">
                                                {Math.round(player.rating || 1000)}
                                            </td>
                                            <td className="py-4 px-4 text-right font-mono text-green-400">
                                                {winRate}%
                                            </td>
                                            <td className="py-4 px-4 text-right font-mono text-slate-400 hidden sm:table-cell">
                                                {player.gamesPlayed || 0}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Leaderboard;
