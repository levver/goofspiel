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
    // Cancel onDisconnect
    const presenceRef = ref(db, `games/${gameId}/presence/${playerId}`);
    await fbOnDisconnect(presenceRef).cancel();

    console.log('[PRESENCE] Cleaned up for', playerId);
};
