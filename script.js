import { db } from "./firebase-config.js";
import {
  doc, setDoc, getDoc, updateDoc, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

let currentGameId = null;
let userName = null;
let isHost = false;

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
};

document.getElementById("joinGameBtn").onclick = async () => {
  const code = joinCodeInput.value.trim();
  const name = usernameInput.value.trim();

  const ref = doc(db, "games", code);
  const snap = await getDoc(ref);
  if (!snap.exists()) return alert("Spiel existiert nicht");

  currentGameId = code;
  userName = name;

  await updateDoc(ref, {
    players: [...snap.data().players, name]
  });

  document.getElementById("startScreen").classList.add("hidden");
  document.getElementById("gameScreen").classList.remove("hidden");
};

function showAllImages(data) {
  const section = document.getElementById("allImagesSection");
  const gallery = document.getElementById("imageGallery");
  
  if (Object.keys(data.uploadedImages || {}).length === 0) {
    section.classList.add("hidden");
    return;
  }
  
  section.classList.remove("hidden");
  gallery.innerHTML = "";
  
  Object.entries(data.uploadedImages).forEach(([author, imageData]) => {
    const imageDiv = document.createElement("div");
    imageDiv.style.cssText = "display: inline-block; margin: 10px; padding: 10px; border: 1px solid #ccc; border-radius: 8px; text-align: center;";
    imageDiv.innerHTML = `
      <h4>${author}</h4>
      <img src="${imageData}" width="200" style="border-radius: 4px; max-height: 200px; object-fit: cover;">
    `;
    gallery.appendChild(imageDiv);
  });
}

onSnapshot(
  () => currentGameId ? doc(db, "games", currentGameId) : null,
  snap => {
    if (!snap?.exists()) return;
    const data = snap.data();
    console.log("LIVE UPDATE:", data);
    
    if (data.uploadedImages && Object.keys(data.uploadedImages).length > 0) {
      showAllImages(data);
    }
  }
);
