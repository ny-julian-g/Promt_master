import { db } from "./firebase-config.js";
import {
  doc, setDoc, getDoc, updateDoc, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { GoogleGenerativeAI } from "@google/generative-ai";

let currentGameId = null;
let userName = null;
let isHost = false;
let gameTimer = null;
let timeRemaining = 90; // 1.5 minutes in seconds

// AI API Integration
const GEMINI_API_KEY = 'AIzaSyB2rnjkUqZ7zsya8A4-NXjuu8_V2kmJRfQ';
const HUGGING_FACE_TOKEN = 'hf_your_token_here'; // Free token from https://huggingface.co/settings/tokens

// Try to initialize Gemini, but handle errors gracefully
let genAI;
let geminiAvailable = false;
try {
  genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  geminiAvailable = true;
} catch (error) {
  console.warn('Gemini initialization failed:', error);
}

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
    
    // Visual feedback for successful upload
    document.getElementById("hostImageUpload").style.opacity = "0.5";
    document.getElementById("uploadHostImageBtn").disabled = true;
    document.getElementById("uploadHostImageBtn").innerText = "✓ Hochgeladen";
    document.getElementById("uploadHostImageBtn").style.background = "#4CAF50";
    
    // Show success notification
    showNotification("✅ Vorlage-Bild erfolgreich hochgeladen!", "success");
    
    // Enable start button if not already enabled
    const startBtn = document.getElementById("startRoundBtn");
    startBtn.disabled = false;
    startBtn.style.background = "linear-gradient(135deg, #4CAF50, #45a049)";
    startBtn.innerText = "🚀 Runde starten";
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
  
  document.getElementById("startScreen").classList.add("hidden");
  document.getElementById("gameScreen").classList.remove("hidden");
  document.getElementById("uploadArea").classList.add("hidden");
  document.getElementById("hostTemplateImage").classList.add("hidden");
  document.getElementById("promptArea").classList.add("hidden");
  
  document.getElementById("statusTxt").innerText = "🎄 Warte bis Santa (Host) die Runde startet... 🎅";
  
  setupGameListener();
};

// Simple prompt enhancement without API (fallback)
function enhancePromptLocally(userPrompt) {
  const enhancements = [
    "highly detailed, photorealistic",
    "professional photography, 4k resolution",
    "beautiful lighting, sharp focus",
    "award-winning photography",
    "digital art, masterpiece",
    "trending on artstation",
    "cinematic lighting",
    "ultra-detailed, high quality",
    "vibrant colors, stunning composition",
    "hyperrealistic, 8k uhd"
  ];
  
  const styles = [
    "photographic style",
    "digital art style", 
    "cinematic style",
    "artistic style",
    "realistic style"
  ];
  
  const randomEnhancement = enhancements[Math.floor(Math.random() * enhancements.length)];
  const randomStyle = styles[Math.floor(Math.random() * styles.length)];
  
  return `${userPrompt}, ${randomEnhancement}, ${randomStyle}`;
}

// Gemini AI Functions
async function enhancePromptWithGemini(userPrompt) {
  if (!userPrompt.trim()) {
    showNotification("Bitte gib zuerst einen Prompt ein!", "error");
    return null;
  }
  
  // Check if Gemini is available
  if (!geminiAvailable) {
    showNotification("🔧 Gemini API nicht verfügbar, verwende lokale Verbesserung...", "info");
    const enhanced = enhancePromptLocally(userPrompt);
    showNotification("✨ Prompt lokal verbessert!", "success");
    return enhanced;
  }
  
  try {
    showNotification("🤖 Gemini verbessert deinen Prompt...", "info");
    
    // Get the model
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    // Create the prompt for enhancement
    const prompt = `Du bist ein Experte für KI-Bildgenerierung. Verbessere folgenden Prompt für bessere, detailliertere und kreativere Ergebnisse. Mache ihn spezifischer, füge Stil-Beschreibungen hinzu und optimiere ihn für KI-Tools wie DALL-E, Midjourney oder Stable Diffusion. Gib nur den verbesserten Prompt zurück, keine Erklärungen:

Ursprünglicher Prompt: "${userPrompt}"`;
    
    // Generate content
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const enhancedPrompt = response.text().trim();
    
    if (enhancedPrompt) {
      showNotification("✨ Prompt mit Gemini verbessert!", "success");
      return enhancedPrompt;
    } else {
      throw new Error('Leere Antwort von Gemini');
    }
  } catch (error) {
    console.error('Gemini API Error:', error);
    
    // Check if it's an API activation error
    if (error.message.includes('SERVICE_DISABLED') || error.message.includes('403')) {
      showNotification("⚠️ Gemini API nicht aktiviert. Verwende lokale Verbesserung...", "info");
      const enhanced = enhancePromptLocally(userPrompt);
      showNotification("✨ Prompt lokal verbessert!", "success");
      return enhanced;
    } else {
      showNotification("❌ Fehler bei Gemini API. Versuche es später erneut.", "error");
      return null;
    }
  }
}

