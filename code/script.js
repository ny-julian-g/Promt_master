import { storage, db } from "./firebase-config.js";
import {
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const uploadBtn = document.getElementById("uploadBtn");
const fileInput = document.getElementById("fileInput");
const timerDisplay = document.getElementById("timer");
const gallery = document.getElementById("gallery");
const voteSection = document.getElementById("vote-section");

let time = 60; // 60 Sekunden Spielzeit

// ---------- TIMER ----------
function startTimer() {
  const interval = setInterval(() => {
    timerDisplay.innerText = "Zeit: " + time + "s";
    time--;

    if (time < 0) {
      clearInterval(interval);
      loadImagesForVoting();
    }
  }, 1000);
}

startTimer();

// ---------- BILD HOCHLADEN ----------
uploadBtn.onclick = async () => {
  const file = fileInput.files[0];
  if (!file) return alert("Bitte ein Bild wählen.");

  const fileRef = ref(storage, "uploads/" + Date.now() + "-" + file.name);
  await uploadBytes(fileRef, file);
  const url = await getDownloadURL(fileRef);

  await addDoc(collection(db, "images"), {
    url: url,
    votes: 0
  });

  alert("Bild hochgeladen!");
};

// ---------- BILDER LADEN → VOTING ----------
async function loadImagesForVoting() {
  const snap = await getDocs(collection(db, "images"));
  gallery.innerHTML = "<h2>Alle Bilder</h2>";

  snap.forEach(docu => {
    const data = docu.data();
    const img = document.createElement("img");
    img.src = data.url;
    gallery.appendChild(img);

    const btn = document.createElement("button");
    btn.innerText = "Vote";
    btn.onclick = () => vote(docu.id, data.votes);
    gallery.appendChild(btn);
  });
}

// ---------- VOTING ----------
async function vote(id, currentVotes) {
  await updateDoc(doc(db, "images", id), {
    votes: currentVotes + 1
  });
  alert("Vote abgegeben!");
  showWinner();
}

// ---------- GEWINNER ANZEIGEN ----------
async function showWinner() {
  const snap = await getDocs(collection(db, "images"));
  let best = null;

  snap.forEach(docu => {
    const data = docu.data();
    if (!best || data.votes > best.votes) best = data;
  });

  voteSection.innerHTML = `
    <h2>Gewinner</h2>
    <img src="${best.url}" width="300">
    <p>Votes: ${best.votes}</p>
  `;
}
