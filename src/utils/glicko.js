// Simplified Glicko-2 implementation
// Constants
const TAU = 0.5;
const VOLATILITY_CHANGE = 0.06; // Default volatility

// Helper functions
const square = (x) => x * x;

const g = (phi) => {
    return 1 / Math.sqrt(1 + 3 * square(phi) / square(Math.PI));
};

const E = (mu, mu_j, phi_j) => {
    return 1 / (1 + Math.exp(-g(phi_j) * (mu - mu_j)));
};

const v = (mu, mu_j, phi_j) => {
    const g_phi_j = g(phi_j);
    const e = E(mu, mu_j, phi_j);
    return 1 / (square(g_phi_j) * e * (1 - e));
};

// Main calculation function
// Returns updated { rating, rd, vol } for player 1
export const calculateNewRating = (p1, p2, outcome) => {
    // Convert to Glicko-2 scale
    const mu = (p1.rating - 1500) / 173.7178;
    const phi = p1.rd / 173.7178;
    const sigma = p1.vol || 0.06;

    const mu_j = (p2.rating - 1500) / 173.7178;
    const phi_j = p2.rd / 173.7178;

    // Step 3: Compute v
    const v_val = v(mu, mu_j, phi_j);

    // Step 4: Compute delta
    const g_phi_j = g(phi_j);
    const delta = v_val * g_phi_j * (outcome - E(mu, mu_j, phi_j));

    // Step 5: Update volatility (simplified iterative procedure)
    // For simplicity in this JS implementation, we'll use a basic update or keep it constant if too complex
    // Implementing the full iterative algorithm:
    const a = Math.log(square(sigma));
    const f = (x) => {
        const ex = Math.exp(x);
        const num1 = ex * (delta * delta - phi * phi - v_val - ex);
        const den1 = 2 * square(phi * phi + v_val + ex);
        const term2 = (x - a) / square(TAU);
        return (num1 / den1) - term2;
    };

    let A = a;
    let B;
    if (delta * delta > phi * phi + v_val) {
        B = Math.log(delta * delta - phi * phi - v_val);
    } else {
        let k = 1;
        while (f(a - k * TAU) < 0) {
            k++;
        }
        B = a - k * TAU;
    }

    let fA = f(A);
    let fB = f(B);

    while (Math.abs(B - A) > 0.000001) {
        const C = A + (A - B) * fA / (fB - fA);
        const fC = f(C);
        if (fC * fB < 0) {
            A = B;
            fA = fB;
        } else {
            fA = fA / 2;
        }
        B = C;
        fB = fC;
    }

    const newSigma = Math.exp(A / 2);

    // Step 6: Update phi star
    const phi_star = Math.sqrt(square(phi) + square(newSigma));

    // Step 7: Update phi and mu
    const newPhi = 1 / Math.sqrt(1 / square(phi_star) + 1 / v_val);
    const newMu = mu + square(newPhi) * g_phi_j * (outcome - E(mu, mu_j, phi_j));

    // Step 8: Convert back to Glicko scale
    return {
        rating: 173.7178 * newMu + 1500,
        rd: 173.7178 * newPhi,
        vol: newSigma
    };
};
