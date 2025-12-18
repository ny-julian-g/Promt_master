import { db } from "./firebase.js";
import {
  doc, setDoc, getDoc, updateDoc, onSnapshot, arrayUnion
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const $ = id => document.getElementById(id);

let gameId = null;
let username = null;
let isHost = false;

/* ---------- CREATE ---------- */
$("createGameBtn").onclick = async () => {
  isHost = true;
  username = "Host";
  gameId = Math.floor(100000 + Math.random() * 900000).toString();

  await setDoc(doc(db, "games", gameId), {
    players: [],
    roundActive: false,
    images: {},
    votes: {},
    winner: null
  });

  $("startScreen").classList.add("hidden");
  $("hostLobby").classList.remove("hidden");
  $("lobbyCode").innerText = gameId;

  listen();
};

/* ---------- JOIN ---------- */
$("joinGameBtn").onclick = async () => {
  username = $("usernameInput").value.trim();
  gameId = $("joinCodeInput").value.trim();

  const ref = doc(db, "games", gameId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return alert("Spiel nicht gefunden");

  await updateDoc(ref, { players: arrayUnion(username) });

  $("startScreen").classList.add("hidden");
  $("gameScreen").classList.remove("hidden");

  listen();
};

/* ---------- LISTENER ---------- */
function listen() {
  onSnapshot(doc(db, "games", gameId), snap => {
    const d = snap.data();
    if (!d) return;

    $("lobbyPlayers").innerHTML = "";
    d.players.forEach(p => {
      const li = document.createElement("li");
      li.innerText = p;
      $("lobbyPlayers").appendChild(li);
    });

    $("statusTxt").innerText = d.roundActive ? "Runde läuft" : "Warten";

    if (!d.roundActive && Object.keys(d.images).length && !d.winner) {
      showVoting(d);
    }

    if (d.winner) showResult(d);
  });
}

/* ---------- ROUND ---------- */
$("startRoundBtn").onclick = async () => {
  await updateDoc(doc(db, "games", gameId), {
    roundActive: true,
    images: {},
    votes: {},
    winner: null
  });
  $("stopRoundBtn").classList.remove("hidden");
};

$("stopRoundBtn").onclick = async () => {
  await updateDoc(doc(db, "games", gameId), { roundActive: false });
};

/* ---------- UPLOAD ---------- */
$("uploadImageBtn").onclick = async () => {
  const file = $("imageUpload").files[0];
  if (!file) return;

  const r = new FileReader();
  r.onload = async () => {
    await updateDoc(doc(db, "games", gameId), {
      [`images.${username}`]: r.result
    });
    $("uploadImageBtn").disabled = true;
  };
  r.readAsDataURL(file);
};

/* ---------- VOTING ---------- */
function showVoting(data) {
  $("votingSection").classList.remove("hidden");
  $("votingContainer").innerHTML = "";

  if (isHost) return;

  Object.entries(data.images).forEach(([name, img]) => {
    if (name === username) return;

    const div = document.createElement("div");
    div.innerHTML = `
      <img src="${img}" width="200">
      <button>Für ${name}</button>
    `;
    div.querySelector("button").onclick = async () => {
      await updateDoc(doc(db, "games", gameId), {
        [`votes.${username}`]: name
      });
      $("votingContainer").innerHTML = "Danke fürs Abstimmen ✔";
    };
    $("votingContainer").appendChild(div);
  });
}

/* ---------- RESULT ---------- */
function showResult(data) {
  $("resultScreen").classList.remove("hidden");

  const counts = {};
  Object.values(data.votes).forEach(v => counts[v] = (counts[v] || 0) + 1);

  const winner = Object.keys(counts).sort((a,b)=>counts[b]-counts[a])[0];
  updateDoc(doc(db, "games", gameId), { winner });

  $("winnerName").innerText = winner;
  $("winnerImage").src = data.images[winner];
}
