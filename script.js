import {
  doc, setDoc, getDoc, updateDoc, onSnapshot, arrayUnion
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import { db } from "./firebase-config.js";

// UI Elemente
const createGameBtn = document.getElementById("createGameBtn");
const joinGameBtn = document.getElementById("joinGameBtn");

const usernameInput = document.getElementById("usernameInput");
const joinCodeInput = document.getElementById("joinCodeInput");

const startScreen = document.getElementById("startScreen");
const hostLobby = document.getElementById("hostLobby");
const lobbyPlayers = document.getElementById("lobbyPlayers");
const lobbyCode = document.getElementById("lobbyCode");

const startRoundBtn = document.getElementById("startRoundBtn");
const stopRoundBtn = document.getElementById("stopRoundBtn");

const gameScreen = document.getElementById("gameScreen");
const statusTxt = document.getElementById("statusTxt");

const uploadArea = document.getElementById("uploadArea");
const imageUpload = document.getElementById("imageUpload");
const uploadImageBtn = document.getElementById("uploadImageBtn");

const votingScreen = document.getElementById("votingScreen");
const votingContainer = document.getElementById("votingContainer");

const resultScreen = document.getElementById("resultScreen");
const winnerName = document.getElementById("winnerName");
const winnerImage = document.getElementById("winnerImage");
const resultsTable = document.getElementById("resultsTable");

let teamCode = null;
let username = null;
let isHost = false;

// -------------------------------------------------
// SPIEL ERSTELLEN
// -------------------------------------------------
createGameBtn.onclick = async () => {
  isHost = true;
  username = "Host";

  teamCode = Math.floor(100000 + Math.random() * 900000).toString();

  await setDoc(doc(db, "games", teamCode), {
    players: [],
    gameStarted: false,
    roundActive: false,
    countdown: 600,
    images: {},
    votes: {},
    winner: null
  });

  startScreen.classList.add("hidden");
  hostLobby.classList.remove("hidden");
  lobbyCode.textContent = teamCode;

  startLobbyListener();
};

// -------------------------------------------------
// SPIEL BEITRETEN
// -------------------------------------------------
joinGameBtn.onclick = async () => {
  const code = joinCodeInput.value.trim();
  username = usernameInput.value.trim();

  if (username.length < 2) return alert("Bitte Namen eingeben!");
  if (!/^\d{6}$/.test(code)) return alert("Teamcode muss 6-stellig sein!");

  const ref = doc(db, "games", code);
  const snap = await getDoc(ref);

  if (!snap.exists()) return alert("Team existiert nicht!");

  teamCode = code;

  await updateDoc(ref, { players: arrayUnion(username) });

  startScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");

  startGameListener();
};

// -------------------------------------------------
// LOBBY LISTENER (Host)
// -------------------------------------------------
function startLobbyListener() {
  const ref = doc(db, "games", teamCode);

  onSnapshot(ref, snap => {
    const data = snap.data();
    if (!data) return;

    lobbyPlayers.innerHTML = "";
    data.players.forEach(p => {
      let li = document.createElement("li");
      li.textContent = p;
      lobbyPlayers.appendChild(li);
    });

    if (data.gameStarted) {
      hostLobby.classList.add("hidden");
      gameScreen.classList.remove("hidden");
      startGameListener();
    }
  });
}

// -------------------------------------------------
// SPIEL LISTENER (Host + Spieler)
// -------------------------------------------------
function startGameListener() {
  const ref = doc(db, "games", teamCode);

  onSnapshot(ref, snap => {
    const data = snap.data();
    if (!data) return;

    statusTxt.textContent = data.roundActive
      ? "Runde läuft!"
      : "Warte auf Start...";

    // Host upload deaktiviert
    if (isHost) uploadArea.classList.add("hidden");

    // Voting anzeigen
    if (!data.roundActive && data.gameStarted) {
      if (Object.keys(data.images).length > 0 && !data.winner) {
        showVoting(data);
      }
    }

    // Gewinner anzeigen
    if (data.winner) showResult(data);
  });
}

// -------------------------------------------------
// HOST STARTET RUNDE
// -------------------------------------------------
startRoundBtn.onclick = async () => {
  await updateDoc(doc(db, "games", teamCode), {
    gameStarted: true,
    roundActive: true,
    images: {},
    votes: {},
    winner: null
  });

  gameScreen.classList.remove("hidden");
  stopRoundBtn.classList.remove("hidden");
};

// -------------------------------------------------
// HOST STOPPT RUNDE
// -------------------------------------------------
stopRoundBtn.onclick = async () => {
  await updateDoc(doc(db, "games", teamCode), { roundActive: false });
};

// -------------------------------------------------
// SPIELER LADEN BILD HOCH
// -------------------------------------------------
uploadImageBtn.onclick = async () => {
  if (isHost) return;

  const file = imageUpload.files[0];
  if (!file) return alert("Bitte Bild auswählen!");

  const reader = new FileReader();
  reader.onload = async () => {
    await updateDoc(doc(db, "games", teamCode), {
      [`images.${username}`]: reader.result
    });

    alert("Bild hochgeladen!");
  };
  reader.readAsDataURL(file);
};

// -------------------------------------------------
// VOTING ANZEIGEN
// -------------------------------------------------
function showVoting(data) {
  votingScreen.classList.remove("hidden");
  votingContainer.innerHTML = "";

  if (isHost) return; // Host stimmt nicht ab

  Object.entries(data.images).forEach(([name, img]) => {
    const box = document.createElement("div");

    box.innerHTML = `
      <img src="${img}" class="voteImage">
      <button onclick="vote('${name}')">Abstimmen für ${name}</button>
    `;
    votingContainer.appendChild(box);
  });
}

// -------------------------------------------------
// ABSTIMMEN
// -------------------------------------------------
window.vote = async (name) => {
  await updateDoc(doc(db, "games", teamCode), {
    [`votes.${username}`]: name
  });

  votingContainer.innerHTML = "<p>Danke für deine Stimme ✔</p>";
};

// -------------------------------------------------
// ERGEBNIS
// -------------------------------------------------
function showResult(data) {
  votingScreen.classList.add("hidden");
  resultScreen.classList.remove("hidden");

  const count = {};

  Object.values(data.votes).forEach(v => {
    count[v] = (count[v] || 0) + 1;
  });

  const winner = Object.keys(count).sort((a, b) => count[b] - count[a])[0];

  updateDoc(doc(db, "games", teamCode), { winner });

  winnerName.textContent = winner;
  winnerImage.src = data.images[winner];

  resultsTable.innerHTML = "";

  Object.entries(count).forEach(([name, votes]) => {
    const row = document.createElement("tr");
    row.innerHTML = `<td>${name}</td><td>${votes}</td>`;
    resultsTable.appendChild(row);
  });
}
