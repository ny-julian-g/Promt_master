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
const finishRoundBtn = document.getElementById("finishRoundBtn");

const gameScreen = document.getElementById("gameScreen");
const statusTxt = document.getElementById("statusTxt");

const imageUpload = document.getElementById("imageUpload");
const uploadImageBtn = document.getElementById("uploadImageBtn");
const uploadArea = document.getElementById("uploadArea");

const votingScreen = document.getElementById("votingScreen");
const imagesContainer = document.getElementById("imagesContainer");

const hostResults = document.getElementById("hostResults");
const winnerImage = document.getElementById("winnerImage");

let teamCode = null;
let username = null;
let isHost = false;

// ===================================================
// HOST SPIEL ERSTELLEN
// ===================================================
createGameBtn.onclick = async () => {
  isHost = true;
  username = "Host";

  teamCode = Math.floor(100000 + Math.random() * 900000).toString();

  await setDoc(doc(db, "games", teamCode), {
    players: [],
    gameStarted: false,
    countdown: 600,
    images: {},
    votes: {},
    votingStarted: false,
    winner: null
  });

  startScreen.classList.add("hidden");
  hostLobby.classList.remove("hidden");
  lobbyCode.textContent = teamCode;

  startLobbyListener();
};

// ===================================================
// SPIEL BEITRETEN
// ===================================================
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

// ===================================================
// HOST LOBBY LISTENER
// ===================================================
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

// ===================================================
// SPIEL LIVE-UPDATES
// ===================================================
function startGameListener() {
  const ref = doc(db, "games", teamCode);

  onSnapshot(ref, snap => {
    const data = snap.data();

    statusTxt.textContent = `Countdown: ${data.countdown}s`;

    if (isHost) uploadArea.classList.add("hidden");
    else uploadArea.classList.remove("hidden");

    if (data.votingStarted) {
      gameScreen.classList.add("hidden");
      votingScreen.classList.remove("hidden");
      renderImages(data.images, data.votes);

      if (isHost) showHostResults(data);
    }
  });
}

// ===================================================
// HOST: COUNTDOWN / RUNDE STARTEN
// ===================================================
startRoundBtn.onclick = async () => {
  await updateDoc(doc(db, "games", teamCode), {
    gameStarted: true
  });
  startCountdown();
};

// ===================================================
// HOST: RUNDE MANUELL BEENDEN
// ===================================================
finishRoundBtn.onclick = async () => {
  startVoting();
};

// ===================================================
// COUNTDOWN SYSTEM
// ===================================================
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

    await updateDoc(ref, { countdown: data.countdown - 1 });
  }, 1000);
}

// ===================================================
// BILD HOCHLADEN
// ===================================================
uploadImageBtn.onclick = async () => {
  if (isHost) return;

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

// ===================================================
// VOTING STARTEN
// ===================================================
async function startVoting() {
  await updateDoc(doc(db, "games", teamCode), {
    votingStarted: true
  });
}

// ===================================================
// BILDER RENDERN + VOTE BUTTONS
// ===================================================
function renderImages(images, votes) {
  imagesContainer.innerHTML = "";

  Object.entries(images).forEach(([player, img]) => {
    if (player === "Host") return; // Host kein Bild

    const div = document.createElement("div");
    div.classList.add("imgBox");

    const alreadyVoted = votes && votes[username];

    div.innerHTML = `
      <h3>${player}</h3>
      <img src="${img}"/>
      ${
        alreadyVoted
          ? ""
          : `<button class="voteBtn" data-player="${player}">Vote</button>`
      }
    `;

    imagesContainer.appendChild(div);
  });

  document.querySelectorAll(".voteBtn").forEach(btn => {
    btn.onclick = async () => {
      const chosen = btn.dataset.player;

      await updateDoc(doc(db, "games", teamCode), {
        [`votes.${username}`]: chosen
      });

      alert(`Du hast für ${chosen} gestimmt!`);
    };
  });
}

// ===================================================
// HOST: ZEIGE ERGEBNISSE & GEWINNER
// ===================================================
function showHostResults(gameData) {
  hostResults.innerHTML = "<h2>Ergebnisse</h2>";

  const voteCounts = {};

  Object.values(gameData.votes).forEach(v => {
    voteCounts[v] = (voteCounts[v] || 0) + 1;
  });

  let winner = null;
  let maxVotes = -1;

  Object.entries(voteCounts).forEach(([player, count]) => {
    const p = document.createElement("p");
    p.textContent = `${player}: ${count} Stimmen`;
    hostResults.appendChild(p);

    if (count > maxVotes) {
      maxVotes = count;
      winner = player;
    }
  });

  if (winner) {
    winnerImage.innerHTML = `
      <h2>Gewinner: ${winner}</h2>
      <img src="${gameData.images[winner]}"/>
    `;
  }
}
