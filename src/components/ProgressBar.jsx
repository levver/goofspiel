import React, { useState, useEffect } from 'react';

const ProgressBar = ({ myScore, oppScore, prizeGraveyard, status }) => {
    const [displayScores, setDisplayScores] = useState({ my: myScore, opp: oppScore, graveyard: prizeGraveyard });

    useEffect(() => {
        if (status === 'RESOLVING') {
            // Delay update during resolution animation
            const timer = setTimeout(() => {
                setDisplayScores({ my: myScore, opp: oppScore, graveyard: prizeGraveyard });
            }, 3000); // Wait for animation to finish
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
        <div className="w-full max-w-md mb-4 px-4">
            {/* Progress Bar */}
            <div className="relative h-6 bg-slate-800 rounded-full overflow-hidden border border-slate-700 shadow-lg shadow-slate-900/50">
                {/* My progress from left */}
                <div
                    style={{ width: `${myPercentage}%` }}
                    className="absolute left-0 h-full bg-cyan-500 transition-all duration-500 shadow-[0_0_20px_rgba(6,182,212,0.6)] animate-wiggle"
                />

                {/* Opponent progress from right */}
                <div
                    style={{ width: `${oppPercentage}%` }}
                    className="absolute right-0 h-full bg-fuchsia-500 transition-all duration-500 shadow-[0_0_20px_rgba(217,70,239,0.6)] animate-wiggle"
                />

                {/* Center marker (50% line) */}
                <div className="absolute left-1/2 -translate-x-1/2 w-0.5 h-full bg-yellow-400 z-10 shadow-[0_0_10px_rgba(250,204,21,0.8)]" />
            </div>

            {/* Score labels */}
            <div className="flex justify-between text-xs mt-1 font-mono">
                <span className="text-cyan-400">{displayScores.my}</span>
                <span className="text-slate-500">{totalAvailablePoints / 2}</span>
                <span className="text-fuchsia-400">{displayScores.opp}</span>
            </div>
        </div>
    );
};

export default ProgressBar;
