import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

const firebaseConfig = {
    apiKey: "DEIN_KEY",
    authDomain: "DEINE_DOMAIN",
    projectId: "DEIN_PROJECTID",
    storageBucket: "DEIN_BUCKET",
    messagingSenderId: "DEINE_SENDERID",
    appId: "DEINE_APPID"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
