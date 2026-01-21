import React from 'react';
import { X, Volume2, VolumeX } from './Icons';
import SoundManager from '../utils/SoundManager';

const SettingsMenu = ({ onClose, isMuted, onToggleMute }) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/90 backdrop-blur-sm animate-fade-in p-4">
            <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-zoom-in">

                {/* Header */}
                <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                    <h2 className="text-lg font-bold text-white tracking-wide">SETTINGS</h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">

                    {/* Audio Settings */}
                    <div className="space-y-3">
                        <label className="text-xs font-mono font-bold text-slate-500 uppercase tracking-widest">
                            Audio
                        </label>
                        <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-800">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${isMuted ? 'bg-slate-700 text-slate-400' : 'bg-cyan-900/30 text-cyan-400'}`}>
                                    {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold text-slate-200">Sound Effects & Music</span>
                                    <span className="text-xs text-slate-500">{isMuted ? 'Muted' : 'On'}</span>
                                </div>
                            </div>

                            <button
                                onClick={onToggleMute}
                                className={`
                                    relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-900
                                    ${!isMuted ? 'bg-cyan-600' : 'bg-slate-700'}
                                `}
                            >
                                <span
                                    className={`
                                        inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                                        ${!isMuted ? 'translate-x-6' : 'translate-x-1'}
                                    `}
                                />
                            </button>
                        </div>
                    </div>

                    {/* App Version / Info could go here later */}

                </div>

                {/* Footer */}
                <div className="p-4 bg-slate-950/30 border-t border-slate-800 flex justify-center">
                    <span className="text-[10px] items-center text-slate-600 font-mono">
                        GOOFSPIEL 2026
                    </span>
                </div>

            </div>
        </div>
    );
};

export default SettingsMenu;
