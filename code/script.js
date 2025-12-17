import { storage, db } from "./firebase-config.js";

import {
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-storage.js";

import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc,
  setDoc,
  getDoc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

// DOM Elemente
const startBtn = document.getElementById("startGameBtn");
const waitingMsg = document.getElementById("waitingMsg");
const targetContainer = document.getElementById("target-container");
const uploadContainer = document.getElementById("upload-container");
const timerDisplay = document.getElementById("timer");
const gallery = document.getElementById("gallery");
const voteSection = document.getElementById("vote-section");
const uploadBtn = document.getElementById("uploadBtn");
const fileInput = document.getElementById("fileInput");

// Spielstatus Dokument
const statusRef = doc(db, "game", "status");

let time = 60;

// ---------- SPIEL STARTEN (HOST klickt Button) ----------
startBtn.onclick = async () => {
  await setDoc(statusRef, { gameStarted: true });
  startBtn.style.display = "none";
  waitingMsg.style.display = "none";
  console.log("Spiel gestartet!");
};

// ---------- LISTENER: WARTET AUF SPIELSTART ----------
onSnapshot(statusRef, (snapshot) => {
  const data = snapshot.data();

  if (data && data.gameStarted === true) {
    console.log("Spielstart empfangen!");
    startBtn.style.display = "none";
    waitingMsg.style.display = "none";

    targetContainer.style.display = "block";
    uploadContainer.style.display = "block";
    timerDisplay.style.display = "block";

    startTimer();
  } else {
    // Spiel noch nicht gestartet
    waitingMsg.style.display = "block";
  }
});

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

    const wrapper = document.createElement("div");
    wrapper.style.margin = "20px";

    const img = document.createElement("img");
    img.src = data.url;
    wrapper.appendChild(img);

    const btn = document.createElement("button");
    btn.innerText = "Vote";
    btn.onclick = () => vote(docu.id, data.votes);
    wrapper.appendChild(btn);

    gallery.appendChild(wrapper);
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