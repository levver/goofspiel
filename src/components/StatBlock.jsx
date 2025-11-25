import React from 'react';
import { Clock } from './Icons';
import { formatTime } from '../utils/helpers';

const StatBlock = ({ label, value, time, color, icon: Icon, align, profile, playerName }) => {
    const isLeft = align === 'left';

    const getWinRate = () => {
        if (!profile || !profile.gamesPlayed) return '0%';
        return Math.round((profile.gamesWon / profile.gamesPlayed) * 100) + '%';
    };

    return (
        <div className={`flex flex-col ${isLeft ? 'items-start' : 'items-end'} group relative`}>
            <div className="flex items-center gap-2 mb-1">
                {!isLeft && <span className={`text-xs font-bold tracking-widest ${color}`}>{label}</span>}
                <Icon className={`w-4 h-4 ${color}`} />
                {isLeft && <span className={`text-xs font-bold tracking-widest ${color}`}>{label}</span>}
            </div>

            {/* Profile Tooltip */}
            {profile && (
                <div className={`
                    absolute top-full ${isLeft ? 'left-0' : 'right-0'} mt-2 w-48 
                    bg-slate-900/95 border border-slate-700 rounded-lg p-3 shadow-xl z-50
                    opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none
                    text-xs font-mono
                `}>
                    {(playerName || profile?.name) && (
                        <div className="text-white font-bold mb-2 border-b border-slate-700 pb-1">{playerName || profile?.name}</div>
                    )}
                    <div className="flex justify-between text-slate-400">
                        <span>RATING:</span>
                        <span className="text-white">{Math.round(profile.rating || 1000)}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                        <span>WIN RATE:</span>
                        <span className="text-white">{getWinRate()}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                        <span>GAMES:</span>
                        <span className="text-white">{profile.gamesPlayed || 0}</span>
                    </div>
                </div>
            )}

            <div className="text-3xl font-black font-mono leading-none tracking-tighter text-white">
                {value}
            </div>
            {time !== undefined && (
                <div className="text-[10px] font-mono text-slate-500 mt-1">
                    TIME: <span className={time < 30 ? "text-red-500 animate-pulse" : "text-slate-400"}>{time}s</span>
                </div>
            )}
        </div>
    );
};

export default StatBlock;
