import React, { useState, useEffect } from 'react';
import { PROGRESS_BAR_UPDATE_DELAY } from '../utils/constants';

const ProgressBar = ({ myScore, oppScore, prizeGraveyard, status }) => {
    const [displayScores, setDisplayScores] = useState({ my: myScore, opp: oppScore, graveyard: prizeGraveyard });

    useEffect(() => {
        if (status === 'RESOLVING') {
            // Delay update during resolution animation
            const timer = setTimeout(() => {
                setDisplayScores({ my: myScore, opp: oppScore, graveyard: prizeGraveyard });
            }, PROGRESS_BAR_UPDATE_DELAY);
            return () => clearTimeout(timer);
        } else {
            // Immediate update otherwise
            setDisplayScores({ my: myScore, opp: oppScore, graveyard: prizeGraveyard });
        }
    }, [myScore, oppScore, prizeGraveyard, status]);

    // Total available points = 91 - (points already won by both players)
    const totalAvailablePoints = 91 - (displayScores.graveyard || []).reduce((a, b) => a + b, 0) + displayScores.my + displayScores.opp;

    // Percentage based on total available points
    const myPercentage = totalAvailablePoints > 0 ? (displayScores.my / totalAvailablePoints) * 100 : 0;
    const oppPercentage = totalAvailablePoints > 0 ? (displayScores.opp / totalAvailablePoints) * 100 : 0;

    return (
        <div className="w-full max-w-md mb-4 mt-4 px-4">
            {/* Score label */}
            <div className="text-xs mb-2 font-mono text-center text-white z-30">
                {totalAvailablePoints / 2}
            </div>

            {/* Progress Bar Container */}
            <div className="relative h-6">
                {/* Inner Bar (Clipped) */}
                <div className="absolute inset-0 bg-slate-800 rounded-full overflow-hidden border border-slate-700 shadow-lg shadow-slate-900/50">
                    {/* My progress from left */}
                    <div
                        style={{ width: `${myPercentage}%` }}
                        className="absolute left-0 h-full bg-[image:linear-gradient(90deg,#06b6d4_0%,#67e8f9_25%,#06b6d4_50%,#67e8f9_75%,#06b6d4_100%)] bg-[length:200%_100%] transition-all duration-500 shadow-glow-cyan animate-ripple-right"
                    />

                    {/* Opponent progress from right */}
                    <div
                        style={{ width: `${oppPercentage}%` }}
                        className="absolute right-0 h-full bg-[image:linear-gradient(90deg,#d946ef_0%,#f0abfc_25%,#d946ef_50%,#f0abfc_75%,#d946ef_100%)] bg-[length:200%_100%] transition-all duration-500 shadow-glow-purple animate-ripple-left"
                    />
                </div>

                {/* Center marker (Unclipped) */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-[140%] z-20 pointer-events-none flex flex-col">
                    {/* Top Half (Flows down) */}
                    <div className="w-full h-1/2 bg-[image:linear-gradient(180deg,theme(colors.yellow.400),theme(colors.yellow.200),theme(colors.yellow.400),theme(colors.yellow.200))] bg-[length:100%_200%] animate-ripple-down rounded-t-full shadow-glow-gold" />
                    {/* Bottom Half (Flows up) */}
                    <div className="w-full h-1/2 -mt-px bg-[image:linear-gradient(180deg,theme(colors.yellow.200),theme(colors.yellow.400),theme(colors.yellow.200),theme(colors.yellow.400))] bg-[length:100%_200%] animate-ripple-up rounded-b-full shadow-glow-gold" />
                </div>
            </div>
        </div>
    );
};

export default ProgressBar;
