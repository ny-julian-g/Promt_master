import { db } from "./firebase-config.js";
import {
  doc,
  setDoc,
  updateDoc,
  getDoc,
  onSnapshot,
  arrayUnion
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

const resultScreen = document.getElementById("resultScreen");
const winnerText = document.getElementById("winnerText");
const winnerImage = document.getElementById("winnerImage");

let teamCode = null;
let username = null;
let isHost = false;

// ----------------------------
// HOST SPIEL ERSTELLEN
// ----------------------------
createGameBtn.onclick = async () => {
  isHost = true;
  username = "Host";

  teamCode = Math.floor(100000 + Math.random() * 900000).toString();

  await setDoc(doc(db, "games", teamCode), {
    players: [],
    gameStarted: false,
    votingStarted: false,
    countdown: 600,
    images: {},
    votes: {},
  });

  startScreen.classList.add("hidden");
  hostLobby.classList.remove("hidden");
  lobbyCode.textContent = teamCode;

  startLobbyListener();
};

// ----------------------------
// SPIEL BEITRETEN
// ----------------------------
joinGameBtn.onclick = async () => {
  username = usernameInput.value.trim();
  const code = joinCodeInput.value.trim();

  if (username.length < 2) return alert("Bitte Namen eingeben!");
  if (!/^\d{6}$/.test(code)) return alert("6-stelligen Code eingeben!");

  const ref = doc(db, "games", code);
  const snap = await getDoc(ref);

  if (!snap.exists()) return alert("Team existiert nicht!");

  teamCode = code;

  await updateDoc(ref, { players: arrayUnion(username) });

  startScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");

  startGameListener();
};

// ----------------------------
// HOST LOBBY LISTENER
// ----------------------------
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

// ----------------------------
// RUNDE STARTEN
// ----------------------------
startRoundBtn.onclick = async () => {
  await updateDoc(doc(db, "games", teamCode), {
    gameStarted: true
  });

  stopRoundBtn.classList.remove("hidden");
  startCountdown();
};

// ----------------------------
// RUNDE STOPPEN (HOST)
// ----------------------------
stopRoundBtn.onclick = async () => {
  await updateDoc(doc(db, "games", teamCode), {
    votingStarted: true
  });
};

// ----------------------------
// COUNTDOWN SYSTEM
// ----------------------------
function startCountdown() {
  const interval = setInterval(async () => {
    const ref = doc(db, "games", teamCode);
    const snap = await getDoc(ref);
    const data = snap.data();

    if (!data || data.votingStarted) {
      clearInterval(interval);
      return;
    }

    if (data.countdown <= 0) {
      clearInterval(interval);
      await updateDoc(ref, { votingStarted: true });
      return;
    }

    await updateDoc(ref, { countdown: data.countdown - 1 });
  }, 1000);
}

// ----------------------------
// GAME LISTENER FÜR ALLE
// ----------------------------
function startGameListener() {
  const ref = doc(db, "games", teamCode);

  onSnapshot(ref, snap => {
    const data = snap.data();
    statusTxt.textContent = `Countdown: ${data.countdown}s`;

    if (isHost) uploadArea.classList.add("hidden");

    if (data.votingStarted) {
      gameScreen.classList.add("hidden");
      votingScreen.classList.remove("hidden");
      renderVotingImages(data.images, data.votes);
    }
  });
}

// ----------------------------
// BILD HOCHLADEN
// ----------------------------
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

// ----------------------------
// VOTING-ANSICHT MIT BUTTONS
// ----------------------------
function renderVotingImages(images, votes) {
  imagesContainer.innerHTML = "";

  Object.entries(images).forEach(([player, img]) => {
    const div = document.createElement("div");
    div.classList.add("imgBox");

    div.innerHTML = `
      <img src="${img}" />
      <button class="voteBtn" data-player="${player}">
        Für ${player} stimmen
      </button>
    `;

    imagesContainer.appendChild(div);
  });

  document.querySelectorAll(".voteBtn").forEach(btn => {
    btn.onclick = async () => {
      const votedFor = btn.dataset.player;

      const ref = doc(db, "games", teamCode);
      const snap = await getDoc(ref);
      const data = snap.data();

      if (data.votes[username]) return alert("Du hast bereits abgestimmt!");

      await updateDoc(ref, {
        [`votes.${username}`]: votedFor
      });

      alert("Stimme abgegeben!");
    };
  });

  if (isHost) startWinnerListener();
}

// ----------------------------
// HOST SIEHT GEWINNER
// ----------------------------
function startWinnerListener() {
  const ref = doc(db, "games", teamCode);

  onSnapshot(ref, snap => {
    const data = snap.data();

    const counts = {};
    Object.values(data.votes).forEach(v => {
      counts[v] = (counts[v] || 0) + 1;
    });

    let winner = null;
    let maxVotes = 0;

    Object.entries(counts).forEach(([player, c]) => {
      if (c > maxVotes) {
        winner = player;
        maxVotes = c;
      }
    });

    if (winner) {
      votingScreen.classList.add("hidden");
      resultScreen.classList.remove("hidden");

      winnerText.textContent = `Gewinner: ${winner} (${maxVotes} Stimmen)`;
      winnerImage.src = data.images[winner];
    }
  });
}
