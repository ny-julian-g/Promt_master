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

// Start round button handler (host only)
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
  document.getElementById("statusTxt").innerText = "Runde gestartet! Warte auf Bilder...";
};

// Image upload handler
document.getElementById("uploadImageBtn").onclick = async () => {
  const fileInput = document.getElementById("imageUpload");
  const file = fileInput.files[0];
  
  if (!file) return alert("Bitte wähle ein Bild aus");
  
  const reader = new FileReader();
  reader.onload = async (e) => {
    const imageData = e.target.result;
    
    const ref = doc(db, "games", currentGameId);
    const snap = await getDoc(ref);
    const gameData = snap.data();
    
    await updateDoc(ref, {
      uploadedImages: {
        ...gameData.uploadedImages,
        [userName]: imageData
      }
    });
    
    document.getElementById("uploadArea").classList.add("hidden");
    document.getElementById("statusTxt").innerText = "Bild hochgeladen! Warte auf andere Spieler...";
  };
  
  reader.readAsDataURL(file);
};

// Stop round button handler (host only)
document.getElementById("stopRoundBtn").onclick = async () => {
  if (!isHost) return;
  
  await updateDoc(doc(db, "games", currentGameId), {
    roundActive: false
  });
  
  document.getElementById("gameScreen").classList.add("hidden");
  document.getElementById("votingSection").classList.remove("hidden");
};

// Function to display all uploaded images for voting
function displayVotingImages(uploadedImages) {
  const container = document.getElementById("votingContainer");
  container.innerHTML = "";
  
  Object.entries(uploadedImages).forEach(([playerName, imageData]) => {
    const imageDiv = document.createElement("div");
    imageDiv.className = "voting-item";
    
    const img = document.createElement("img");
    img.src = imageData;
    img.alt = `Bild von ${playerName}`;
    img.style.maxWidth = "200px";
    img.style.maxHeight = "200px";
    img.style.margin = "10px";
    img.style.cursor = "pointer";
    img.style.border = "2px solid #ccc";
    img.style.borderRadius = "8px";
    
    const label = document.createElement("p");
    label.innerText = playerName;
    label.style.textAlign = "center";
    label.style.margin = "5px";
    
    // Add click handler for voting
    img.onclick = async () => {
      const ref = doc(db, "games", currentGameId);
      const snap = await getDoc(ref);
      const gameData = snap.data();
      
      await updateDoc(ref, {
        votes: {
          ...gameData.votes,
          [userName]: playerName
        }
      });
      
      // Visual feedback
      document.querySelectorAll('.voting-item img').forEach(i => {
        i.style.border = "2px solid #ccc";
      });
      img.style.border = "3px solid #4CAF50";
    };
    
    imageDiv.appendChild(img);
    imageDiv.appendChild(label);
    container.appendChild(imageDiv);
  });
}

// Function to show results
function displayResults(gameData) {
  if (!isHost) return;
  
  const voteCounts = {};
  Object.values(gameData.votes || {}).forEach(vote => {
    voteCounts[vote] = (voteCounts[vote] || 0) + 1;
  });
  
  const winner = Object.keys(voteCounts).reduce((a, b) => 
    voteCounts[a] > voteCounts[b] ? a : b
  );
  
  document.getElementById("winnerName").innerText = `Gewinner: ${winner}`;
  document.getElementById("winnerImage").src = gameData.uploadedImages[winner];
  
  const table = document.getElementById("resultsTable");
  table.innerHTML = "";
  Object.entries(voteCounts).forEach(([player, votes]) => {
    const row = table.insertRow();
    row.insertCell().innerText = player;
    row.insertCell().innerText = votes;
  });
  
  document.getElementById("votingSection").classList.add("hidden");
  document.getElementById("adminResults").classList.remove("hidden");
}

onSnapshot(
  () => currentGameId ? doc(db, "games", currentGameId) : null,
  snap => {
    if (!snap?.exists()) return;
    const gameData = snap.data();
    console.log("LIVE UPDATE:", gameData);
    
    // Update lobby players
    if (isHost && gameData.players) {
      const playersList = document.getElementById("lobbyPlayers");
      playersList.innerHTML = "";
      gameData.players.forEach(player => {
        const li = document.createElement("li");
        li.innerText = player;
        playersList.appendChild(li);
      });
    }
    
    // Show images when round is active and images are uploaded
    if (gameData.uploadedImages && Object.keys(gameData.uploadedImages).length > 0) {
      displayVotingImages(gameData.uploadedImages);
      
      // Show stop round button for host when images are uploaded
      if (isHost && gameData.roundActive) {
        document.getElementById("stopRoundBtn").classList.remove("hidden");
      }
    }
    
    // Handle voting phase
    if (!gameData.roundActive && Object.keys(gameData.uploadedImages || {}).length > 0) {
      document.getElementById("gameScreen").classList.add("hidden");
      document.getElementById("votingSection").classList.remove("hidden");
      
      // Show results when voting is complete
      const totalPlayers = gameData.players?.length || 0;
      const totalVotes = Object.keys(gameData.votes || {}).length;
      
      if (totalVotes === totalPlayers) {
        displayResults(gameData);
      }
    }
  }
);
