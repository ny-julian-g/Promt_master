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

const startScreen = document.getElementById("startScreen");
const hostLobby = document.getElementById("hostLobby");
const lobbyCode = document.getElementById("lobbyCode");
const lobbyPlayers = document.getElementById("lobbyPlayers");

const startRoundBtn = document.getElementById("startRoundBtn");
const gameScreen = document.getElementById("gameScreen");
const statusTxt = document.getElementById("statusTxt");

const imageUpload = document.getElementById("imageUpload");
const uploadImageBtn = document.getElementById("uploadImageBtn");

const votingScreen = document.getElementById("votingScreen");
const imagesContainer = document.getElementById("imagesContainer");

let teamCode = null;
let username = "Player" + Math.floor(Math.random() * 9000);

// ==============================
// HOST SPIEL ERSTELLEN
// ==============================
createGameBtn.onclick = async () => {
  teamCode = Math.floor(100000 + Math.random() * 900000).toString();

  await setDoc(doc(db, "games", teamCode), {
    players: [],
    gameStarted: false,
    countdown: 600, // 10 Minuten
    images: {},
    votingStarted: false
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

  const ref = doc(db, "games", code);
  const snap = await getDoc(ref);
  if (!snap.exists()) return alert("Team existiert nicht!");

  teamCode = code;

  await updateDoc(ref, {
    players: arrayUnion(username)
  });

  startScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");
  statusTxt.textContent = "Warte auf Host...";
};

// ==============================
// LOBBY LIVE-UPDATES
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

    if (data.gameStarted) {
      hostLobby.classList.add("hidden");
      gameScreen.classList.remove("hidden");

      statusTxt.textContent = `Countdown: ${data.countdown}s`;
    }

    if (data.votingStarted) {
      gameScreen.classList.add("hidden");
      votingScreen.classList.remove("hidden");
      renderImages(data.images);
    }

    // LIVE Countdown auch bei Spielern aktualisieren
    if (data.gameStarted && !data.votingStarted) {
      statusTxt.textContent = `Countdown: ${data.countdown}s`;
    }
  });
}

// ==============================
// HOST STARTET RUNDE
// ==============================
startRoundBtn.onclick = async () => {
  const ref = doc(db, "games", teamCode);

  await updateDoc(ref, {
    gameStarted: true
  });

  startCountdown();
};

// ==============================
// COUNTDOWN 10 MINUTEN
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
// BILD HOCHLADEN (BASE64)
// ==============================
uploadImageBtn.onclick = async () => {
  const file = imageUpload.files[0];
  if (!file) return alert("Bitte ein Bild auswählen!");

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

// ==============================
// VOTING STARTEN
// ==============================
async function startVoting() {
  await updateDoc(doc(db, "games", teamCode), {
    votingStarted: true
  });
}

// ==============================
// BILDER ANZEIGEN
// ==============================
function renderImages(images) {
  imagesContainer.innerHTML = "";

  Object.entries(images).forEach(([player, img]) => {
    const div = document.createElement("div");
    div.classList.add("imgBox");

    div.innerHTML = `
      <h3>${player}</h3>
      <img src="${img}" />
    `;

    imagesContainer.appendChild(div);
  });
}
