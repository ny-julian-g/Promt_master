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
const statusTxt = document.getElementById("statusTxt");

const stopRoundBtn = document.getElementById("stopRoundBtn");

const imageUpload = document.getElementById("imageUpload");
const uploadImageBtn = document.getElementById("uploadImageBtn");
const uploadArea = document.getElementById("uploadArea");

const votingScreen = document.getElementById("votingScreen");
const imagesContainer = document.getElementById("imagesContainer");

let teamCode = null;
let username = null;
let isHost = false;
let countdownInterval = null;

// ==============================
// HOST SPIEL ERSTELLEN
// ==============================
createGameBtn.onclick = async () => {
  isHost = true;
  username = "Host"; // Host lädt kein Bild hoch

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

// ==============================
// SPIEL BEITRETEN
// ==============================
joinGameBtn.onclick = async () => {
  const code = joinCodeInput.value.trim();
  username = usernameInput.value.trim();

  if (username.length < 2) return alert("Bitte Namen eingeben!");
  if (!/^\d{6}$/.test(code)) return alert("6-stelligen Teamcode eingeben!");

  const ref = doc(db, "games", code);
  const snap = await getDoc(ref);

  if (!snap.exists()) return alert("Team existiert nicht!");

  teamCode = code;

  await updateDoc(ref, { players: arrayUnion(username) });

  startScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");

  startGameListener();
};

// ==============================
// HOST: LOBBY LISTENER
// ==============================
function startLobbyListener() {
  const ref = doc(db, "games", teamCode);

  onSnapshot(ref, snap => {
    const data = snap.data();

    lobbyPlayers.innerHTML = "";
    data.players.forEach(p => {
      const li = document.createElement("li");
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

// ==============================
// GAME LISTENER
// ==============================
function startGameListener() {
  const ref = doc(db, "games", teamCode);

  onSnapshot(ref, snap => {
    const data = snap.data();

    statusTxt.textContent = `Countdown: ${data.countdown}s`;

    if (isHost) {
      uploadArea.classList.add("hidden");
      stopRoundBtn.classList.remove("hidden");
    } else {
      stopRoundBtn.classList.add("hidden");
      uploadArea.classList.remove("hidden");
    }

    if (data.votingStarted) {
      gameScreen.classList.add("hidden");
      votingScreen.classList.remove("hidden");
      renderImages(data.images);
    }
  });
}

// ==============================
// HOST STARTET RUNDEN
// ==============================
startRoundBtn.onclick = async () => {
  await updateDoc(doc(db, "games", teamCode), { gameStarted: true });
  startCountdown();
};

// ==============================
// STOP BUTTON
// ==============================
stopRoundBtn.onclick = async () => {
  await updateDoc(doc(db, "games", teamCode), { countdown: 0 });
  await startVoting();
};

// ==============================
// COUNTDOWN
// ==============================
function startCountdown() {
  countdownInterval = setInterval(async () => {
    const ref = doc(db, "games", teamCode);
    const snap = await getDoc(ref);
    const data = snap.data();

    if (data.countdown <= 0) {
      clearInterval(countdownInterval);
      startVoting();
      return;
    }

    await updateDoc(ref, { countdown: data.countdown - 1 });
  }, 1000);
}

// ==============================
// BILD HOCHLADEN
// ==============================
uploadImageBtn.onclick = async () => {
  if (isHost) return;

  const file = imageUpload.files[0];
  if (!file) return alert("Bitte ein Bild auswählen!");

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
// VOTING STARTEN
// ==============================
async function startVoting() {
  await updateDoc(doc(db, "games", teamCode), {
    votingStarted: true
  });
}

// ==============================
// BILDER RENDERN
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
