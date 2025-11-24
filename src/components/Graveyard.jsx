import React from 'react';
import { Trophy } from './Icons';
import { THEME, RANKS } from '../utils/constants';

export const VerticalGraveyard = ({ usedCards, type }) => {
    const theme = THEME[type];
    return (
        <div className={`h-full flex flex-col items-center py-2 px-1 w-10 sm:w-12 bg-slate-900/40 border-${type === 'cpu' ? 'r' : 'l'} border-slate-800/50 backdrop-blur-sm`}>
            <div className={`text-[8px] font-mono uppercase tracking-widest mb-2 ${theme.color} opacity-70`}>
                {type === 'cpu' ? 'VOID' : 'UNIT'}
            </div>
            <div className="flex-1 flex flex-col justify-between w-full gap-1">
                {RANKS.map(r => {
                    const isUsed = usedCards.includes(r);
                    return (
                        <div
                            key={r}
                            className={`
                                flex items-center justify-center flex-1 w-full text-[10px] font-mono rounded-sm transition-all
                                ${isUsed
                                    ? 'bg-slate-800/50 text-slate-600 line-through decoration-slate-600'
                                    : `${theme.bg} ${theme.color} border border-white/5 font-bold shadow-[0_0_5px_-2px_currentColor]`}
                            `}
                        >
                            {r}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export const HorizontalGraveyard = ({ usedCards, type }) => {
    const theme = THEME[type];
    return (
        <div className="w-full flex flex-col items-center py-1.5 px-2 bg-slate-900/40 border-b border-slate-800/50 backdrop-blur-sm mb-4">
            <div className={`text-[8px] font-mono uppercase tracking-widest mb-1.5 ${theme.color} opacity-70 flex items-center gap-1`}>
                <Trophy size={8} /> PRIZE HISTORY
            </div>
            <div className="flex justify-between w-full gap-0.5 sm:gap-1 max-w-[18rem]">
                {RANKS.map(r => {
                    const isUsed = usedCards.includes(r);
                    return (
                        <div
                            key={r}
                            className={`
                                flex items-center justify-center h-5 sm:h-6 flex-1 text-[8px] sm:text-[10px] font-mono rounded-sm transition-all
                                ${isUsed
                                    ? 'bg-slate-800/50 text-slate-600 line-through decoration-slate-600'
                                    : `${theme.bg} ${theme.color} border border-white/5 font-bold shadow-[0_0_5px_-2px_currentColor]`}
                            `}
                        >
                            {r}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
