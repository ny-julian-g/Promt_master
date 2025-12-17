import { db, storage } from "./firebase-config.js";
import {
    collection, addDoc, onSnapshot, updateDoc, doc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
    ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

let timeLeft = 60;
const timer = document.getElementById("timer");

// Timer
const interval = setInterval(() => {
    timeLeft--;
    timer.textContent = timeLeft;
    if (timeLeft <= 0) {
        clearInterval(interval);
        showGallery();
    }
}, 1000);

// Upload
document.getElementById("uploadBtn").onclick = async () => {
    const file = document.getElementById("imageInput").files[0];
    if (!file) return alert("Bitte Bild auswählen");

    const storageRef = ref(storage, "uploads/" + Date.now());
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);

    await addDoc(collection(db, "images"), {
        url: url,
        votes: 0
    });

    alert("Bild hochgeladen!");
};

function showGallery() {
    const gallery = document.getElementById("gallery");

    onSnapshot(collection(db, "images"), (snap) => {
        gallery.innerHTML = "";

        snap.forEach((docSnap) => {
            const data = docSnap.data();

            const div = document.createElement("div");
            div.innerHTML = `
                <img src="${data.url}" width="150"><br>
                <button data-id="${docSnap.id}">Vote (${data.votes})</button>
            `;
            gallery.appendChild(div);
        });

        document.querySelectorAll("button[data-id]").forEach(btn => {
            btn.onclick = async () => {
                const id = btn.getAttribute("data-id");
                const refDoc = doc(db, "images", id);
                const d = (await getDoc(refDoc)).data();
                await updateDoc(refDoc, { votes: d.votes + 1 });
            };
        });
    });
}
