import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, doc, setDoc, getDoc, updateDoc, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/* 🔥 Firebase CONFIG */
const firebaseConfig = {
  apiKey: "XXX",
  authDomain: "XXX",
  projectId: "XXX",
  storageBucket: "XXX",
  messagingSenderId: "XXX",
  appId: "XXX"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/* GLOBALS */
let gameId = null;
let userName = null;
let isHost = false;
let timerInterval = null;

/* ELEMENTS */
const startScreen = document.getElementById("startScreen");
const hostLobby = document.getElementById("hostLobby");
const gameScreen = document.getElementById("gameScreen");

const lobbyCode = document.getElementById("lobbyCode");
const playerList = document.getElementById("playerList");
const timerText = document.getElementById("timerText");

const startRoundBtn = document.getElementById("startRoundBtn");
const stopRoundBtn = document.getElementById("stopRoundBtn");

/* -----------------------------------
   CREATE GAME (HOST)
----------------------------------- */
document.getElementById("createGameBtn").onclick = async () => {
  gameId = Math.floor(100000 + Math.random() * 900000).toString();
  isHost = true;

  await setDoc(doc(db, "games", gameId), {
    players: [],
    roundActive: false,
    roundEnd: null,
    images: {},
    votes: {},
    winner: null
  });

  startScreen.classList.add("hidden");
  hostLobby.classList.remove("hidden");
  lobbyCode.textContent = gameId;

  listenGame();
};

/* -----------------------------------
   JOIN GAME
----------------------------------- */
document.getElementById("joinGameBtn").onclick = async () => {
  const code = joinCodeInput.value.trim();
  userName = usernameInput.value.trim();

  const ref = doc(db, "games", code);
  const snap = await getDoc(ref);
  if (!snap.exists()) return alert("Spiel existiert nicht");

  gameId = code;

  await updateDoc(ref, {
    players: [...snap.data().players, userName]
  });

  startScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");

  listenGame();
};

/* -----------------------------------
   START ROUND + TIMER
----------------------------------- */
startRoundBtn.onclick = async () => {
  const endTime = Date.now() + 60000; // 60 Sekunden

  await updateDoc(doc(db, "games", gameId), {
    roundActive: true,
    roundEnd: endTime,
    images: {},
    votes: {},
    winner: null
  });

  stopRoundBtn.classList.remove("hidden");
};

/* -----------------------------------
   STOP ROUND MANUALLY
----------------------------------- */
stopRoundBtn.onclick = async () => {
  await updateDoc(doc(db, "games", gameId), {
    roundActive: false,
    roundEnd: null
  });
};

/* -----------------------------------
   IMAGE UPLOAD
----------------------------------- */
uploadImageBtn.onclick = async () => {
  if (isHost) return;

  const file = imageUpload.files[0];
  if (!file) return alert("Bild wählen");

  const reader = new FileReader();
  reader.onload = async () => {
    await updateDoc(doc(db, "games", gameId), {
      [`images.${userName}`]: reader.result
    });
    gameScreen.innerHTML = "<p>Bild hochgeladen ✔</p>";
  };
  reader.readAsDataURL(file);
};

/* -----------------------------------
   GAME LISTENER
----------------------------------- */
function listenGame() {
  onSnapshot(doc(db, "games", gameId), snap => {
    const data = snap.data();
    if (!data) return;

    /* HOST: Spieler anzeigen */
    if (isHost) {
      playerList.innerHTML = "";
      data.players.forEach(p => {
        const li = document.createElement("li");
        li.textContent = p;
        playerList.appendChild(li);
      });
    }

    /* TIMER */
    if (data.roundActive && data.roundEnd) {
      startTimer(data.roundEnd);
    }

    /* AUTO STOP */
    if (data.roundActive && Date.now() > data.roundEnd) {
      updateDoc(doc(db, "games", gameId), {
        roundActive: false,
        roundEnd: null
      });
    }
  });
}

/* -----------------------------------
   TIMER UI
----------------------------------- */
function startTimer(endTime) {
  clearInterval(timerInterval);

  timerInterval = setInterval(() => {
    const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
    timerText.textContent = `Zeit: ${remaining}s`;

    if (remaining <= 0) {
      clearInterval(timerInterval);
    }
  }, 1000);
}
