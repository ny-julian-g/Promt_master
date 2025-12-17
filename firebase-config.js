import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export const app = initializeApp({
  apiKey: "DEIN_API_KEY",
  authDomain: "DEINE_DOMAIN",
  projectId: "DEIN_PROJECT_ID",
  storageBucket: "DEIN_BUCKET",
  messagingSenderId: "DEINE_ID",
  appId: "DEINE_APP_ID"
});

export const db = getFirestore(app);
