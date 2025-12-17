import { db } from "./firebase-config.js";
import {
    doc, getDoc, onSnapshot, updateDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const lobbyId = "default-lobby";
const lobbyRef = doc(db, "lobbies", lobbyId);

let playerName = null;

// Live update der Lobby
onSnapshot(lobbyRef, (snap) => {
    if (!snap.exists()) return;

    const data = snap.data();

    updateList("teamAList", data.teams.teamA);
    updateList("teamBList", data.teams.teamB);

    if (data.roundStarted) {
        window.location.href = "game.html";
    }
});

function updateList(id, players) {
    const ul = document.getElementById(id);
    ul.innerHTML = "";
    players.forEach(p => {
        const li = document.createElement("li");
        li.textContent = p;
        ul.appendChild(li);
    });
}

// Team beitreten
async function joinTeam(team) {
    playerName = document.getElementById("playerName").value;
    if (!playerName) return alert("Bitte Namen eingeben");

    const snap = await getDoc(lobbyRef);
    const data = snap.data();

    const newTeams = { ...data.teams };
    if (!newTeams[team].includes(playerName)) {
        newTeams[team].push(playerName);
    }

    await updateDoc(lobbyRef, { teams: newTeams });
}

document.getElementById("joinTeamA").onclick = () => joinTeam("teamA");
document.getElementById("joinTeamB").onclick = () => joinTeam("teamB");

// Spiel starten
document.getElementById("startGameBtn").onclick = async () => {
    await updateDoc(lobbyRef, { roundStarted: true });
};
