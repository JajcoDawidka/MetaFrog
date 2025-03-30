// Importowanie funkcji Firebase
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getDatabase, ref, set, get, child } from "firebase/database";

// Konfiguracja Firebase
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

// Inicjalizacja Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getDatabase(app);

// Funkcja aktualizująca status etapów airdropu w bazie danych
function updateStepStatus(stepId, status) {
    const statusRef = ref(db, 'airdrop/steps/' + stepId);
    set(statusRef, {
        status: status
    });
}

// Funkcja pobierająca statusy etapów z bazy danych
function fetchStepStatuses() {
    const stepsRef = ref(db, 'airdrop/steps');
    get(stepsRef).then((snapshot) => {
        if (snapshot.exists()) {
            const stepsData = snapshot.val();
            // Zaktualizuj statusy na stronie
            for (const [stepId, stepData] of Object.entries(stepsData)) {
                const statusElement = document.getElementById('status' + stepId);
                if (statusElement) {
                    statusElement.textContent = stepData.status;
                    if (stepData.status === "COMPLETED") {
                        statusElement.classList.add("completed");
                    } else if (stepData.status === "ACTIVE") {
                        statusElement.classList.add("active");
                    } else {
                        statusElement.classList.add("pending");
                    }
                }
            }
        } else {
            console.log("No data available");
        }
    }).catch((error) => {
        console.error("Error getting document:", error);
    });
}

// Funkcja do obsługi formularza airdropu
document.getElementById("airdropForm").addEventListener("submit", function(event) {
    event.preventDefault();

    const wallet = document.getElementById("wallet").value;
    const xUsername = document.getElementById("xUsername").value;
    const telegram = document.getElementById("telegram").value;
    const tiktok = document.getElementById("tiktok").value;

    if (!wallet || !xUsername || !telegram) {
        alert("Please fill in all required fields.");
        return;
    }

    // Zapisz dane użytkownika do Firebase
    const airdropRef = ref(db, 'airdrop/participants/' + wallet);
    set(airdropRef, {
        wallet: wallet,
        xUsername: xUsername,
        telegram: telegram,
        tiktok: tiktok || "",  // TikTok jest opcjonalny
        status: "REGISTERED"
    }).then(() => {
        alert("Registration successful. You can now complete the tasks.");
        updateStepStatus(1, "COMPLETED");  // Aktualizujemy pierwszy krok na "COMPLETED"
    }).catch((error) => {
        console.error("Error writing document: ", error);
    });
});

// Funkcja do aktualizacji statusu zadania
function completeTask(taskId) {
    // Zaktualizuj status zadania w Firebase
    const taskRef = ref(db, 'airdrop/tasks/' + taskId);
    set(taskRef, {
        status: "COMPLETED"
    }).then(() => {
        alert("Task completed successfully!");
        updateStepStatus(2, "ACTIVE");  // Zaktualizuj drugi krok na "ACTIVE"
    }).catch((error) => {
        console.error("Error updating task status: ", error);
    });
}

// Inicjalizowanie statusów przy załadowaniu strony
document.addEventListener("DOMContentLoaded", function() {
    fetchStepStatuses();  // Ładowanie statusów etapów z Firebase

    // Obsługuje kliknięcie przycisków do ukończenia zadań
    document.querySelectorAll('.task-card').forEach((taskCard) => {
        taskCard.addEventListener('click', () => {
            const taskId = taskCard.id.replace('task-', '');  // Pobierz ID zadania
            completeTask(taskId);  // Ukończ zadanie
        });
    });
});
