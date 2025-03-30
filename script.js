// Import Firebase modules
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set } from "firebase/database";

// Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAR6Ha8baMX5EPsPVayTno0e0QBRqZrmco",
  authDomain: "metafrog-airdrop.firebaseapp.com",
  databaseURL: "https://metafrog-airdrop-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "metafrog-airdrop",
  storageBucket: "metafrog-airdrop.firebasestorage.app",
  messagingSenderId: "546707737127",
  appId: "1:546707737127:web:67956ae63ffef3ebeddc02",
  measurementId: "G-2Z78VYL739"
};

// Initialize Firebase app
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Form submit handler
document.querySelector(".airdrop-form").addEventListener("submit", function (e) {
    e.preventDefault(); // Prevent form from submitting normally

    // Get input values
    const walletAddress = document.getElementById("wallet").value.trim();
    const xUsername = document.getElementById("xUsername").value.trim();
    const telegramUsername = document.getElementById("telegram").value.trim();
    const tiktokUsername = document.getElementById("tiktok").value.trim();

    // Validate form data
    if (!walletAddress || !xUsername || !telegramUsername) {
        alert("Please fill in all required fields.");
        return;
    }

    // Get current user ID or generate one (you could use a more robust user ID system)
    const userId = generateUserId();

    // Store data in Firebase
    saveAirdropData(userId, walletAddress, xUsername, telegramUsername, tiktokUsername);

    // Show a success message (or handle UI updates)
    alert("Airdrop registration successful! You will be notified when the tasks are completed.");
});

// Generate a random user ID (this can be replaced with a more sophisticated approach if needed)
function generateUserId() {
    return "user_" + Math.floor(Math.random() * 1000000); // Example user ID generator
}

// Save airdrop data to Firebase
function saveAirdropData(userId, walletAddress, xUsername, telegramUsername, tiktokUsername) {
    // Create a reference in Firebase
    const airdropRef = ref(database, 'airdropParticipants/' + userId);

    // Set the data
    set(airdropRef, {
        walletAddress: walletAddress,
        xUsername: xUsername,
        telegramUsername: telegramUsername,
        tiktokUsername: tiktokUsername
    })
    .then(() => {
        console.log("Airdrop data saved successfully.");
    })
    .catch((error) => {
        console.error("Error saving airdrop data:", error);
    });
}

// Handle airdrop step status updates (optional)
function updateAirdropStepStatus(stepNumber, status) {
    const stepElement = document.querySelector(`.step-card:nth-child(${stepNumber})`);
    const statusElement = stepElement.querySelector(".step-status");

    // Update status text and class
    statusElement.textContent = status;
    statusElement.className = `step-status ${status.toLowerCase()}`;
}

// Example of updating steps dynamically
updateAirdropStepStatus(1, "COMPLETED");
updateAirdropStepStatus(2, "ACTIVE");
updateAirdropStepStatus(3, "PENDING");
