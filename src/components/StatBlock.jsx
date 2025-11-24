import React from 'react';
import { Clock } from './Icons';
import { formatTime } from '../utils/helpers';

const StatBlock = ({ label, value, time, color, icon: Icon, align = 'left' }) => (
    <div className={`flex flex-col ${align === 'right' ? 'items-end' : 'items-start'}`}>
        <div className={`flex items-center gap-2 mb-1`}>
            <div className={`flex items-center gap-1 text-[10px] font-mono tracking-widest text-slate-500`}>
                {align === 'right' && label}
                <Icon size={10} className={color} />
                {align === 'left' && label}
            </div>

            {/* Timer Display */}
            <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700/50 text-[10px] font-mono ${time <= 30 ? 'text-red-500 animate-pulse' : 'text-slate-400'}`}>
                <Clock size={8} />
                <span>{formatTime(time)}</span>
            </div>
        </div>

        {/* Score Display - Increased Size */}
        <div className={`text-4xl sm:text-5xl font-black font-mono leading-none ${color} drop-shadow-2xl`}>{value}</div>
    </div>
);

export default StatBlock;
