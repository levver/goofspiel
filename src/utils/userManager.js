import { ref, get, update, child, query, orderByChild, limitToLast } from "firebase/database";
import { db, auth } from "./firebaseConfig";

const STORAGE_KEY_USER_NAME = 'goofspiel_user_name';


export const getUserId = () => {
    return auth.currentUser?.uid || null;
};

export const getUserName = () => {
    // Prefer Firebase display name, fall back to stored name
    return auth.currentUser?.displayName ||
        auth.currentUser?.email?.split('@')[0] ||
        localStorage.getItem(STORAGE_KEY_USER_NAME) ||
        `Player ${Math.floor(Math.random() * 1000)}`;
};

export const setUserName = (name) => {
    localStorage.setItem(STORAGE_KEY_USER_NAME, name);
};

export const getUserProfile = async (userId) => {
    try {
        const snapshot = await get(child(ref(db), `users/${userId}`));
        if (snapshot.exists()) {
            return snapshot.val();
        } else {
            // Default profile
            return {
                name: getUserName(),
                gamesPlayed: 0,
                gamesWon: 0,
                rating: 1000,
                rd: 350,
                vol: 0.06
            };
        }
    } catch (error) {
        console.error("Error fetching user profile:", error);
        return null;
    }
};

export const updateUserProfile = async (userId, data) => {
    try {
        // Fetch existing profile first to ensure we don't overwrite name or other fields
        // that are not included in 'data'
        const existingSnap = await get(child(ref(db), `users/${userId}`));
        const existing = existingSnap.exists() ? existingSnap.val() : {};

        // Merge existing data with new data (new data takes precedence)
        const merged = { ...existing, ...data };

        // Fallback checks to ensure essential fields exist
        if (!merged.name) {
            // Try to recover name from auth if it's the current user
            if (auth.currentUser && auth.currentUser.uid === userId) {
                merged.name = getUserName();
            } else {
                merged.name = `Player ${userId.slice(0, 4)}`;
            }
        }

        const updates = {};
        updates[`users/${userId}`] = merged;

        // Mirror to public_profiles for leaderboard
        updates[`public_profiles/${userId}`] = merged;

        await update(ref(db), updates);
    } catch (error) {
        console.error("Error updating user profile:", error);
    }
    return null; // Return promise
};

export const getLeaderboard = async () => {
    try {
        const usersRef = ref(db, 'public_profiles');
        const q = query(usersRef, orderByChild('rating'), limitToLast(10));
        const snapshot = await get(q);

        if (snapshot.exists()) {
            const users = [];
            snapshot.forEach((childSnapshot) => {
                users.unshift(childSnapshot.val()); // Unshift to get descending order (highest rating first)
            });
            return users;
        }
        return [];
    } catch (error) {
        console.error("Error fetching leaderboard:", error);
        return [];
    }
};

export const isAuthenticated = () => {
    return !!auth.currentUser;
};
