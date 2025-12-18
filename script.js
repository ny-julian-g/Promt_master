import { db } from "./firebase-config.js";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

let currentGameId = null;
let userName = null;
let isHost = false;

/* =========================
   SPIEL ERSTELLEN (HOST)
========================= */
document.getElementById("createGameBtn").onclick = async () => {
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  currentGameId = code;
  isHost = true;

  await setDoc(doc(db, "games", code), {
    players: [],
    roundActive: false,
    uploadedImages: {},
    votes: {},
    winner: null
  });

  document.getElementById("startScreen").classList.add("hidden");
  document.getElementById("hostLobby").classList.remove("hidden");
  document.getElementById("lobbyCode").innerText = code;

  // 🔒 Upload für Host deaktivieren
  document.getElementById("uploadArea").classList.add("hidden");
  document.getElementById("uploadImageBtn").disabled = true;
  document.getElementById("imageUpload").disabled = true;
};

/* =========================
   SPIEL BEITRETEN (SPIELER)
========================= */
document.getElementById("joinGameBtn").onclick = async () => {
  const name = document.getElementById("usernameInput").value.trim();
  const code = document.getElementById("joinCodeInput").value.trim();

  if (!name) {
    alert("Bitte gib einen Namen ein");
    return;
  }

  if (!code) {
    alert("Bitte gib den Gruppencode ein");
    return;
  }

  const ref = doc(db, "games", code);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    alert("Spiel existiert nicht");
    return;
  }

  userName = name;
  currentGameId = code;

  await updateDoc(ref, {
    players: [...snap.data().players, name]
  });

  document.getElementById("startScreen").classList.add("hidden");
  document.getElementById("gameScreen").classList.remove("hidden");
  document.getElementById("uploadArea").classList.add("hidden");
  document.getElementById("statusTxt").innerText =
    "Warte, bis der Host die Runde startet...";
};

/* =========================
   RUNDE STARTEN (HOST)
========================= */
document.getElementById("startRoundBtn").onclick = async () => {
  if (!isHost) return;

  await updateDoc(doc(db, "games", currentGameId), {
    roundActive: true,
    uploadedImages: {},
    votes: {},
    winner: null
  });

  document.getElementById("hostLobby").classList.add("hidden");
  document.getElementById("gameScreen").classList.remove("hidden");
};

/* =========================
   BILD HOCHLADEN (SPIELER)
========================= */
document.getElementById("uploadImageBtn").onclick = async () => {
  // 🔒 Extra Sicherheit: Host darf nicht hochladen
  if (isHost || !userName) {
    alert("Admins dürfen keine Bilder hochladen");
    return;
  }

  const file = document.getElementById("imageUpload").files[0];
  if (!file) {
    alert("Bitte wähle ein Bild aus");
    return;
  }

  const reader = new FileReader();
  reader.onload = async (e) => {
    const ref = doc(db, "games", currentGameId);
    const snap = await getDoc(ref);

    await updateDoc(ref, {
      uploadedImages: {
        ...snap.data().uploadedImages,
        [userName]: e.target.result
      }
    });

    document.getElementById("uploadArea").classList.add("hidden");
    document.getElementById("statusTxt").innerText =
      "Bild hochgeladen! Warte auf andere Spieler...";
  };

  reader.readAsDataURL(file);
};

/* =========================
   LIVE UPDATES
========================= */
function startGameListener() {
  const ref = doc(db, "games", currentGameId);

  onSnapshot(ref, snap => {
    if (!snap.exists()) return;
    const gameData = snap.data();

    console.log("LIVE UPDATE:", gameData);

    /* =========================
       SPIELERLISTE (HOST)
    ========================= */
    if (isHost && !gameData.roundActive) {
      const list = document.getElementById("lobbyPlayers");
      list.innerHTML = "";
      gameData.players.forEach(p => {
        const li = document.createElement("li");
        li.innerText = p;
        list.appendChild(li);
      });
    }

    /* =========================
       SPIELERLISTE (IM SPIEL)
    ========================= */
    const gamePlayersList = document.getElementById("gamePlayersList");
    if (gamePlayersList) {
      gamePlayersList.innerHTML = "";
      gameData.players.forEach(player => {
        const li = document.createElement("li");
        li.innerText = player;

        if (player === userName) {
          li.style.fontWeight = "bold";
          li.style.color = "#2c5530";
        }

        gamePlayersList.appendChild(li);
      });
    }

    /* =========================
       RUNDE LÄUFT
    ========================= */
    if (gameData.roundActive) {
      if (isHost) {
        document.getElementById("uploadArea").classList.add("hidden");
        document.getElementById("stopRoundBtn").classList.remove("hidden");

        document.getElementById("statusTxt").innerText =
          "Runde läuft – warte auf Bilder der Spieler.";
      } else if (!gameData.uploadedImages[userName]) {
        document.getElementById("uploadArea").classList.remove("hidden");
        document.getElementById("statusTxt").innerText =
          "Runde läuft! Lade dein Bild hoch.";
      }
    }
  });
}

