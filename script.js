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
  
  // Setup listener for host
  setupGameListener();
};

document.getElementById("joinGameBtn").onclick = async () => {
  const code = document.getElementById("joinCodeInput").value.trim();
  const name = document.getElementById("usernameInput").value.trim();

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
  
  // Setup listener for joined player
  setupGameListener();
};

// Start round button handler
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

// Stop round button handler
document.getElementById("stopRoundBtn").onclick = async () => {
  if (!isHost) return;
  
  await updateDoc(doc(db, "games", currentGameId), {
    roundActive: false
  });
  
  document.getElementById("gameScreen").classList.add("hidden");
  document.getElementById("votingSection").classList.remove("hidden");
};

// Display all images for voting
function displayAllImages(uploadedImages) {
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
    
    // Voting functionality
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

// Show results
function showResults(gameData) {
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
  // Keep header, remove only data rows
  while(table.rows.length > 1) {
    table.deleteRow(1);
  }
  
  Object.entries(voteCounts).forEach(([player, votes]) => {
    const row = table.insertRow();
    row.insertCell().innerText = player;
    row.insertCell().innerText = votes;
  });
  
  document.getElementById("votingSection").classList.add("hidden");
  document.getElementById("adminResults").classList.remove("hidden");
}

// New round button handler
document.getElementById("newRoundBtn").onclick = async () => {
  if (!isHost) return;
  
  await updateDoc(doc(db, "games", currentGameId), {
    roundActive: true,
    uploadedImages: {},
    votes: {},
    winner: null
  });
  
  document.getElementById("adminResults").classList.add("hidden");
  document.getElementById("gameScreen").classList.remove("hidden");
  document.getElementById("statusTxt").innerText = "Neue Runde gestartet! Warte auf Bilder...";
  document.getElementById("stopRoundBtn").classList.add("hidden");
};

// Real-time listener function
function setupGameListener() {
  if (!currentGameId) return;
  
  onSnapshot(doc(db, "games", currentGameId), snap => {
    if (!snap?.exists()) return;
    const gameData = snap.data();
    console.log("LIVE UPDATE - Current User:", userName, "Is Host:", isHost);
    console.log("LIVE UPDATE - Game Data:", gameData);
    console.log("LIVE UPDATE - Round Active:", gameData.roundActive);
    
    // Update all player lists
    if (gameData.players) {
      // Update lobby players list (host view)
      if (isHost) {
        const lobbyPlayersList = document.getElementById("lobbyPlayers");
        lobbyPlayersList.innerHTML = "";
        gameData.players.forEach(player => {
          const li = document.createElement("li");
          li.innerText = player;
          lobbyPlayersList.appendChild(li);
        });
      }
      
      // Update game screen players list
      const gamePlayersList = document.getElementById("gamePlayersList");
      if (gamePlayersList) {
        gamePlayersList.innerHTML = "";
        gameData.players.forEach(player => {
          const li = document.createElement("li");
          li.innerText = player;
          // Highlight current player
          if (player === userName) {
            li.style.fontWeight = "bold";
            li.style.color = "#2c5530";
          }
          gamePlayersList.appendChild(li);
        });
      }
      
      // Update voting screen players list
      const votingPlayersList = document.getElementById("votingPlayersList");
      if (votingPlayersList) {
        votingPlayersList.innerHTML = "";
        gameData.players.forEach(player => {
          const li = document.createElement("li");
          li.innerText = player;
          
          // Show who has voted
          if (gameData.votes && gameData.votes[player]) {
            li.innerText += " ✓";
            li.style.color = "#4CAF50";
          }
          
          // Highlight current player
          if (player === userName) {
            li.style.fontWeight = "bold";
          }
          
          votingPlayersList.appendChild(li);
        });
      }
    }
    
    // Handle round start for all players
    if (gameData.roundActive) {
      console.log("Round is active - switching to game screen for user:", userName);
      
      // Hide all other screens
      document.getElementById("startScreen").classList.add("hidden");
      document.getElementById("hostLobby").classList.add("hidden");
      document.getElementById("votingSection").classList.add("hidden");
      document.getElementById("adminResults").classList.add("hidden");
      
      // Show game screen for everyone
      document.getElementById("gameScreen").classList.remove("hidden");
      
      if (isHost) {
        document.getElementById("statusTxt").innerText = "Runde gestartet! Warte auf Bilder...";
        console.log("Host sees: Runde gestartet!");
      } else {
        document.getElementById("statusTxt").innerText = "Runde läuft! Lade dein Bild hoch.";
        console.log("Player sees: Runde läuft!");
      }
      
      // Reset upload area visibility if round restarted
      if (!gameData.uploadedImages || !gameData.uploadedImages[userName]) {
        document.getElementById("uploadArea").classList.remove("hidden");
        console.log("Upload area shown for user:", userName);
      }
    }
    
    // Display all uploaded images in real-time
    if (gameData.uploadedImages && Object.keys(gameData.uploadedImages).length > 0) {
      displayAllImages(gameData.uploadedImages);
      
      // Show stop round button for host when images are uploaded
      if (isHost && gameData.roundActive) {
        document.getElementById("stopRoundBtn").classList.remove("hidden");
      }
    }
    
    // Handle voting phase
    if (!gameData.roundActive && Object.keys(gameData.uploadedImages || {}).length > 0) {
      document.getElementById("gameScreen").classList.add("hidden");
      document.getElementById("votingSection").classList.remove("hidden");
      
      // Show results when all players have voted
      const totalPlayers = gameData.players?.length || 0;
      const totalVotes = Object.keys(gameData.votes || {}).length;
      
      if (totalVotes === totalPlayers) {
        showResults(gameData);
      }
    }
  });
}
