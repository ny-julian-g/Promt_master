import { db } from "./firebase.js";
import {
  doc, setDoc, getDoc, updateDoc, onSnapshot, arrayUnion
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

let gameId = null;
let username = null;
let isHost = false;
let timerInterval = null;

// ELEMENTE
const startScreen = document.getElementById("startScreen");
const hostLobby = document.getElementById("hostLobby");
const gameScreen = document.getElementById("gameScreen");
const votingSection = document.getElementById("votingSection");
const adminResults = document.getElementById("adminResults");

const lobbyCode = document.getElementById("lobbyCode");
const lobbyPlayers = document.getElementById("lobbyPlayers");
const timerTxt = document.getElementById("timerTxt");
const stopRoundBtn = document.getElementById("stopRoundBtn");

// ---------------- CREATE GAME ----------------
document.getElementById("createGameBtn").onclick = async () => {
  isHost = true;
  username = "HOST";
  gameId = Math.floor(100000 + Math.random() * 900000).toString();

  await setDoc(doc(db, "games", gameId), {
    players: [],
    roundActive: false,
    roundEndsAt: null,
    images: {},
    votes: {},
    winner: null
  });

  startScreen.classList.add("hidden");
  hostLobby.classList.remove("hidden");
  lobbyCode.textContent = gameId;

  startSnapshot();
};

// ---------------- JOIN GAME ----------------
document.getElementById("joinGameBtn").onclick = async () => {
  username = document.getElementById("usernameInput").value.trim();
  gameId = document.getElementById("joinCodeInput").value.trim();

  const ref = doc(db, "games", gameId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return alert("Spiel existiert nicht");

  await updateDoc(ref, {
    players: arrayUnion(username)
  });

  startScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");

  startSnapshot();
};

// ---------------- SNAPSHOT ----------------
function startSnapshot() {
  const ref = doc(db, "games", gameId);

  onSnapshot(ref, snap => {
    const data = snap.data();
    if (!data) return;

    // Lobby
    lobbyPlayers.innerHTML = "";
    data.players.forEach(p => {
      const li = document.createElement("li");
      li.textContent = p;
      lobbyPlayers.appendChild(li);
    });

    // Timer
    if (data.roundActive && data.roundEndsAt) {
      startTimer(data.roundEndsAt);
      stopRoundBtn.classList.toggle("hidden", !isHost);
    }

    if (!data.roundActive && Object.keys(data.images).length > 0 && !data.winner) {
      showVoting(data);
    }

    if (data.winner) showResults(data);
  });
}

// ---------------- START ROUND ----------------
document.getElementById("startRoundBtn").onclick = async () => {
  const end = Date.now() + 60000;

  await updateDoc(doc(db, "games", gameId), {
    roundActive: true,
    roundEndsAt: end,
    images: {},
    votes: {},
    winner: null
  });

  gameScreen.classList.remove("hidden");
};

// ---------------- STOP ROUND ----------------
stopRoundBtn.onclick = async () => {
  await updateDoc(doc(db, "games", gameId), {
    roundActive: false
  });
};

// ---------------- TIMER ----------------
function startTimer(endTime) {
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    const left = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
    timerTxt.textContent = `Zeit: ${left}s`;
    if (left === 0) clearInterval(timerInterval);
  }, 1000);
}

// ---------------- UPLOAD ----------------
document.getElementById("uploadImageBtn").onclick = async () => {
  if (isHost) return;
  const file = document.getElementById("imageUpload").files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async () => {
    await updateDoc(doc(db, "games", gameId), {
      [`images.${username}`]: reader.result
    });
  };
  reader.readAsDataURL(file);
};

// ---------------- VOTING ----------------
function showVoting(data) {
  votingSection.classList.remove("hidden");
  const c = document.getElementById("votingContainer");
  c.innerHTML = "";

  Object.entries(data.images).forEach(([name, img]) => {
    if (name === username || isHost) return;

    const div = document.createElement("div");
    div.innerHTML = `
      <img src="${img}" width="200">
      <button onclick="vote('${name}')">${name}</button>
    `;
    c.appendChild(div);
  });
}

window.vote = async (name) => {
  await updateDoc(doc(db, "games", gameId), {
    [`votes.${username}`]: name
  });
};

// ---------------- RESULTS ----------------
function showResults(data) {
  adminResults.classList.remove("hidden");

  const count = {};
  Object.values(data.votes).forEach(v => count[v] = (count[v] || 0) + 1);
  const winner = Object.keys(count).sort((a, b) => count[b] - count[a])[0];

  document.getElementById("winnerName").textContent = winner;
  document.getElementById("winnerImage").src = data.images[winner];
}
