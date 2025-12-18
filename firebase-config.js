// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyB2rnjkUqZ7zsya8A4-NXjuu8_V2kmJRfQ",
  authDomain: "promt-master1234.firebaseapp.com",
  projectId: "promt-master1234",
  storageBucket: "promt-master1234.firebasestorage.app",
  messagingSenderId: "77863236164",
  appId: "1:77863236164:web:754e9cf673890514a68211",
  measurementId: "G-DV5YXT3QC2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);