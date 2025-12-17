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
const nameInput = document.getElementById("nameInput");

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

const uploadArea = document.getElementById("uploadArea");
const imageUpload = document.getElementById("imageUpload");
const uploadImageBtn = document.getElementById("uploadImageBtn");

const allImages = document.getElementById("allImages");

let teamCode = null;
let username = null;
let isHost = false;

// ==============================
// HOST SPIEL ERSTELLEN
// ==============================
createGameBtn.onclick = async () => {
  if (nameInput.value.trim() === "")
    return alert("Bitte gib einen Namen ein!");

  username = nameInput.value.trim();
  isHost = true;

  teamCode = Math.floor(100000 + Math.random() * 900000).toString();

  await setDoc(doc(db, "games", teamCode), {
    players: [username],
    gameStarted: false,
    countdown: 600,
    images: {},
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
  if (nameInput.value.trim() === "")
    return alert("Bitte gib einen Namen ein!");

  username = nameInput.value.trim();
  isHost = false;

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

    // Spiel startet → zum Game Screen
    if (data.gameStarted) {
      hostLobby.classList.add("hidden");
      gameScreen.classList.remove("hidden");

      statusTxt.textContent = `Countdown: ${data.countdown}s`;

      // HOST darf kein Bild hochladen
      if (isHost) uploadArea.classList.add("hidden");
      else uploadArea.classList.remove("hidden");
    }

    // Bilder live anzeigen
    renderImages(data.images);

    // Countdown Updaten
    if (data.gameStarted) {
      statusTxt.textContent = `Countdown: ${data.countdown}s`;
    }
  });
}

// ==============================
// HOST STARTET RUNDE
// ==============================
startRoundBtn.onclick = async () => {
  await updateDoc(doc(db, "games", teamCode), {
    gameStarted: true
  });

  startCountdown();
};

// ==============================
// COUNTDOWN LOGIK
// ==============================
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

// ==============================
// BILD HOCHLADEN
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
// BILDER ANZEIGEN
// ==============================
function renderImages(images) {
  allImages.innerHTML = "";

  Object.entries(images).forEach(([player, img]) => {
    const div = document.createElement("div");
    div.classList.add("imgBox");

    div.innerHTML = `
      <h3>${player}</h3>
      <img src="${img}" />
    `;

    allImages.appendChild(div);
  });
}
