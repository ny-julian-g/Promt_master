import { db } from "./firebase-config.js";
import {
    doc,
    setDoc,
    getDoc,
    updateDoc,
    onSnapshot,
    collection,
    query,
    where,
    addDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Elements
const createLobbyBtn = document.getElementById("createLobbyBtn");
const joinLobbyBtn = document.getElementById("joinLobbyBtn");
const joinCodeInput = document.getElementById("joinCodeInput");
const lobbyArea = document.getElementById("lobbyArea");
const lobbyCodeEl = document.getElementById("lobbyCode");
const playerListEl = document.getElementById("playerList");
const startGameBtn = document.getElementById("startGameBtn");
const gameStatus = document.getElementById("gameStatus");

let currentLobby = null;
let currentPlayerId = null;
let isHost = false;

// Random code generator (z.B. "XK92")
function generateCode() {
    return Math.random().toString(36).substring(2, 7).toUpperCase();
}

// HOST → Lobby erstellen
createLobbyBtn.onclick = async () => {
    const code = generateCode();

    await setDoc(doc(db, "lobbies", code), {
        code: code,
        started: false
    });

    isHost = true;
    joinLobby(code);
};

// PLAYER → lobby beitreten
joinLobbyBtn.onclick = () => {
    const code = joinCodeInput.value.trim().toUpperCase();
    if (!code) return alert("Bitte Code eingeben");
    joinLobby(code);
};

async function joinLobby(code) {
    const lobbyRef = doc(db, "lobbies", code);
    const lobbySnap = await getDoc(lobbyRef);

    if (!lobbySnap.exists()) {
        alert("Lobby existiert nicht!");
        return;
    }

    lobbyArea.classList.remove("hidden");
    lobbyCodeEl.textContent = code;
    currentLobby = code;

    // Spieler hinzufügen
    const player = await addDoc(collection(db, "players"), {
        lobby: code,
        name: "Spieler " + Math.floor(Math.random() * 1000)
    });

    currentPlayerId = player.id;

    if (isHost) startGameBtn.classList.remove("hidden");

    listenForPlayers(code);
    listenForGameStart(code);
}

// Echtzeit: Spielerliste aktualisieren
function listenForPlayers(code) {
    const q = query(collection(db, "players"), where("lobby", "==", code));

    onSnapshot(q, (snapshot) => {
        playerListEl.innerHTML = "";
        snapshot.forEach((doc) => {
            const li = document.createElement("li");
            li.textContent = doc.data().name;
            playerListEl.appendChild(li);
        });
    });
}

// HOST → Spiel starten
startGameBtn.onclick = async () => {
    await updateDoc(doc(db, "lobbies", currentLobby), {
        started: true
    });
};

// Spieler hören, ob Spiel gestartet wurde
function listenForGameStart(code) {
    onSnapshot(doc(db, "lobbies", code), (snap) => {
        const data = snap.data();
        if (data.started) {
            gameStatus.textContent = "Das Spiel startet jetzt!";
        }
    });
}
