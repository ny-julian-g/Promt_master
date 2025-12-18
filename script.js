import { doc, setDoc, getDoc, updateDoc, onSnapshot } 
from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { db } from "./firebase-config.js";

let gameId = null;
let username = null;
let isHost = false;

/* ELEMENTE */
const startScreen = document.getElementById("startScreen");
const hostLobby = document.getElementById("hostLobby");
const gameScreen = document.getElementById("gameScreen");
const votingSection = document.getElementById("votingSection");
const adminResults = document.getElementById("adminResults");

/* CREATE GAME */
document.getElementById("createGameBtn").onclick = async () => {
  gameId = Math.floor(100000 + Math.random() * 900000).toString();
  isHost = true;

  await setDoc(doc(db, "games", gameId), {
    players: [],
    roundActive: false,
    images: {},
    votes: {},
    winner: null
  });

  startScreen.classList.add("hidden");
  hostLobby.classList.remove("hidden");
  document.getElementById("lobbyCode").textContent = gameId;

  listenGame();
};

/* JOIN GAME */
document.getElementById("joinGameBtn").onclick = async () => {
  username = usernameInput.value.trim();
  gameId = joinCodeInput.value.trim();

  const ref = doc(db, "games", gameId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return alert("Spiel existiert nicht");

  await updateDoc(ref, {
    players: [...snap.data().players, username]
  });

  startScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");

  listenGame();
};

/* START ROUND */
document.getElementById("startRoundBtn").onclick = async () => {
  await updateDoc(doc(db, "games", gameId), {
    roundActive: true,
    images: {},
    votes: {},
    winner: null
  });
};

/* STOP ROUND */
document.getElementById("stopRoundBtn").onclick = async () => {
  await updateDoc(doc(db, "games", gameId), { roundActive: false });
};

/* UPLOAD IMAGE */
uploadImageBtn.onclick = async () => {
  const file = imageUpload.files[0];
  if (!file || isHost) return;

  const reader = new FileReader();
  reader.onload = async () => {
    await updateDoc(doc(db, "games", gameId), {
      [`images.${username}`]: reader.result
    });
  };
  reader.readAsDataURL(file);
};

/* LISTENER */
function listenGame() {
  onSnapshot(doc(db, "games", gameId), snap => {
    const data = snap.data();

    if (!data.roundActive && Object.keys(data.images).length && !data.winner) {
      showVoting(data);
    }

    if (data.winner) showResult(data);
  });
}

/* VOTING */
function showVoting(data) {
  votingSection.classList.remove("hidden");
  votingContainer.innerHTML = "";

  if (isHost) return;

  Object.entries(data.images).forEach(([name, img]) => {
    if (name === username) return;

    votingContainer.innerHTML += `
      <div>
        <img src="${img}" class="voteImage">
        <button onclick="vote('${name}')">${name}</button>
      </div>
    `;
  });
}

window.vote = async (name) => {
  await updateDoc(doc(db, "games", gameId), {
    [`votes.${username}`]: name
  });
};

/* RESULT */
function showResult(data) {
  adminResults.classList.remove("hidden");

  const counts = {};
  Object.values(data.votes).forEach(v => counts[v] = (counts[v] || 0) + 1);

  const winner = Object.keys(counts).sort((a,b)=>counts[b]-counts[a])[0];
  updateDoc(doc(db, "games", gameId), { winner });

  winnerName.textContent = winner;
  winnerImage.src = data.images[winner];
}
