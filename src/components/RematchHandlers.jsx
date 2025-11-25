// Add these functions after handleGameEnd (around line 285)

const handleRequestRematch = () => {
    if (!gameId || !playerId) return;

    setRematchStatus('waiting');
    const updates = {};
    updates[`games/${gameId}/rematch/${playerId}Request`] = true;

    // Check if opponent already requested
    const oppRequested = playerId === 'host' ? gameData.rematch?.guestRequest : gameData.rematch?.hostRequest;
    if (oppRequested) {
        updates[`games/${gameId}/rematch/accepted`] = true;
    }

    update(ref(db), updates);
};

const handleDeclineRematch = () => {
    setRematchStatus('declined');
    setTimeout(() => {
        window.location.reload(); // Return to lobby
    }, 2000);
};

const handleRematchAccepted = () => {
    if (playerId !== 'host' || !gameData) return; // Only host resets the game

    const resetUpdates = {};
    const newPrizeDeck = shuffle([...RANKS]);

    resetUpdates[`games/${gameId}/status`] = 'PLAYING';
    resetUpdates[`games/${gameId}/round`] = 1;
    resetUpdates[`games/${gameId}/prizeDeck`] = newPrizeDeck.slice(1);
    resetUpdates[`games/${gameId}/currentPrize`] = newPrizeDeck[0];
    resetUpdates[`games/${gameId}/prizeGraveyard`] = [];
    resetUpdates[`games/${gameId}/roundStart`] = serverTimestamp();

    // Reset host
    resetUpdates[`games/${gameId}/host/score`] = 0;
    resetUpdates[`games/${gameId}/host/hand`] = [...RANKS];
    resetUpdates[`games/${gameId}/host/bid`] = null;
    resetUpdates[`games/${gameId}/host/graveyard`] = [];

    // Reset guest
    resetUpdates[`games/${gameId}/guest/score`] = 0;
    resetUpdates[`games/${gameId}/guest/hand`] = [...RANKS];
    resetUpdates[`games/${gameId}/guest/bid`] = null;
    resetUpdates[`games/${gameId}/guest/graveyard`] = [];

    // Reset rematch
    resetUpdates[`games/${gameId}/rematch`] = {
        hostRequest: false,
        guestRequest: false,
        accepted: false
    };

    update(ref(db), resetUpdates);
    setRematchStatus(null);
};
