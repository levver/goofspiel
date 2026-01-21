import { RANKS } from './constants';

const RANK_VALUES = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
    'J': 11, 'Q': 12, 'K': 13, 'A': 14
};



/**
 * Predicts the opponent's move based on the prize and their available cards.
 * @param {number} prizeValue - Value of the current prize
 * @param {Array} oppHandValues - Array of {card, value} objects for opponent
 * @returns {number} The predicted value of the card the opponent will play
 */
const predictOpponentMove = (prizeValue, oppHandValues) => {
    if (!oppHandValues || oppHandValues.length === 0) return 0;

    // Strategy: Rational player tries to win the prize cheaply.
    // They will play the smallest card that is greater than the prize value.
    // If they can't beat it, they might try to match it (tie).
    // If they can't beat or match, they will "dump" their lowest card.

    // 1. Try to beat strictly (Prize + 1 or more)
    let bestResponse = oppHandValues.find(c => c.value > prizeValue);

    // 2. If can't beat, try to tie
    if (!bestResponse) {
        bestResponse = oppHandValues.find(c => c.value === prizeValue);
    }

    // 3. If can't beat or tie, dump lowest
    if (!bestResponse) {
        bestResponse = oppHandValues[0];
    }

    return bestResponse.value;
};

/**
 * Calculates a move for the AI based on the current game state.
 * @param {object} gameData - The complete game data object from Firebase
 * @param {string[]} aiHand - The array of cards currently in the AI's hand
 * @param {string[]} opponentHand - The array of cards currently in the opponent's hand
 * @returns {string} The card rank to play
 */
export const calculateAiMove = (gameData, aiHand, opponentHand) => {
    if (!aiHand || aiHand.length === 0) return null;

    const currentPrize = gameData.currentPrize;
    if (!currentPrize) return aiHand[Math.floor(Math.random() * aiHand.length)];

    const prizeValue = RANK_VALUES[currentPrize];

    // Prepare hands with numerical values
    const aiHandValues = aiHand.map(card => ({ card, value: RANK_VALUES[card] })).sort((a, b) => a.value - b.value);
    const oppHandValues = (opponentHand || []).map(card => ({ card, value: RANK_VALUES[card] })).sort((a, b) => a.value - b.value);

    const maxOppValue = oppHandValues.length > 0 ? oppHandValues[oppHandValues.length - 1].value : 0;

    // --- 1. FORCED WIN LOGIC ---
    // If the prize is high (K or A) and we can guarantee a win, take it.
    // Guideline: "if the drawn card is 13, and the player has a max of 12... always play 13"
    if (prizeValue >= 10) {
        // Check if we have a card that beats the opponent's max possible card
        const winningCard = aiHandValues.find(c => c.value > maxOppValue) || aiHandValues.find(c => c.value == maxOppValue);
        if (winningCard) {
            console.log(`[AI] Forced Win triggered for Prize ${currentPrize}. Playing ${winningCard.card}`);
            return winningCard.card;
        }
    }

    // --- 2. PREDICTION ---
    // Guideline: "try to predict which card the opponent will play"
    const predictedOppValue = predictOpponentMove(prizeValue, oppHandValues);

    // --- 3. EVALUATION MATH ---
    // Guideline: "move_value = drawn_card_value - my_card_value + predicted_opponent_card_value"

    let bestMove = null;
    let maxMoveValue = -Infinity;

    for (const option of aiHandValues) {
        const myValue = option.value;

        // Determine Outcome based on Prediction
        let gainedPoints = 0;
        if (myValue > predictedOppValue) {
            gainedPoints = prizeValue + predictedOppValue - myValue; // Win
        } else if (myValue === predictedOppValue) {
            gainedPoints = 0; // Tie (usually splits or burns, assume burn/0 for simple calculation logic)
        } else {
            gainedPoints = -prizeValue + predictedOppValue - myValue; // Loss
        }

        // Apply Formula:
        // move_value = (Points I Get) - (My Card Cost) + (Opponent Card Cost)
        let moveValue = gainedPoints;

        // --- RISK FACTOR ---
        // if prize is high (>= 10) and my bid is low (< prize - 4), penalize heavily
        // This avoids "giving away" points cheaply if we can't compete effectively
        if (prizeValue >= 10 && myValue < (prizeValue - 4)) {
            moveValue -= 0.5 * (prizeValue - myValue); // Risk penalty
        }

        if (moveValue > maxMoveValue) {
            maxMoveValue = moveValue;
            bestMove = option.card;
        }
    }

    return bestMove || aiHand[0];
};
