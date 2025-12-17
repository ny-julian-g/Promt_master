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
const createGameBtn = document.getElementById("createGameBtn");
const joinGameBtn = document.getElementById("joinGameBtn");
const joinCodeInput = document.getElementById("joinCodeInput");
const usernameInput = document.getElementById("usernameInput");

const startScreen = document.getElementById("startScreen");
const hostLobby = document.getElementById("hostLobby");
const lobbyCode = document.getElementById("lobbyCode");
const lobbyPlayers = document.getElementById("lobbyPlayers");

const startRoundBtn = document.getElementById("startRoundBtn");
const gameScreen = document.getElementById("gameScreen");

const uploadSection = document.getElementById("uploadSection");
const imageUpload = document.getElementById("imageUpload");
const uploadImageBtn = document.getElementById("uploadImageBtn");

const statusTxt = document.getElementById("statusTxt");

let teamCode = null;
let username = null;
let isHost = false;

// =====================================
// HOST SPIEL ERSTELLEN
// =====================================
createGameBtn.onclick = async () => {
  isHost = true;
  teamCode = Math.floor(100000 + Math.random() * 900000).toString();

  await setDoc(doc(db, "games", teamCode), {
    players: [],
    gameStarted: false,
    countdown: 600,
    images: {},
    votingStarted: false
  });

  startScreen.classList.add("hidden");
  hostLobby.classList.remove("hidden");
  lobbyCode.textContent = teamCode;

  startLobbyListener();
};

// =====================================
// SPIEL BEITRETEN
// =====================================
joinGameBtn.onclick = async () => {
  const code = joinCodeInput.value.trim();
  username = usernameInput.value.trim();

  if (!username) return alert("Bitte gib einen Namen ein!");
  if (!/^\d{6}$/.test(code)) return alert("6-stelligen Code eingeben!");

  const ref = doc(db, "games", code);
  const snap = await getDoc(ref);
  if (!snap.exists()) return alert("Dieses Team existiert nicht!");

  teamCode = code;

  // Spieler hinzufügen
  await updateDoc(ref, {
    players: arrayUnion(username)
  });

  isHost = false;

  startScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");
  statusTxt.textContent = "Warte auf den Host...";

  // Host sieht alle, Spieler nicht
  uploadSection.style.display = "block";
};

// =====================================
// LIVE-LOBBY-UPDATES
// =====================================
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

    // Countdown startet → Host und Spieler wechseln Screen
    if (data.gameStarted) {
      if (isHost) {
        hostLobby.classList.add("hidden");
        gameScreen.classList.remove("hidden");
        uploadSection.style.display = "none"; // Host lädt NICHT hoch
      }

      statusTxt.textContent = `Countdown: ${data.countdown}s`;
    }
  });
}

// =====================================
// HOST STARTET RUNDE
// =====================================
startRoundBtn.onclick = async () => {
  await updateDoc(doc(db, "games", teamCode), {
    gameStarted: true
  });

  startCountdown();
};

// =====================================
// 10-MINUTEN COUNTDOWN
// =====================================
function startCountdown() {
  const interval = setInterval(async () => {
    const ref = doc(db, "games", teamCode);
    const snap = await getDoc(ref);
    const data = snap.data();

    if (data.countdown <= 0) {
      clearInterval(interval);
      return;
    }

    await updateDoc(ref, {
      countdown: data.countdown - 1
    });

  }, 1000);
}

// =====================================
// BILD UPLOAD (nur Spieler)
// =====================================
uploadImageBtn.onclick = async () => {
  if (isHost) return; // Host darf NICHT hochladen

  const file = imageUpload.files[0];
  if (!file) return alert("Wähle ein Bild!");

  const reader = new FileReader();
  reader.onload = async () => {
    const base64 = reader.result;

    await updateDoc(doc(db, "games", teamCode), {
      [`images.${username}`]: base64
    });

    alert("Bild hochgeladen!");
  };

  reader.readAsDataURL(file);
};
