import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.0/firebase-app.js";
import { getDatabase, ref, set, push, onValue, update, remove } from "https://www.gstatic.com/firebasejs/9.6.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyDzGbMfbjF29gKuAUhZxxPpIX0CSUyu-1U",
    authDomain: "db-tabungan.firebaseapp.com",
    databaseURL: "https://db-tabungan-default-rtdb.firebaseio.com",
    projectId: "db-tabungan",
    storageBucket: "db-tabungan.firebasestorage.app",
    messagingSenderId: "950052401430",
    appId: "1:950052401430:web:a5d7492659ce2d1888e037",
    measurementId: "G-6TYT3DTG8L"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Export Firebase methods
export { db, ref, set, push, onValue, update, remove };