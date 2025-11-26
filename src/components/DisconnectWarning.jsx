import React from 'react';

const DisconnectWarning = ({ oppDisconnectTime }) => {
    return (
        <div className="absolute top-0 left-0 right-0 bg-red-900/95 border-b border-red-500 p-3 text-center z-50 animate-in slide-in-from-top">
            <div className="text-red-200 font-bold text-sm uppercase tracking-wide">
                ⚠️ OPPONENT DISCONNECTED
            </div>
            <div className="text-red-300 text-xs font-mono mt-1">
                Waiting for reconnection... {Math.max(0, 30 - Math.floor((Date.now() - oppDisconnectTime) / 1000))}s
            </div>
        </div>
    );
};

export default DisconnectWarning;
