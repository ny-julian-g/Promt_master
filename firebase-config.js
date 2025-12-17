import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyB2rnjkUqZ7zsya8A4-NXjuu8_V2kmJRfQ",
  authDomain: "promt-master1234.firebaseapp.com",
  projectId: "promt-master1234",
  storageBucket: "promt-master1234.firebasestorage.app",
  messagingSenderId: "77863236164",
  appId: "1:77863236164:web:754e9cf673890514a68211",
  measurementId: "G-DV5YXT3QC2"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
