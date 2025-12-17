import { db } from "./firebase-config.js";
import {
  doc,
  setDoc,
  updateDoc,
  getDoc,
  onSnapshot,
  arrayUnion
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ELEMENTE
const createGameBtn = document.getElementById("createGameBtn");
const joinGameBtn = document.getElementById("joinGameBtn");

const usernameInput = document.getElementById("usernameInput");
const joinCodeInput = document.getElementById("joinCodeInput");

const startScreen = document.getElementById("startScreen");
const hostLobby = document.getElementById("hostLobby");
const lobbyCode = document.getElementById("lobbyCode");
const lobbyPlayers = document.getElementById("lobbyPlayers");

const startRoundBtn = document.getElementById("startRoundBtn");
const stopRoundBtn = document.getElementById("stopRoundBtn");

const gameScreen = document.getElementById("gameScreen");
const statusTxt = document.getElementById("statusTxt");

const uploadArea = document.getElementById("uploadArea");
const imageUpload = document.getElementById("imageUpload");
const uploadImageBtn = document.getElementById("uploadImageBtn");

const votingScreen = document.getElementById("votingScreen");
const imagesContainer = document.getElementById("imagesContainer");
const voteStatus = document.getElementById("voteStatus");

const resultScreen = document.getElementById("resultScreen");
const winnerName = document.getElementById("winnerName");
const winnerImage = document.getElementById("winnerImage");
const voteList = document.getElementById("voteList");

let teamCode = null;
let username = null;
let isHost = false;

// -------------------------
// Spiel erstellen
// -------------------------
createGameBtn.onclick = async () => {
  isHost = true;
  username = "Host";
  teamCode = Math.floor(100000 + Math.random() * 900000).toString();

  await setDoc(doc(db, "games", teamCode), {
    players: [],
    gameStarted: false,
    countdown: 600,
    images: {},
    votingStarted: false,
    votes: {}   // NEW
  });

  startScreen.classList.add("hidden");
  hostLobby.classList.remove("hidden");

  lobbyCode.textContent = teamCode;

  startLobbyListener();
};

// -------------------------
// Beitreten
// -------------------------
joinGameBtn.onclick = async () => {
  teamCode = joinCodeInput.value.trim();
  username = usernameInput.value.trim();

  if (username.length < 2) return alert("Name eingeben!");
  if (!/^\d{6}$/.test(teamCode)) return alert("6-stelligen Code eingeben!");

  const ref = doc(db, "games", teamCode);
  const snap = await getDoc(ref);

  if (!snap.exists()) return alert("Team gibt es nicht!");

  await updateDoc(ref, {
    players: arrayUnion(username)
  });

  startScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");

  startGameListener();
};

// -------------------------
// Lobby Listener
// -------------------------
function startLobbyListener() {
  const ref = doc(db, "games", teamCode);

  onSnapshot(ref, (snap) => {
    const data = snap.data();

    lobbyPlayers.innerHTML = "";
    data.players.forEach((p) => {
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

// -------------------------
// Game Listener
// -------------------------
function startGameListener() {
  const ref = doc(db, "games", teamCode);

  onSnapshot(ref, (snap) => {
    const data = snap.data();
    if (!data) return;

    statusTxt.textContent = `Countdown: ${data.countdown}s`;

    if (isHost) {
      uploadArea.classList.add("hidden");
      stopRoundBtn.classList.remove("hidden");
    }

    if (data.votingStarted) {
      gameScreen.classList.add("hidden");
      votingScreen.classList.remove("hidden");
      renderVotingImages(data.images, data.votes);
    }

    if (data.winner) {
      showWinner(data);
    }
  });
}

// -------------------------
// Runde starten (Host)
// -------------------------
startRoundBtn.onclick = async () => {
  await updateDoc(doc(db, "games", teamCode), {
    gameStarted: true
  });
  startCountdown();
};

// STOP BUTTON (Host)
stopRoundBtn.onclick = async () => {
  await updateDoc(doc(db, "games", teamCode), {
    countdown: 0
  });
};

// -------------------------
// Countdown
// -------------------------
function startCountdown() {
  const timer = setInterval(async () => {
    const ref = doc(db, "games", teamCode);
    const snap = await getDoc(ref);
    const data = snap.data();

    if (data.countdown <= 0) {
      clearInterval(timer);
      startVoting();
      return;
    }

    await updateDoc(ref, { countdown: data.countdown - 1 });
  }, 1000);
}

// -------------------------
// Bild hochladen
// -------------------------
uploadImageBtn.onclick = async () => {
  if (isHost) return;

  const file = imageUpload.files[0];
  if (!file) return alert("Bild auswählen!");

  const reader = new FileReader();
  reader.onload = async () => {
    const base64 = reader.result;

    await updateDoc(doc(db, "games", teamCode), {
      [`images.${username}`]: base64
    });

    alert("Hochgeladen!");
  };
  reader.readAsDataURL(file);
};

// -------------------------
// Voting starten
// -------------------------
async function startVoting() {
  await updateDoc(doc(db, "games", teamCode), {
    votingStarted: true
  });
}

// -------------------------
// Voting anzeigen
// -------------------------
function renderVotingImages(images, votes) {
  imagesContainer.innerHTML = "";

  const userHasVoted = Object.values(votes || {}).includes(username);

  if (userHasVoted) {
    voteStatus.classList.remove("hidden");
  }

  Object.entries(images).forEach(([player, img]) => {
    const box = document.createElement("div");

    box.innerHTML = `
      <h3>${player}</h3>
      <img src="${img}">
      <button ${userHasVoted ? "disabled" : ""} data-player="${player}">
        Für dieses Bild abstimmen
      </button>
    `;

    imagesContainer.appendChild(box);
  });

  imagesContainer.querySelectorAll("button").forEach(btn => {
    btn.onclick = () => castVote(btn.dataset.player);
  });
}

// -------------------------
// Vote abgeben
// -------------------------
async function castVote(playerName) {
  const ref = doc(db, "games", teamCode);
  const snap = await getDoc(ref);
  const data = snap.data();

  if (Object.values(data.votes).includes(username)) return;

  await updateDoc(ref, {
    [`votes.${playerName}`]: username
  });
}

// -------------------------
// Ergebnis anzeigen (nur Host)
// -------------------------
function showWinner(data) {
  votingScreen.classList.add("hidden");
  resultScreen.classList.remove("hidden");

  winnerName.textContent = "Gewinner: " + data.winner;
  winnerImage.src = data.images[data.winner];

  voteList.innerHTML = "";
  Object.entries(data.votes).forEach(([player, voter]) => {
    const li = document.createElement("li");
    li.textContent = `${voter} → ${player}`;
    voteList.appendChild(li);
  });
}