// Prompt Enhancement Button Handler
document.getElementById("enhancePromptBtn").onclick = async () => {
  const promptInput = document.getElementById("promptInput");
  const currentPrompt = promptInput.value.trim();
  
  if (!currentPrompt) {
    showNotification("Bitte gib zuerst einen Prompt ein!", "error");
    promptInput.focus();
    return;
  }
  
  // Disable button during processing
  const enhanceBtn = document.getElementById("enhancePromptBtn");
  enhanceBtn.disabled = true;
  enhanceBtn.innerText = "🤖 Verarbeitung...";
  
  try {
    const enhancedPrompt = await enhancePromptWithGemini(currentPrompt);
    
    if (enhancedPrompt) {
      promptInput.value = enhancedPrompt;
      promptInput.style.height = 'auto';
      promptInput.style.height = promptInput.scrollHeight + 'px'; // Auto-resize
    }
  } finally {
    // Re-enable button
    enhanceBtn.disabled = false;
    enhanceBtn.innerText = "✨ Mit Gemini verbessern";
  }
};

// Clear Prompt Button Handler
document.getElementById("clearPromptBtn").onclick = () => {
  document.getElementById("promptInput").value = "";
  document.getElementById("promptInput").style.height = 'auto';
  showNotification("🗑️ Prompt gelöscht", "info");
};

// AI Model configurations
const AI_MODELS = {
  'stable-diffusion-xl': {
    url: 'https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0',
    name: 'Stable Diffusion XL'
  },
  'stable-diffusion-v1-5': {
    url: 'https://api-inference.huggingface.co/models/runwayml/stable-diffusion-v1-5',
    name: 'Stable Diffusion v1.5'
  },
  'dalle-mini': {
    url: 'https://api-inference.huggingface.co/models/dallinmackay/dalle-mini',
    name: 'DALL-E Mini'
  },
  'midjourney-style': {
    url: 'https://api-inference.huggingface.co/models/prompthero/openjourney',
    name: 'Midjourney Style'
  },
  'anime-diffusion': {
    url: 'https://api-inference.huggingface.co/models/hakurei/waifu-diffusion',
    name: 'Anime Diffusion'
  }
};

// Image generation with Hugging Face
async function generateImageWithAI(prompt, modelKey) {
  const model = AI_MODELS[modelKey];
  
  if (!model) {
    throw new Error('Unbekanntes AI-Modell');
  }
  
  try {
    showNotification(`🎨 ${model.name} generiert Bild...`, "info");
    
    const response = await fetch(model.url, {
      headers: {
        'Authorization': `Bearer ${HUGGING_FACE_TOKEN}`,
        'Content-Type': 'application/json',
      },
      method: 'POST',
      body: JSON.stringify({
        inputs: prompt,
        options: {
          wait_for_model: true
        }
      }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const blob = await response.blob();
    const imageUrl = URL.createObjectURL(blob);
    
    showNotification(`✨ Bild mit ${model.name} erstellt!`, "success");
    return imageUrl;
    
  } catch (error) {
    console.error('Hugging Face API Error:', error);
    
    // Fallback: Generate a placeholder image
    if (HUGGING_FACE_TOKEN === 'hf_your_token_here') {
      showNotification("⚠️ Hugging Face Token nicht konfiguriert. Erstelle Demo-Bild...", "info");
      return generateDemoImage(prompt);
    } else {
      throw error;
    }
  }
}

// Generate demo image as fallback
function generateDemoImage(prompt) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  
  // Create gradient background
  const gradient = ctx.createLinearGradient(0, 0, 512, 512);
  gradient.addColorStop(0, '#667eea');
  gradient.addColorStop(1, '#764ba2');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 512);
  
  // Add text
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('🎨 DEMO IMAGE', 256, 200);
  
  ctx.font = '16px Arial';
  const words = prompt.split(' ');
  let line = '';
  let y = 250;
  
  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i] + ' ';
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;
    
    if (testWidth > 450 && i > 0) {
      ctx.fillText(line, 256, y);
      line = words[i] + ' ';
      y += 30;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, 256, y);
  
  ctx.font = '12px Arial';
  ctx.fillText('(Demo - Configure Hugging Face token for real AI)', 256, 450);
  
  return canvas.toDataURL();
}

