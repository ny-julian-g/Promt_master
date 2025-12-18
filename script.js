import { db } from "./firebase-config.js";
import {
  doc, setDoc, getDoc, updateDoc, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

let currentGameId = null;
let userName = null;
let isHost = false;
let gameTimer = null;
let timeRemaining = 90; // 1.5 minutes in seconds

document.getElementById("createGameBtn").onclick = async () => {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  currentGameId = code;
  isHost = true;

  await setDoc(doc(db, "games", code), {
    players: [],
    roundActive: false,
    uploadedImages: {},
    votes: {},
    winner: null,
    templateImage: null,
    timeLeft: 90
  });

  document.getElementById("startScreen").classList.add("hidden");
  document.getElementById("hostLobby").classList.remove("hidden");
  document.getElementById("lobbyCode").innerText = code;
  
  setupGameListener();
};

// Host image upload handler
document.getElementById("uploadHostImageBtn").onclick = async () => {
  if (!isHost) return;
  
  const fileInput = document.getElementById("hostImageInput");
  const file = fileInput.files[0];
  
  if (!file) {
    alert("Bitte wähle ein Vorlage-Bild aus");
    return;
  }
  
  const reader = new FileReader();
  reader.onload = async (e) => {
    const imageData = e.target.result;
    
    await updateDoc(doc(db, "games", currentGameId), {
      templateImage: imageData
    });
    
    document.getElementById("startRoundBtn").classList.remove("hidden");
    document.getElementById("hostImageUpload").style.opacity = "0.5";
    document.getElementById("uploadHostImageBtn").disabled = true;
    alert("Vorlage-Bild hochgeladen! Du kannst jetzt die Runde starten.");
  };
  
  reader.readAsDataURL(file);
};

document.getElementById("joinGameBtn").onclick = async () => {
  const code = document.getElementById("joinCodeInput").value.trim();
  const name = document.getElementById("usernameInput").value.trim();

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

  currentGameId = code;
  userName = name;

  await updateDoc(ref, {
    players: [...snap.data().players, name]
  });

  document.getElementById("startScreen").classList.add("hidden");
  document.getElementById("gameScreen").classList.remove("hidden");
  document.getElementById("uploadArea").classList.add("hidden");
  document.getElementById("statusTxt").innerText = "Warte, bis der Host die Runde startet...";
  
  setupGameListener();
};

// Timer functions
function startGameTimer() {
  timeRemaining = 90; // Reset to 1.5 minutes
  updateTimerDisplay();
  
  gameTimer = setInterval(() => {
    timeRemaining--;
    updateTimerDisplay();
    
    // Update time in Firebase for all players
    if (isHost) {
      updateDoc(doc(db, "games", currentGameId), {
        timeLeft: timeRemaining
      });
    }
    
    if (timeRemaining <= 0) {
      clearInterval(gameTimer);
      if (isHost) {
        // Auto end round when time is up
        document.getElementById("stopRoundBtn").click();
      }
    }
  }, 1000);
}

function updateTimerDisplay() {
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  
  const timerElement = document.getElementById("timer");
  if (timerElement) {
    timerElement.innerText = `Zeit: ${timeString}`;
    
    // Color changes based on time remaining
    if (timeRemaining <= 30) {
      timerElement.style.color = "#d32f2f"; // Red
    } else if (timeRemaining <= 60) {
      timerElement.style.color = "#ff9800"; // Orange
    } else {
      timerElement.style.color = "#1976d2"; // Blue
    }
  }
}

function stopGameTimer() {
  if (gameTimer) {
    clearInterval(gameTimer);
    gameTimer = null;
  }
}

// Start round button handler
document.getElementById("startRoundBtn").onclick = async () => {
  if (!isHost) return;
  
  await updateDoc(doc(db, "games", currentGameId), {
    roundActive: true,
    uploadedImages: {},
    votes: {},
    winner: null,
    timeLeft: 90
  });
  
  document.getElementById("hostLobby").classList.add("hidden");
  document.getElementById("gameScreen").classList.remove("hidden");
  document.getElementById("statusTxt").innerText = "Runde gestartet! Warte auf Bilder...";
  
  startGameTimer();
};

// Image upload handler
document.getElementById("uploadImageBtn").onclick = async () => {
  if (isHost) {
    alert("Host kann keine Bilder hochladen");
    return;
  }

  const fileInput = document.getElementById("imageUpload");
  const file = fileInput.files[0];
  
  if (!file) {
    alert("Bitte wähle ein Bild aus");
    return;
  }
  
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
  
  stopGameTimer(); // Stop the timer
  
  await updateDoc(doc(db, "games", currentGameId), {
    roundActive: false
  });
  
  document.getElementById("gameScreen").classList.add("hidden");
  document.getElementById("votingSection").classList.remove("hidden");
};

// Function to display all uploaded images for voting
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
    winner: null,
    timeLeft: 90
  });
  
  document.getElementById("adminResults").classList.add("hidden");
  document.getElementById("gameScreen").classList.remove("hidden");
  document.getElementById("statusTxt").innerText = "Neue Runde gestartet! Warte auf Bilder...";
  document.getElementById("stopRoundBtn").classList.add("hidden");
  
  startGameTimer(); // Restart timer
};

// Real-time listener function
function setupGameListener() {
  if (!currentGameId) return;
  
  onSnapshot(doc(db, "games", currentGameId), snap => {
    if (!snap?.exists()) return;
    const gameData = snap.data();
    console.log("LIVE UPDATE:", gameData);
    
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
    
    // Display template image when available
    if (gameData.templateImage) {
      const templateImg = document.getElementById("templateImage");
      const hostTemplateDiv = document.getElementById("hostTemplateImage");
      
      if (templateImg && hostTemplateDiv) {
        templateImg.src = gameData.templateImage;
        hostTemplateDiv.classList.remove("hidden");
      }
    }
    
    // Update timer for all players
    if (gameData.timeLeft !== undefined && !isHost) {
      timeRemaining = gameData.timeLeft;
      updateTimerDisplay();
    }

    // Handle round start for all players
    if (gameData.roundActive) {
      console.log("Round is active - switching to game screen");
      
      // Hide all other screens
      document.getElementById("startScreen").classList.add("hidden");
      document.getElementById("hostLobby").classList.add("hidden");
      document.getElementById("votingSection").classList.add("hidden");
      document.getElementById("adminResults").classList.add("hidden");
      
      // Show game screen for everyone
      document.getElementById("gameScreen").classList.remove("hidden");
      
      // Show template image and instructions for all players
      if (gameData.templateImage) {
        document.getElementById("hostTemplateImage").classList.remove("hidden");
        document.getElementById("templateImage").src = gameData.templateImage;
      }
      
      if (isHost) {
        document.getElementById("statusTxt").innerText = "Runde läuft! Warte auf Bilder der Spieler...";
        document.getElementById("uploadArea").classList.add("hidden");
      } else {
        document.getElementById("statusTxt").innerText = "Erstelle dein Bild basierend auf der Vorlage!";
        // Reset upload area visibility if round restarted
        if (!gameData.uploadedImages || !gameData.uploadedImages[userName]) {
          document.getElementById("uploadArea").classList.remove("hidden");
        }
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
        displayResults(gameData);
      }
    }
  });
}