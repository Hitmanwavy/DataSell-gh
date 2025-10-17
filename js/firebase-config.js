// js/firebase-config.js - UPDATED FOR FIREBASE 12.4.0
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyDM3i0wSEc12VR35MKYrPO-QoICKCjMu5w",
    authDomain: "datasell-gh.firebaseapp.com",
    databaseURL: "https://datasell-gh-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "datasell-gh",
    storageBucket: "datasell-gh.firebasestorage.app",
    messagingSenderId: "882433482237",
    appId: "1:882433482237:web:6f8edded6f4a4d277f4d94"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Export for use in other modules
export { database };
console.log('🔥 Firebase 12.4.0 initialized successfully');