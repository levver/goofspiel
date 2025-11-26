import { ref, onDisconnect as fbOnDisconnect, update, serverTimestamp } from 'firebase/database';
import { db } from './firebaseConfig';

// Set up presence tracking for a player
export const setupPresence = async (gameId, playerId) => {
    const presenceRef = ref(db, `games/${gameId}/presence/${playerId}`);

    // Set up onDisconnect handler
    await fbOnDisconnect(presenceRef).update({
        online: false,
        disconnectedAt: serverTimestamp()
    });

    // Mark as online
    await update(presenceRef, {
        online: true,
        lastSeen: serverTimestamp(),
        disconnectedAt: null
    });

    console.log('[PRESENCE] Setup for', playerId, 'in game', gameId);
};

// Send heartbeat
export const sendHeartbeat = async (gameId, playerId) => {
    const presenceRef = ref(db, `games/${gameId}/presence/${playerId}`);
    await update(presenceRef, {
        online: true,
        lastSeen: serverTimestamp()
    });
};

// Clean up presence on leaving
export const cleanupPresence = async (gameId, playerId) => {
    // Explicitly mark as offline immediately
    const presenceRef = ref(db, `games/${gameId}/presence/${playerId}`);
    await update(presenceRef, {
        online: false,
        lastSeen: serverTimestamp()
    });

    // NOTE: We do NOT cancel the onDisconnect handler here.
    // If we cancel it, and the user closes the tab immediately after this function runs
    // (or if this function runs AS the tab is closing), the onDisconnect might be cancelled
    // before the socket actually disconnects, leaving the user "online" forever.
    // By leaving it active, we ensure that if the connection drops, the server will
    // enforce the offline state.

    console.log('[PRESENCE] Cleaned up for', playerId);
};
