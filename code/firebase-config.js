import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-storage.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

// Deine Firebase Config:
const firebaseConfig = {
  apiKey: "AIzaSyB2rnjkUqZ7zsya8A4-NXjuu8_V2kmJRfQ",
  authDomain: "promt-master1234.firebaseapp.com",
  projectId: "promt-master1234",
  storageBucket: "promt-master1234.firebasestorage.app",
  messagingSenderId: "77863236164",
  appId: "1:77863236164:web:754e9cf673890514a68211",
  measurementId: "G-DV5YXT3QC2"
};

// Init:
export const app = initializeApp(firebaseConfig);
export const storage = getStorage(app);
export const db = getFirestore(app);
