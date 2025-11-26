import React from 'react';
import { Shield } from './Icons';
import { THEME, RANK_LABELS } from '../utils/constants';

const DataChip = ({
    rank,
    type,
    faceDown = false,
    onClick,
    disabled = false,
    highlight = false,
    className = "",
    style = {},
    compact = false
}) => {
    const theme = THEME[type];
    const Icon = theme.icon;
    const label = RANK_LABELS[rank] || (rank < 10 ? `0${rank}` : rank);

    const widthClass = compact ? 'w-16' : 'w-20 sm:w-24';
    const heightClass = compact ? 'h-24' : 'h-28 sm:h-36';
    const textSize = compact ? 'text-sm' : 'text-lg';

    if (faceDown) {
        return (
            <div
                className={`relative ${widthClass} ${heightClass} bg-slate-900 rounded-xl border border-slate-700 shadow-lg flex items-center justify-center overflow-hidden ${className}`}
                style={style}
            >
                <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.05)_50%,transparent_75%,transparent_100%)] bg-[length:20px_20px] opacity-20"></div>
                <Shield className="w-6 h-6 text-slate-600 animate-pulse" />
            </div>
        );
    }

    return (
        <button
            onClick={(e) => !disabled && onClick && onClick(rank, e)}
            disabled={disabled}
            style={style}
            className={`
                relative ${widthClass} ${heightClass} bg-slate-900/90 backdrop-blur-md rounded-xl border transition-all duration-300 group
                flex flex-col justify-between p-1.5 select-none overflow-hidden
                ${theme.border}
                ${disabled ? 'opacity-40 cursor-not-allowed grayscale' : 'cursor-pointer'}
                ${highlight ? `ring-2 ring-offset-1 ring-offset-slate-900 ${theme.shadow} -translate-y-2 shadow-[0_0_25px_currentColor]` : ''}
                ${className}
            `}
        >
            <div className={`absolute inset-0 bg-gradient-to-b from-transparent via-${theme.color.split('-')[1]}-500/10 to-transparent opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-500 translate-y-[-100%] group-hover:translate-y-[100%] h-[200%] w-full`} />

            <div className="flex justify-between items-start">
                <span className={`font-mono font-bold ${textSize} ${theme.color} ${highlight ? 'drop-shadow-[0_0_8px_currentColor]' : ''}`}>{rank}</span>
                {!compact && <Icon size={14} className={`${theme.color} ${highlight ? 'drop-shadow-[0_0_6px_currentColor]' : ''}`} />}
            </div>

            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <Icon strokeWidth={1} className={`w-8 h-8 opacity-20 ${theme.color}`} />
            </div>

            <div className="flex flex-col items-end">
                <span className={`text-[8px] font-mono opacity-70 ${theme.color}`}>{label}</span>
                <div className={`h-0.5 w-full bg-slate-800 mt-0.5 overflow-hidden rounded-full`}>
                    <div className={`h-full ${theme.bg.replace('/10', '')} w-[${(rank / 13) * 100}%]`}></div>
                </div>
            </div>
        </button>
    );
};

export default DataChip;
