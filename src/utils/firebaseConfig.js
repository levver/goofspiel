import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

// TODO: Replace with your Firebase project configuration
const firebaseConfig = {
    apiKey: "AIzaSyDxXjBi3ecdmGN3JozgGebPMJN7b5IcjA0",
    authDomain: "goofspiel-e220a.firebaseapp.com",
    databaseURL: "https://goofspiel-e220a-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "goofspiel-e220a",
    storageBucket: "goofspiel-e220a.firebasestorage.app",
    messagingSenderId: "190786850748",
    appId: "1:190786850748:web:f5d30ad914516d33d765b9",
    measurementId: "G-E15BK22TQ8"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
