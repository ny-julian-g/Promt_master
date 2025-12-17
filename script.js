// ------------------- FIREBASE INIT -------------------
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

// ------------------- GLOBAL VARS -------------------
let currentGameId = null;
let userName = null;
let isHost = false;

// ------------------- HOST: GAME CREATE -------------------
document.getElementById("createGameBtn").onclick = async () => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    currentGameId = code;
    isHost = true;

    await setDoc(doc(db, "games", code), {
        host: true,
        roundActive: false,
        uploadedImages: {},
        votes: {},
        winner: null
    });

    document.getElementById("adminView").style.display = "block";
    document.getElementById("joinView").style.display = "none";
    document.getElementById("gameCodeDisplay").innerText = code;
};

// ------------------- PLAYER: JOIN GAME -------------------
document.getElementById("joinGameBtn").onclick = async () => {
    const code = document.getElementById("joinCode").value.trim();
    const name = document.getElementById("playerName").value.trim();

    if (!code || !name) return alert("Code & Name eingeben!");

    const ref = doc(db, "games", code);
    const snap = await getDoc(ref);

    if (!snap.exists()) return alert("Spiel existiert nicht!");

    currentGameId = code;
    userName = name;

    document.getElementById("joinView").style.display = "none";
    document.getElementById("playerView").style.display = "block";
};

// ------------------- HOST: ROUND START -------------------
document.getElementById("startRoundBtn").onclick = async () => {
    const ref = doc(db, "games", currentGameId);

    await updateDoc(ref, {
        roundActive: true,
        uploadedImages: {},
        votes: {},
        winner: null
    });

    document.getElementById("adminWaiting").style.display = "none";
    document.getElementById("adminUploadSection").style.display = "block";
};

// ------------------- PLAYER: IMAGE UPLOAD -------------------
document.getElementById("uploadImageBtn").onclick = async () => {
    const fileInput = document.getElementById("playerImage");
    if (!fileInput.files[0]) return alert("Bild auswählen!");

    const reader = new FileReader();
    reader.onload = async () => {
        await updateDoc(doc(db, "games", currentGameId), {
            [`uploadedImages.${userName}`]: reader.result
        });

        document.getElementById("playerUploadSection").innerHTML =
            "<p>Bild hochgeladen ✔</p>";
    };
    reader.readAsDataURL(fileInput.files[0]);
};

// ------------------- HOST: ROUND STOP (NOCH VOR TIMER) -------------------
document.getElementById("stopRoundBtn").onclick = async () => {
    await updateDoc(doc(db, "games", currentGameId), {
        roundActive: false
    });
};

// ------------------- LIVE UPDATE: WHEN ROUND ENDS → SHOW VOTING -------------------
onSnapshot(doc(db, "games", currentGameId), (snap) => {
    const data = snap.data();
    if (!data) return;

    // ROUND ENDED → SHOW VOTING
    if (!data.roundActive && Object.keys(data.uploadedImages).length > 0) {
        showVoting(data);
    }

    // SHOW RESULT IF AVAILABLE
    if (data.winner) {
        showResults(data);
    }
});

// ------------------- SHOW VOTING -------------------
function showVoting(data) {
    document.getElementById("votingSection").style.display = "block";

    const container = document.getElementById("votingContainer");
    container.innerHTML = "";

    Object.entries(data.uploadedImages).forEach(([name, img]) => {
        
        // ADMIN DARF NICHT VOTEN
        if (isHost) return;

        const box = document.createElement("div");
        box.className = "voteBox";

        box.innerHTML = `
            <img src="${img}" class="voteImage">
            <button class="voteBtn" onclick="voteFor('${name}')">Abstimmen für ${name}</button>
        `;

        container.appendChild(box);
    });
}

// ------------------- VOTE FUNCTION -------------------
window.voteFor = async (name) => {
    if (!currentGameId || !userName) return;

    await updateDoc(doc(db, "games", currentGameId), {
        [`votes.${userName}`]: name
    });

    document.getElementById("votingSection").innerHTML =
        "<p>Danke fürs Abstimmen ✔</p>";
};

// ------------------- SHOW FINAL RESULTS -------------------
function showResults(data) {
    document.getElementById("adminResults").style.display = "block";

    // Count votes
    const voteCounts = {};
    Object.values(data.votes).forEach(v => {
        voteCounts[v] = (voteCounts[v] || 0) + 1;
    });

    // Determine winner
    let winner = Object.keys(voteCounts).sort((a, b) => voteCounts[b] - voteCounts[a])[0];

    // Display winner
    document.getElementById("winnerImage").src = data.uploadedImages[winner];
    document.getElementById("winnerName").innerText = winner;

    // Table for results
    const table = document.getElementById("resultsTable");
    table.innerHTML = "";

    Object.entries(voteCounts).forEach(([player, count]) => {
        let row = document.createElement("tr");
        row.innerHTML = `
            <td>${player}</td>
            <td>${count}</td>
        `;
        table.appendChild(row);
    });
}
