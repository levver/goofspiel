import { ref, get, update, child } from "firebase/database";
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
        await update(ref(db, `users/${userId}`), data);
    } catch (error) {
        console.error("Error updating user profile:", error);
    }
};

export const isAuthenticated = () => {
    return !!auth.currentUser;
};
