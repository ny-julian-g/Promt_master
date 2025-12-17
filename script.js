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

const uploadImageBtn = document.getElementById("uploadImageBtn");
const imageUpload = document.getElementById("imageUpload");
const allImagesBox = document.getElementById("allImages");

let teamCode = null;
let username = "Player" + Math.floor(Math.random() * 9000);

// HOST erstellt Spiel
createGameBtn.onclick = async () => {
  teamCode = Math.floor(100000 + Math.random() * 900000).toString();

  await setDoc(doc(db, "games", teamCode), {
    players: [],
    gameStarted: false,
    images: []  // neu!
  });

  startScreen.classList.add("hidden");
  hostLobby.classList.remove("hidden");
  lobbyCode.textContent = teamCode;

  startLobbyListener();
};

// Spieler tritt Spiel bei
joinGameBtn.onclick = async () => {
  const code = joinCodeInput.value.trim();
  if (!/^\d{6}$/.test(code)) return alert("6-stelligen Code eingeben!");

  const ref = doc(db, "games", code);
  const snap = await getDoc(ref);

  if (!snap.exists()) return alert("Dieses Spiel existiert nicht!");

  teamCode = code;

  await updateDoc(ref, {
    players: arrayUnion(username)
  });

  startScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");
  statusTxt.textContent = "Warte auf den Host...";
};

// Lobby Listener
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

    // Startsignal
    if (data.gameStarted) {
      hostLobby.classList.add("hidden");
      gameScreen.classList.remove("hidden");
      statusTxt.textContent = "Runde gestartet!";
    }

    // Bilder anzeigen
    allImagesBox.innerHTML = "";
    data.images.forEach(img => {
      const el = document.createElement("img");
      el.src = img.base64;
      el.className = "previewImg";
      allImagesBox.appendChild(el);
    });
  });
}

// Host startet Runde
startRoundBtn.onclick = async () => {
  await updateDoc(doc(db, "games", teamCode), {
    gameStarted: true
  });
};

// Bild hochladen → in Base64 umwandeln → Firestore speichern
uploadImageBtn.onclick = async () => {
  if (!imageUpload.files[0]) return alert("Bitte ein Bild auswählen!");

  const reader = new FileReader();

  reader.onload = async () => {
    const base64 = reader.result;

    await updateDoc(doc(db, "games", teamCode), {
      images: arrayUnion({
        user: username,
        base64: base64
      })
    });

    alert("Bild hochgeladen!");
  };

  reader.readAsDataURL(imageUpload.files[0]);
};
