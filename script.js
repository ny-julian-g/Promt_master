import { db } from "./firebase-config.js";
import {
  doc,
  setDoc,
  updateDoc,
  getDoc,
  onSnapshot,
  arrayUnion
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// UI Elemente
const nameScreen = document.getElementById("nameScreen");
const nameInput = document.getElementById("nameInput");
const saveNameBtn = document.getElementById("saveNameBtn");

const startScreen = document.getElementById("startScreen");
const createGameBtn = document.getElementById("createGameBtn");
const joinGameBtn = document.getElementById("joinGameBtn");
const joinCodeInput = document.getElementById("joinCodeInput");

const hostLobby = document.getElementById("hostLobby");
const lobbyCode = document.getElementById("lobbyCode");
const lobbyPlayers = document.getElementById("lobbyPlayers");
const originalUpload = document.getElementById("originalUpload");
const uploadOriginalBtn = document.getElementById("uploadOriginalBtn");
const startRoundBtn = document.getElementById("startRoundBtn");

const gameScreen = document.getElementById("gameScreen");
const statusTxt = document.getElementById("statusTxt");
const imageUpload = document.getElementById("imageUpload");
const uploadImageBtn = document.getElementById("uploadImageBtn");
const uploadArea = document.getElementById("uploadArea");

const votingScreen = document.getElementById("votingScreen");
const votingImages = document.getElementById("votingImages");
const originalBox = document.getElementById("originalBox");

let teamCode = null;
let username = null;
let isHost = false;

// ==============================
// NAME EINGEBEN
// ==============================
saveNameBtn.onclick = () => {
  if (!nameInput.value.trim()) return alert("Name eingeben!");
  username = nameInput.value.trim();
  nameScreen.classList.add("hidden");
  startScreen.classList.remove("hidden");
};

// ==============================
// SPIEL ERSTELLEN (HOST)
// ==============================
createGameBtn.onclick = async () => {
  isHost = true;
  teamCode = Math.floor(100000 + Math.random() * 900000).toString();

  await setDoc(doc(db, "games", teamCode), {
    players: [],
    gameStarted: false,
    countdown: 600,
    images: {},
    originalImage: "",
    votingStarted: false,
    votes: {},
    votingFinished: false
  });

  startScreen.classList.add("hidden");
  hostLobby.classList.remove("hidden");
  lobbyCode.textContent = teamCode;

  startLobbyListener();
};

// ==============================
// SPIEL BEITRETEN
// ==============================
joinGameBtn.onclick = async () => {
  const code = joinCodeInput.value.trim();
  if (!/^\d{6}$/.test(code)) return alert("6-stelligen Code eingeben!");

  teamCode = code;

  const ref = doc(db, "games", code);
  const snap = await getDoc(ref);
  if (!snap.exists()) return alert("Team existiert nicht!");

  await updateDoc(ref, {
    players: arrayUnion(username)
  });

  startScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");
  uploadArea.classList.remove("hidden");

  statusTxt.textContent = "Warte auf Start...";
};

// ==============================
// HOST ORIGINAL-BILD HOCHLADEN
// ==============================
uploadOriginalBtn.onclick = async () => {
  const file = originalUpload.files[0];
  if (!file) return alert("Original auswählen!");

  const reader = new FileReader();
  reader.onload = async () => {
    const base64 = reader.result;

    await updateDoc(doc(db, "games", teamCode), {
      originalImage: base64
    });

    alert("Original hochgeladen!");
  };
  reader.readAsDataURL(file);
};

// ==============================
// LOBBY LISTENER
// ==============================
function startLobbyListener() {
  const ref = doc(db, "games", teamCode);

  onSnapshot(ref, snap => {
    const data = snap.data();

    // Spieler anzeigen
    lobbyPlayers.innerHTML = "";
    data.players.forEach(p => {
      const li = document.createElement("li");
      li.textContent = p;
      lobbyPlayers.appendChild(li);
    });

    // Wenn Runde gestartet -> zu Game-Screen
    if (data.gameStarted) {
      hostLobby.classList.add("hidden");
      gameScreen.classList.remove("hidden");
      uploadArea.classList.toggle("hidden", isHost);
      statusTxt.textContent = `Countdown: ${data.countdown}s`;
    }

    // Voting starten
    if (data.votingStarted) {
      gameScreen.classList.add("hidden");
      votingScreen.classList.remove("hidden");
      renderVotingScreen(data);
    }
  });
}

// ==============================
// HOST STARTET RUNDE
// ==============================
startRoundBtn.onclick = async () => {
  if (!originalUpload.files[0]) {
    return alert("Bitte Originalbild hochladen!");
  }

  await updateDoc(doc(db, "games", teamCode), {
    gameStarted: true
  });

  startCountdown();
};

// ==============================
// COUNTDOWN
// ==============================
function startCountdown() {
  const interval = setInterval(async () => {
    const ref = doc(db, "games", teamCode);
    const snap = await getDoc(ref);
    const data = snap.data();

    if (data.countdown <= 0) {
      clearInterval(interval);
      startVoting();
      return;
    }

    await updateDoc(ref, {
      countdown: data.countdown - 1
    });
  }, 1000);
}

// ==============================
// SPIELER BILD HOCHLADEN
// ==============================
uploadImageBtn.onclick = async () => {
  const file = imageUpload.files[0];
  if (!file) return alert("Bild auswählen!");

  const reader = new FileReader();
  reader.onload = async () => {
    await updateDoc(doc(db, "games", teamCode), {
      [`images.${username}`]: reader.result
    });
    alert("Bild hochgeladen!");
  };

  reader.readAsDataURL(file);
};

// ==============================
// VOTING START
// ==============================
async function startVoting() {
  await updateDoc(doc(db, "games", teamCode), {
    votingStarted: true
  });
}

// ==============================
// VOTING SCREEN RENDER
// ==============================
function renderVotingScreen(data) {
  // Original
  originalBox.innerHTML = `
    <img src="${data.originalImage}" class="originalImg">
  `;

  // Einsendungen
  votingImages.innerHTML = "";

  Object.entries(data.images).forEach(([name, img]) => {
    const box = document.createElement("div");
    box.classList.add("voteBox");

    const btnDisabled = data.votes[username] ? "disabled" : "";

    box.innerHTML = `
      <h3>${name}</h3>
      <img src="${img}">
      <button ${btnDisabled} onclick="window.vote('${name}')">Stimme geben</button>
    `;

    votingImages.appendChild(box);
  });
}

// ==============================
// VOTE FUNKTION GLOBAL
// ==============================
window.vote = async (playerName) => {
  const ref = doc(db, "games", teamCode);
  const snap = await getDoc(ref);
  const data = snap.data();

  if (data.votes[username]) {
    return alert("Du hast bereits abgestimmt!");
  }

  await updateDoc(ref, {
    [`votes.${username}`]: playerName
  });

  alert("Danke für deine Stimme!");
};
