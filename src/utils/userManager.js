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
        const updates = {};
        updates[`users/${userId}`] = data;

        // Mirror to public_profiles for leaderboard
        // Only include data needed for leaderboard to minimize data leakage if that's a concern
        // But for now, we'll just mirror the whole profile object as it only contains non-sensitive data
        updates[`public_profiles/${userId}`] = data;

        await update(ref(db), updates);
    } catch (error) {
        console.error("Error updating user profile:", error);
    }
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
