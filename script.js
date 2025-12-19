import { db } from "./firebase-config.js";
import {
  doc, setDoc, getDoc, updateDoc, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

let currentGameId = null;
let userName = null;
let isHost = false;
let gameTimer = null;
let timeRemaining = 90; // 1.5 minutes in seconds


// Notification system
function showNotification(message, type = "info") {
  // Remove existing notifications
  const existingNotifications = document.querySelectorAll('.notification');
  existingNotifications.forEach(n => n.remove());
  
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.innerText = message;
  
  // Styling
  notification.style.position = 'fixed';
  notification.style.top = '20px';
  notification.style.right = '20px';
  notification.style.padding = '15px 25px';
  notification.style.borderRadius = '8px';
  notification.style.fontWeight = '600';
  notification.style.fontSize = '16px';
  notification.style.zIndex = '9999';
  notification.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
  notification.style.animation = 'slideIn 0.3s ease-out';
  
  // Type-specific styling
  if (type === 'success') {
    notification.style.background = '#4CAF50';
    notification.style.color = 'white';
  } else if (type === 'error') {
    notification.style.background = '#f44336';
    notification.style.color = 'white';
  } else {
    notification.style.background = '#2196F3';
    notification.style.color = 'white';
  }
  
  // Add animation CSS if not exists
  if (!document.querySelector('#notification-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }
  
  document.body.appendChild(notification);
  
  // Auto remove after 4 seconds
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-in';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 4000);
}

document.getElementById("createGameBtn").onclick = async () => {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  currentGameId = code;
  isHost = true;

  await setDoc(doc(db, "games", code), {
    players: [],
    roundActive: false,
    uploadedImages: {},
    ratings: {}, // New rating system
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

// Host file upload handler (supports all file types)
document.getElementById("uploadHostImageBtn").onclick = async () => {
  if (!isHost) return;
  
  const fileInput = document.getElementById("hostImageInput");
  const file = fileInput.files[0];
  
  if (!file) {
    showNotification("⚠️ Bitte wähle eine Vorlage-Datei aus", "error");
    return;
  }
  
  const fileName = file.name;
  const fileSize = (file.size / (1024 * 1024)).toFixed(2);
  showNotification(`📁 Vorlage "${fileName}" (${fileSize}MB) wird hochgeladen...`, "info");
  
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const fileData = e.target.result;
      
      const templateInfo = {
        data: fileData,
        name: fileName,
        type: file.type,
        size: file.size
      };
      
      await updateDoc(doc(db, "games", currentGameId), {
        templateImage: templateInfo
      });
      
      // Visual feedback for successful upload
      document.getElementById("hostImageUpload").style.opacity = "0.5";
      document.getElementById("uploadHostImageBtn").disabled = true;
      document.getElementById("uploadHostImageBtn").innerText = "✓ Hochgeladen";
      document.getElementById("uploadHostImageBtn").style.background = "#4CAF50";
      
      // Show success notification
      showNotification(`✅ Vorlage "${fileName}" erfolgreich hochgeladen!`, "success");
      
      // Enable start button if not already enabled
      const startBtn = document.getElementById("startRoundBtn");
      startBtn.disabled = false;
      startBtn.style.background = "linear-gradient(135deg, #4CAF50, #45a049)";
      startBtn.innerText = "🚀 Runde starten";
    } catch (error) {
      showNotification("❌ Fehler beim Hochladen der Vorlage", "error");
      console.error("Host upload error:", error);
    }
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

  // Show "Runde beigetreten" message first
  showNotification("🎄 Runde beigetreten! 🎅", "success");
  
  // Show waiting screen instead of game screen
  document.getElementById("startScreen").classList.add("hidden");
  document.getElementById("waitingScreen").classList.remove("hidden");
  
  setupGameListener();
};


// Timer functions
function startGameTimer() {
  timeRemaining = 300; // Reset to 1.5 minutes
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
    timeLeft: 90,
    votingStartTime: null,
    votingTimeLeft: 30
  });
  
  document.getElementById("hostLobby").classList.add("hidden");
  document.getElementById("gameScreen").classList.remove("hidden");
  document.getElementById("statusTxt").innerText = "Runde gestartet! Warte auf Bilder...";
  
  startGameTimer();
};

// File upload handler (supports all file types)
document.getElementById("uploadImageBtn").onclick = async () => {
  if (isHost) {
    showNotification("❌ Host kann keine Dateien hochladen", "error");
    return;
  }

  const fileInput = document.getElementById("imageUpload");
  const file = fileInput.files[0];
  
  if (!file) {
    showNotification("⚠️ Bitte wähle eine Datei aus", "error");
    return;
  }
  
  // Get file type and show appropriate notification
  const fileType = file.type;
  const fileName = file.name;
  const fileSize = (file.size / (1024 * 1024)).toFixed(2); // Size in MB
  
  if (fileType.startsWith('image/')) {
    showNotification(`🖼️ Bild "${fileName}" (${fileSize}MB) wird hochgeladen...`, "info");
  } else if (fileType.startsWith('text/') || fileName.endsWith('.txt') || fileName.endsWith('.md')) {
    showNotification(`📝 Textdatei "${fileName}" (${fileSize}MB) wird hochgeladen...`, "info");
  } else if (fileType.startsWith('video/')) {
    showNotification(`🎬 Video "${fileName}" (${fileSize}MB) wird hochgeladen...`, "info");
  } else if (fileType.startsWith('audio/')) {
    showNotification(`🎵 Audiodatei "${fileName}" (${fileSize}MB) wird hochgeladen...`, "info");
  } else {
    showNotification(`📁 Datei "${fileName}" (${fileSize}MB) wird hochgeladen...`, "info");
  }
  
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const fileData = e.target.result;
      
      const ref = doc(db, "games", currentGameId);
      const snap = await getDoc(ref);
      const gameData = snap.data();
      
      // Store file data with metadata
      const fileInfo = {
        data: fileData,
        name: fileName,
        type: fileType,
        size: file.size
      };
      
      await updateDoc(ref, {
        [`uploadedImages.${userName}`]: fileInfo
      });
      
      // Show success notification
      showNotification(`✅ Datei "${fileName}" erfolgreich hochgeladen! 🎅`, "success");
      
      document.getElementById("uploadArea").classList.add("hidden");
      document.getElementById("statusTxt").innerText = "Datei hochgeladen! Warte auf andere Spieler...";
    } catch (error) {
      showNotification("❌ Fehler beim Hochladen der Datei", "error");
      console.error("Upload error:", error);
    }
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
  
  // Reset host image upload for next round
  resetHostImageUpload();
};

// Create star rating UI
function createStarRating(playerName, currentRating = 0) {
  const ratingDiv = document.createElement("div");
  ratingDiv.className = "star-rating";
  ratingDiv.style.textAlign = "center";
  ratingDiv.style.margin = "10px 0";
  
  for (let i = 1; i <= 5; i++) {
    const star = document.createElement("span");
    star.innerHTML = i <= currentRating ? "⭐" : "☆";
    star.style.fontSize = "24px";
    star.style.cursor = "pointer";
    star.style.margin = "0 2px";
    star.style.transition = "all 0.2s ease";
    
    star.onmouseover = () => {
      // Highlight stars up to this one
      const stars = ratingDiv.querySelectorAll("span");
      stars.forEach((s, index) => {
        s.innerHTML = index < i ? "⭐" : "☆";
      });
    };
    
    star.onmouseout = () => {
      // Reset to current rating
      const stars = ratingDiv.querySelectorAll("span");
      stars.forEach((s, index) => {
        s.innerHTML = index < currentRating ? "⭐" : "☆";
      });
    };
    
    star.onclick = async () => {
      currentRating = i;
      await saveRating(playerName, i);
      
      // Update display
      const stars = ratingDiv.querySelectorAll("span");
      stars.forEach((s, index) => {
        s.innerHTML = index < i ? "⭐" : "☆";
      });
      
      showNotification(`⭐ ${i} Sterne für ${playerName} vergeben!`, "success");
    };
    
    ratingDiv.appendChild(star);
  }
  
  return ratingDiv;
}

// Save rating to database
async function saveRating(playerName, rating) {
  try {
    const ref = doc(db, "games", currentGameId);
    const snap = await getDoc(ref);
    const gameData = snap.data();
    
    const currentRatings = gameData.ratings || {};
    
    // Initialize player ratings if not exists
    if (!currentRatings[playerName]) {
      currentRatings[playerName] = {};
    }
    
    // Save rating from current user
    currentRatings[playerName][userName] = rating;
    
    await updateDoc(ref, {
      ratings: currentRatings
    });
    
  } catch (error) {
    console.error('Error saving rating:', error);
    showNotification("❌ Fehler beim Speichern der Bewertung", "error");
  }
}

// Function to display all uploaded images for voting with ratings
function displayAllImages(uploadedImages, ratings = {}) {
  const container = document.getElementById("votingContainer");
  container.innerHTML = "";
  
  Object.entries(uploadedImages).forEach(([playerName, imageData]) => {
    const imageDiv = document.createElement("div");
    imageDiv.className = "voting-item";
    imageDiv.style.display = "inline-block";
    imageDiv.style.margin = "15px";
    imageDiv.style.padding = "15px";
    imageDiv.style.border = "2px solid #e0e0e0";
    imageDiv.style.borderRadius = "12px";
    imageDiv.style.backgroundColor = "#fafafa";
    imageDiv.style.textAlign = "center";
    imageDiv.style.verticalAlign = "top";
    
    // Handle different file types for display
    let fileDisplayElement;
    if (typeof imageData === 'string') {
      // Old format - assume it's an image
      fileDisplayElement = document.createElement("img");
      fileDisplayElement.src = imageData;
      fileDisplayElement.alt = `Datei von ${playerName}`;
      fileDisplayElement.style.maxWidth = "200px";
      fileDisplayElement.style.maxHeight = "200px";
      fileDisplayElement.style.borderRadius = "8px";
      fileDisplayElement.style.display = "block";
      fileDisplayElement.style.margin = "0 auto 10px auto";
    } else if (imageData.data) {
      // New format with metadata
      if (imageData.type && imageData.type.startsWith('image/')) {
        // Display image
        fileDisplayElement = document.createElement("img");
        fileDisplayElement.src = imageData.data;
        fileDisplayElement.alt = `Bild von ${playerName}`;
        fileDisplayElement.style.maxWidth = "200px";
        fileDisplayElement.style.maxHeight = "200px";
        fileDisplayElement.style.borderRadius = "8px";
        fileDisplayElement.style.display = "block";
        fileDisplayElement.style.margin = "0 auto 10px auto";
      } else {
        // Display file info for non-images
        fileDisplayElement = document.createElement("div");
        fileDisplayElement.style.cssText = "background: #f0f0f0; border: 2px solid #ccc; border-radius: 8px; padding: 15px; margin: 0 auto 10px auto; max-width: 200px; text-align: center;";
        const fileSize = (imageData.size / (1024 * 1024)).toFixed(2);
        fileDisplayElement.innerHTML = `
          <div style="font-size: 40px; margin-bottom: 10px;">📁</div>
          <div style="color: #333; font-size: 12px; font-weight: bold; margin-bottom: 5px;">${imageData.name}</div>
          <div style="color: #666; font-size: 10px;">${fileSize} MB</div>
          <div style="color: #666; font-size: 10px;">${imageData.type || 'Unbekannter Typ'}</div>
        `;
      }
    }
    
    const label = document.createElement("h4");
    label.innerText = playerName;
    label.style.margin = "10px 0";
    label.style.color = "#333";
    
    // Show current user's rating for this player
    const currentUserRating = (ratings[playerName] && ratings[playerName][userName]) || 0;
    
    // Create star rating
    const starRating = createStarRating(playerName, currentUserRating);
    
    // Show average rating
    const avgDiv = document.createElement("div");
    avgDiv.style.fontSize = "14px";
    avgDiv.style.color = "#666";
    avgDiv.style.marginTop = "5px";
    
    if (ratings[playerName]) {
      const ratingValues = Object.values(ratings[playerName]);
      const average = ratingValues.reduce((a, b) => a + b, 0) / ratingValues.length;
      avgDiv.innerHTML = `⭐ ${average.toFixed(1)} (${ratingValues.length} Bewertungen)`;
    } else {
      avgDiv.innerHTML = "Noch keine Bewertungen";
    }
    
    imageDiv.appendChild(fileDisplayElement);
    imageDiv.appendChild(label);
    imageDiv.appendChild(starRating);
    imageDiv.appendChild(avgDiv);
    container.appendChild(imageDiv);
  });
}

// Function to show results with ratings
function displayResults(gameData) {
  if (!isHost) return;
  
  const ratings = gameData.ratings || {};
  const playerScores = {};
  
  // Calculate scores for each player
  Object.keys(gameData.uploadedImages || {}).forEach(playerName => {
    const playerRatings = ratings[playerName] || {};
    const ratingValues = Object.values(playerRatings);
    
    if (ratingValues.length > 0) {
      const average = ratingValues.reduce((a, b) => a + b, 0) / ratingValues.length;
      const totalPoints = ratingValues.reduce((a, b) => a + b, 0);
      
      playerScores[playerName] = {
        average: average,
        count: ratingValues.length,
        total: totalPoints,
        ratings: ratingValues
      };
    } else {
      playerScores[playerName] = {
        average: 0,
        count: 0,
        total: 0,
        ratings: []
      };
    }
  });
  
  // Find winner (highest average, then highest total)
  const winner = Object.keys(playerScores).reduce((a, b) => {
    const scoreA = playerScores[a];
    const scoreB = playerScores[b];
    
    if (scoreA.average !== scoreB.average) {
      return scoreA.average > scoreB.average ? a : b;
    }
    return scoreA.total > scoreB.total ? a : b;
  });
  
  // Display winner
  if (winner && gameData.uploadedImages[winner]) {
    const winnerScore = playerScores[winner];
    document.getElementById("winnerName").innerText = 
      `🏆 Gewinner: ${winner} (⭐ ${winnerScore.average.toFixed(1)} Sterne)`;
    
    const winnerImageElement = document.getElementById("winnerImage");
    const winnerData = gameData.uploadedImages[winner];
    
    // Handle different file types for winner display
    if (typeof winnerData === 'string') {
      winnerImageElement.src = winnerData;
      winnerImageElement.style.display = "block";
    } else if (winnerData.data) {
      if (winnerData.type && winnerData.type.startsWith('image/')) {
        winnerImageElement.src = winnerData.data;
        winnerImageElement.style.display = "block";
      } else {
        winnerImageElement.style.display = "none";
        // Show file info instead
        let winnerFileInfo = document.getElementById("winnerFileInfo");
        if (!winnerFileInfo) {
          winnerFileInfo = document.createElement("div");
          winnerFileInfo.id = "winnerFileInfo";
          winnerFileInfo.style.cssText = "background: #ffffff22; border: 2px solid #ffeb3b; border-radius: 12px; padding: 20px; margin: 20px auto; text-align: center; max-width: 300px;";
          winnerImageElement.parentNode.insertBefore(winnerFileInfo, winnerImageElement.nextSibling);
        }
        const fileSize = (winnerData.size / (1024 * 1024)).toFixed(2);
        winnerFileInfo.innerHTML = `
          <div style="font-size: 60px; margin-bottom: 15px;">🏆📁</div>
          <h3 style="color: #ffeb3b; margin: 10px 0;">Gewinnende Datei</h3>
          <p style="color: #fff; font-size: 16px; margin: 5px 0;"><strong>Name:</strong> ${winnerData.name}</p>
          <p style="color: #fff; font-size: 16px; margin: 5px 0;"><strong>Größe:</strong> ${fileSize} MB</p>
          <p style="color: #fff; font-size: 16px; margin: 5px 0;"><strong>Typ:</strong> ${winnerData.type || 'Unbekannt'}</p>
        `;
      }
    }
  }
  
  // Update results table
  const table = document.getElementById("resultsTable");
  // Keep header, remove only data rows
  while(table.rows.length > 1) {
    table.deleteRow(1);
  }
  
  // Sort players by score (average, then total)
  const sortedPlayers = Object.entries(playerScores).sort(([,a], [,b]) => {
    if (a.average !== b.average) return b.average - a.average;
    return b.total - a.total;
  });
  
  sortedPlayers.forEach(([player, score]) => {
    const row = table.insertRow();
    
    // Player name with trophy for winner
    const nameCell = row.insertCell();
    nameCell.innerText = player === winner ? `🏆 ${player}` : player;
    
    // Average rating
    const avgCell = row.insertCell();
    avgCell.innerText = score.average > 0 ? `⭐ ${score.average.toFixed(1)}` : "0.0";
    
    // Individual ratings
    const ratingsCell = row.insertCell();
    ratingsCell.innerText = score.ratings.length > 0 ? score.ratings.join(", ") : "Keine";
    
    // Total points
    const pointsCell = row.insertCell();
    pointsCell.innerText = score.total;
    
    // Highlight winner row
    if (player === winner) {
      row.style.backgroundColor = "#fff3cd";
      row.style.fontWeight = "bold";
    }
  });
  
  document.getElementById("votingSection").classList.add("hidden");
  document.getElementById("adminResults").classList.remove("hidden");
}

// Function to reset host image upload area
function resetHostImageUpload() {
  if (!isHost) return;
  
  // Reset host image upload area
  document.getElementById("hostImageInput").value = "";
  document.getElementById("hostImageUpload").style.opacity = "1";
  document.getElementById("uploadHostImageBtn").disabled = false;
  document.getElementById("uploadHostImageBtn").innerText = "Vorlage hochladen";
  document.getElementById("uploadHostImageBtn").style.background = "";
  
  // Reset start button
  const startBtn = document.getElementById("startRoundBtn");
  startBtn.disabled = false;
  startBtn.style.background = "";
  startBtn.innerText = "Runde starten";
  
  // Hide template image
  document.getElementById("hostTemplateImage").classList.add("hidden");
  
  showNotification("🔄 Neue Runde! Bitte lade eine neue Vorlage hoch.", "info");
}

// New round button handler
document.getElementById("newRoundBtn").onclick = async () => {
  if (!isHost) return;
  
  // Clear template image from database for new round
  await updateDoc(doc(db, "games", currentGameId), {
    roundActive: false, // Set to false initially for new image upload
    uploadedImages: {},
    votes: {},
    winner: null,
    timeLeft: 90,
    templateImage: null, // Remove template image
    votingStartTime: null,
    votingTimeLeft: 30
  });
  
  document.getElementById("adminResults").classList.add("hidden");
  document.getElementById("hostLobby").classList.remove("hidden"); // Go back to lobby for new image
  
  // Reset host image upload
  resetHostImageUpload();
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
      
      // Update waiting screen players list (for joined players)
      const waitingPlayersList = document.getElementById("waitingPlayersList");
      if (waitingPlayersList) {
        waitingPlayersList.innerHTML = "";
        gameData.players.forEach(player => {
          if (player !== userName) { // Don't show self in "other players" list
            const li = document.createElement("li");
            li.innerText = player;
            waitingPlayersList.appendChild(li);
          }
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
    
    // Show notification when template image is uploaded but don't display it yet
    if (gameData.templateImage && !gameData.roundActive) {
      // Show notification to all players that template is ready
      if (!isHost) {
        showNotification("🎄 Santa hat ein Weihnachtswunder hochgeladen! Warte auf den Start! 🎅", "info");
      }
      
      // Keep template image hidden until round starts
      document.getElementById("hostTemplateImage").classList.add("hidden");
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
      document.getElementById("waitingScreen").classList.add("hidden");
      document.getElementById("votingSection").classList.add("hidden");
      document.getElementById("adminResults").classList.add("hidden");
      
      // Show game screen for everyone
      document.getElementById("gameScreen").classList.remove("hidden");
      
      // Show template file and instructions for all players ONLY when round is active
      if (gameData.templateImage) {
        document.getElementById("hostTemplateImage").classList.remove("hidden");
        const templateElement = document.getElementById("templateImage");
        
        // Handle different file types
        if (typeof gameData.templateImage === 'string') {
          // Old format - just the data
          templateElement.src = gameData.templateImage;
        } else if (gameData.templateImage.data) {
          // New format with metadata
          const template = gameData.templateImage;
          if (template.type && template.type.startsWith('image/')) {
            templateElement.src = template.data;
            templateElement.style.display = "block";
          } else {
            // For non-image files, show file info
            templateElement.style.display = "none";
            let fileInfoDiv = document.getElementById("templateFileInfo");
            if (!fileInfoDiv) {
              fileInfoDiv = document.createElement("div");
              fileInfoDiv.id = "templateFileInfo";
              fileInfoDiv.style.cssText = "background: #ffffff22; border: 2px dashed #ffeb3b; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center;";
              document.getElementById("hostTemplateImage").appendChild(fileInfoDiv);
            }
            const fileSize = (template.size / (1024 * 1024)).toFixed(2);
            fileInfoDiv.innerHTML = `
              <h3 style="color: #ffeb3b; margin: 10px 0;">📁 Vorlage-Datei</h3>
              <p style="color: #fff; font-size: 16px; margin: 5px 0;"><strong>Name:</strong> ${template.name}</p>
              <p style="color: #fff; font-size: 16px; margin: 5px 0;"><strong>Größe:</strong> ${fileSize} MB</p>
              <p style="color: #fff; font-size: 16px; margin: 5px 0;"><strong>Typ:</strong> ${template.type || 'Unbekannt'}</p>
            `;
          }
        }
      }
      
      
      if (isHost) {
        document.getElementById("statusTxt").innerText = "🎅 Runde läuft! Warte auf Bilder der Elfen... 🧝‍♂️";
        document.getElementById("uploadArea").classList.add("hidden");
      } else {
        document.getElementById("statusTxt").innerText = "🎄 Erstelle dein Bild basierend auf Santa's Vorlage! ✨";
        // Reset upload area visibility if round restarted
        if (!gameData.uploadedImages || !gameData.uploadedImages[userName]) {
          document.getElementById("uploadArea").classList.remove("hidden");
        }
      }
    }
    
    // Display all uploaded images in real-time
    if (gameData.uploadedImages && Object.keys(gameData.uploadedImages).length > 0) {
      displayAllImages(gameData.uploadedImages, gameData.ratings || {});
      
      // Show stop round button for host when images are uploaded
      if (isHost && gameData.roundActive) {
        document.getElementById("stopRoundBtn").classList.remove("hidden");
      }
    }
    
    // Handle voting phase
    if (!gameData.roundActive && Object.keys(gameData.uploadedImages || {}).length > 0) {
      document.getElementById("gameScreen").classList.add("hidden");
      document.getElementById("votingSection").classList.remove("hidden");
      
      // Start 30 second voting timer if not already started
      if (!gameData.votingStartTime) {
        if (isHost) {
          updateDoc(doc(db, "games", currentGameId), {
            votingStartTime: Date.now(),
            votingTimeLeft: 30
          });
        }
      }
      
      // Check voting time limit (30 seconds)
      if (gameData.votingStartTime) {
        const timeElapsed = (Date.now() - gameData.votingStartTime) / 1000;
        const timeLeft = Math.max(0, 30 - timeElapsed);
        
        // Update voting timer display
        const votingTimer = document.getElementById("votingTimer");
        if (votingTimer) {
          votingTimer.innerText = `⏰ Zeit: ${Math.ceil(timeLeft)}s`;
          if (timeLeft <= 10) {
            votingTimer.style.color = "#d32f2f";
          }
        }
        
        // Auto-show results after 30 seconds
        if (timeLeft <= 0) {
          displayResults(gameData);
          return;
        }
      }
      
      // Show results when all players have rated (check ratings instead of votes)
      const totalPlayers = gameData.players?.length || 0;
      const ratings = gameData.ratings || {};
      
      // Count how many players have rated at least one image
      const playersWhoRated = new Set();
      Object.values(ratings).forEach(playerRatings => {
        Object.keys(playerRatings).forEach(raterName => {
          playersWhoRated.add(raterName);
        });
      });
      
      if (playersWhoRated.size === totalPlayers) {
        displayResults(gameData);
      }
    }
  });
}