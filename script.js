import {
  db
} from "./firebase-config.js";

import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  arrayUnion
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";


// HTML Elements
const hostBtn = document.getElementById("hostBtn");
const joinBtn = document.getElementById("joinBtn");
const teamCodeInput = document.getElementById("teamCodeInput");
const hostLobby = document.getElementById("hostLobby");
const hostCode = document.getElementById("hostCode");
const playerList = document.getElementById("playerList");
const startGameBtn = document.getElementById("startGameBtn");
const menu = document.getElementById("menu");
const gameScreen = document.getElementById("gameScreen");
const uploadInput = document.getElementById("uploadInput");
const uploadBtn = document.getElementById("uploadBtn");
const statusText = document.getElementById("statusText");

let currentTeam = null;
let playerName = "Player" + Math.floor(Math.random() * 9000);

// ----------------------------
// HOST erstellt Team
// ----------------------------
hostBtn.onclick = async () => {
  // 6-stelliger Teamcode: z.B. "483920"
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  currentTeam = code;

  // Neues Spiel-Dokument in Firestore erstellen
  await setDoc(doc(db, "games", code), {
    players: [],
    gameStarted: false
  });

  // Menü ausblenden, Lobby anzeigen
  menu.classList.add("hidden");
  hostLobby.classList.remove("hidden");

  // Code anzeigen
  hostCode.textContent = code;

  // Listener starten, damit Spieler live angezeigt werden
  startPlayerListener(code);
};


// ----------------------------
// Spieler tritt Team bei
// ----------------------------
joinBtn.onclick = async () => {
  const code = teamCodeInput.value.trim();

  if (!code) return alert("Teamcode eingeben!");

  const ref = doc(db, "games", code);
  const snap = await getDoc(ref);

  if (!snap.exists()) return alert("Spiel existiert nicht!");

  currentTeam = code;

  await updateDoc(ref, {
    players: arrayUnion(playerName)
  });

  menu.classList.add("hidden");
  gameScreen.classList.remove("hidden");
  statusText.textContent = "Warte auf Spielstart...";
};


// ----------------------------
// HOST sieht Spieler live
// ----------------------------
function startPlayerListener(code) {
  const ref = doc(db, "games", code);

  onSnapshot(ref, snap => {
    const data = snap.data();

    playerList.innerHTML = "";
    data.players.forEach(p => {
      let li = document.createElement("li");
      li.textContent = p;
      playerList.appendChild(li);
    });

    if (data.gameStarted) {
      hostLobby.classList.add("hidden");
      gameScreen.classList.remove("hidden");
    }
  });
}


// ----------------------------
// HOST startet Spiel
// ----------------------------
startGameBtn.onclick = async () => {
  await updateDoc(doc(db, "games", currentTeam), {
    gameStarted: true
  });
};


// ----------------------------
// Spieler Upload
// ----------------------------
uploadBtn.onclick = async () => {
  if (!uploadInput.files[0]) {
    alert("Bitte ein Bild auswählen!");
    return;
  }

  statusText.textContent = "Bild hochgeladen! (Backend Upload kannst du später ergänzen)";
};