// Image Generation Button Handler
document.getElementById("generateImageBtn").onclick = async () => {
  const promptInput = document.getElementById("promptInput");
  const modelSelect = document.getElementById("aiModelSelect");
  const currentPrompt = promptInput.value.trim();
  
  if (!currentPrompt) {
    showNotification("Bitte gib zuerst einen Prompt ein!", "error");
    promptInput.focus();
    return;
  }
  
  // Disable button during generation
  const generateBtn = document.getElementById("generateImageBtn");
  generateBtn.disabled = true;
  generateBtn.innerText = "🎨 Generiere...";
  
  try {
    const selectedModel = modelSelect.value;
    const imageUrl = await generateImageWithAI(currentPrompt, selectedModel);
    
    // Show generated image
    const generatedImg = document.getElementById("generatedImage");
    const generatedArea = document.getElementById("generatedImageArea");
    
    generatedImg.src = imageUrl;
    generatedArea.classList.remove("hidden");
    
    // Scroll to generated image
    generatedArea.scrollIntoView({ behavior: 'smooth' });
    
  } catch (error) {
    console.error('Image generation error:', error);
    showNotification("❌ Fehler bei Bildgenerierung. Versuche es erneut.", "error");
  } finally {
    // Re-enable button
    generateBtn.disabled = false;
    generateBtn.innerText = "🎨 Bild generieren";
  }
};

// Use Generated Image Button Handler
document.getElementById("useGeneratedImageBtn").onclick = () => {
  const generatedImg = document.getElementById("generatedImage");
  
  if (generatedImg.src) {
    // Convert to blob and create file
    fetch(generatedImg.src)
      .then(res => res.blob())
      .then(blob => {
        // Create a File object
        const file = new File([blob], 'generated-image.png', { type: 'image/png' });
        
        // Upload the generated image
        uploadGeneratedImage(file);
      })
      .catch(error => {
        console.error('Error converting image:', error);
        showNotification("❌ Fehler beim Verarbeiten des Bildes.", "error");
      });
  }
};

// Upload generated image function
async function uploadGeneratedImage(file) {
  try {
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
      
      document.getElementById("promptArea").classList.add("hidden");
      document.getElementById("uploadArea").classList.add("hidden");
      document.getElementById("statusTxt").innerText = "KI-Bild hochgeladen! Warte auf andere Spieler...";
      
      showNotification("✅ Generiertes Bild erfolgreich hochgeladen!", "success");
    };
    
    reader.readAsDataURL(file);
  } catch (error) {
    console.error('Upload error:', error);
    showNotification("❌ Fehler beim Hochladen des Bildes.", "error");
  }
}

// Regenerate Button Handler
document.getElementById("regenerateBtn").onclick = () => {
  document.getElementById("generateImageBtn").click();
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
    
    const img = document.createElement("img");
    img.src = imageData;
    img.alt = `Bild von ${playerName}`;
    img.style.maxWidth = "200px";
    img.style.maxHeight = "200px";
    img.style.borderRadius = "8px";
    img.style.display = "block";
    img.style.margin = "0 auto 10px auto";
    
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
    
    imageDiv.appendChild(img);
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
    document.getElementById("winnerImage").src = gameData.uploadedImages[winner];
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
    templateImage: null // Remove template image
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
      document.getElementById("votingSection").classList.add("hidden");
      document.getElementById("adminResults").classList.add("hidden");
      
      // Show game screen for everyone
      document.getElementById("gameScreen").classList.remove("hidden");
      
      // Show template image and instructions for all players ONLY when round is active
      if (gameData.templateImage) {
        document.getElementById("hostTemplateImage").classList.remove("hidden");
        document.getElementById("templateImage").src = gameData.templateImage;
      }
      
      // Show prompt area ONLY when round is active
      document.getElementById("promptArea").classList.remove("hidden");
      
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