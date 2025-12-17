import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "DEIN_API_KEY",
    authDomain: "DEIN_DOMAIN",
    projectId: "DEIN_PROJECTID",
    storageBucket: "DEIN_BUCKET",
    messagingSenderId: "DEIN_SENDERID",
    appId: "DEINE_APPID"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
