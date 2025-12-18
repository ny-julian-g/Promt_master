import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc, onSnapshot }
from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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

let currentGameId = null;
let userName = null;
let isHost = false;

// ------------------- HOST: CREATE GAME -------------------
document.getElementById("createGameBtn").onclick = async () => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    currentGameId = code;
    isHost = true;

    await setDoc(doc(db, "games", code), {
        host: true,
        roundActive: false,
        players: [],
        uploadedImages: {},
        votes: {},
        winner: null
    });

    document.getElementById("startScreen").classList.add("hidden");
    document.getElementById("hostLobby").classList.remove("hidden");

    document.getElementById("lobbyCode").innerText = code;
};

// ------------------- PLAYER: JOIN GAME -------------------
document.getElementById("joinGameBtn").onclick = async () => {
    const code = document.getElementById("joinCodeInput").value.trim();
    const name = document.getElementById("usernameInput").value.trim();

    if (!code || !name) return alert("Bitte Name & Code eingeben!");

    const ref = doc(db, "games", code);
    const snap = await getDoc(ref);
    if (!snap.exists()) return alert("Spiel existiert nicht!");

    currentGameId = code;
    userName = name;

    await updateDoc(ref, {
        players: [...snap.data().players, name]
    });

    document.getElementById("startScreen").classList.add("hidden");
    document.getElementById("gameScreen").classList.remove("hidden");
};

// ------------------- HOST START ROUND -------------------
document.getElementById("startRoundBtn").onclick = async () => {
    await updateDoc(doc(db, "games", currentGameId), {
        roundActive: true,
        uploadedImages: {},
        votes: {},
        winner: null
    });

    document.getElementById("stopRoundBtn").classList.remove("hidden");
};

// ------------------- IMAGE UPLOAD -------------------
document.getElementById("uploadImageBtn").onclick = async () => {
    if (isHost) return alert("Host lädt kein Bild hoch!");

    const file = document.getElementById("imageUpload").files[0];
    if (!file) return alert("Bitte ein Bild auswählen!");

    const reader = new FileReader();
    reader.onload = async () => {
        await updateDoc(doc(db, "games", currentGameId), {
            [`uploadedImages.${userName}`]: reader.result
        });

        document.getElementById("uploadArea").innerHTML =
            "<p>Bild hochgeladen ✔</p>";
    };
    reader.readAsDataURL(file);
};

// ------------------- HOST STOPS ROUND -------------------
document.getElementById("stopRoundBtn").onclick = async () => {
    await updateDoc(doc(db, "games", currentGameId), {
        roundActive: false
    });
};

// ------------------- SNAPSHOT LISTENER -------------------
onSnapshot(doc(db, "games", currentGameId), (snap) => {
    if (!snap.exists()) return;

    const data = snap.data();

    if (!data.roundActive && Object.keys(data.uploadedImages).length > 0 && !data.winner) {
        showVoting(data);
    }

    if (data.winner) {
        showResults(data);
    }
});

// ------------------- SHOW VOTING -------------------
function showVoting(data) {
    document.getElementById("votingSection").classList.remove("hidden");
    const container = document.getElementById("votingContainer");
    container.innerHTML = "";

    Object.entries(data.uploadedImages).forEach(([name, img]) => {
        if (isHost) return; // Admin votet NICHT

        const box = document.createElement("div");
        box.className = "voteBox";

        box.innerHTML = `
            <img src="${img}" class="voteImage">
            <button onclick="voteFor('${name}')">Abstimmen für ${name}</button>
        `;

        container.appendChild(box);
    });
}

// ------------------- VOTE FUNCTION -------------------
window.voteFor = async (name) => {
    await updateDoc(doc(db, "games", currentGameId), {
        [`votes.${userName}`]: name
    });

    document.getElementById("votingSection").innerHTML =
        "<p>Danke fürs Abstimmen ✔</p>";

    checkWinner();
};

async function checkWinner() {
    const ref = doc(db, "games", currentGameId);
    const snap = await getDoc(ref);
    const data = snap.data();

    const counts = {};
    Object.values(data.votes).forEach(v => counts[v] = (counts[v] || 0) + 1);

    const winner = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];

    await updateDoc(ref, {
        winner
    });
}

// ------------------- SHOW RESULTS -------------------
function showResults(data) {
    document.getElementById("adminResults").classList.remove("hidden");

    const winner = data.winner;

    document.getElementById("winnerImage").src = data.uploadedImages[winner];
    document.getElementById("winnerName").innerText = winner;

    const table = document.getElementById("resultsTable");
    table.innerHTML = "";

    const counts = {};
    Object.values(data.votes).forEach(v => counts[v] = (counts[v] || 0) + 1);

    Object.entries(counts).forEach(([p, c]) => {
        const row = document.createElement("tr");
        row.innerHTML = `<td>${p}</td><td>${c}</td>`;
        table.appendChild(row);
    });
}
