// Importowanie funkcji z Firebase SDK
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, get, child, update } from "firebase/database";

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
const db = getDatabase(app);

// Funkcja do załadowania i zaktualizowania kroków
function updateSteps() {
  const step1 = document.getElementById('step1');
  const step2 = document.getElementById('step2');
  const step3 = document.getElementById('step3');
  
  // Jeżeli formularz został wysłany, zaktualizuj statusy kroków
  if (localStorage.getItem('mfrogAirdropSubmitted') === 'true') {
    step1.classList.add('completed-step');
    step1.classList.remove('active-step');
    step2.classList.add('active-step');
    step2.classList.remove('pending-step');
  } else {
    step1.classList.add('active-step');
    step1.classList.remove('completed-step');
    step2.classList.add('pending-step');
    step2.classList.remove('active-step');
  }
}

// Funkcja do obsługi formularza
async function handleAirdropFormSubmission(event) {
  event.preventDefault();

  const wallet = document.getElementById('wallet').value.trim();
  const xUsername = document.getElementById('xUsername').value.trim();
  const telegram = document.getElementById('telegram').value.trim();
  const tiktok = document.getElementById('tiktok').value.trim() || 'Not provided';
  
  // Weryfikacja formularza
  if (!wallet || wallet.length < 32 || wallet.length > 44) {
    alert('Invalid wallet address');
    return;
  }
  if (!xUsername.startsWith('@') || !telegram.startsWith('@')) {
    alert('Usernames must start with @');
    return;
  }

  // Zapisz dane do Firebase
  const newSubmissionRef = ref(db, 'airdrops/' + Date.now());
  await set(newSubmissionRef, {
    wallet: wallet,
    xUsername: xUsername,
    telegram: telegram,
    tiktok: tiktok,
    date: new Date().toISOString(),
    verified: false
  });

  // Zapisz dane w localStorage
  localStorage.setItem('mfrogAirdropSubmitted', 'true');
  updateSteps();
  alert('Airdrop registration successful!');
}

// Funkcja do weryfikacji zgłoszeń (jeśli wymagane)
async function verifyAirdropEntry(key) {
  const entryRef = ref(db, 'airdrops/' + key);
  await update(entryRef, {
    verified: true
  });
  alert('Entry verified!');
}

// Funkcja weryfikująca, czy zgłoszenie jest zapisane
async function checkAirdropSubmission() {
  if (localStorage.getItem('mfrogAirdropSubmitted') === 'true') {
    updateSteps();
  }
}

// Funkcja do aktualizacji stanu kroków na stronie
document.addEventListener('DOMContentLoaded', () => {
  // Inicjalizacja formularza
  const form = document.getElementById('airdropForm');
  form.addEventListener('submit', handleAirdropFormSubmission);

  // Weryfikacja stanu zgłoszenia przy ładowaniu strony
  checkAirdropSubmission();

  // Przechodzenie po zakładkach
  document.querySelectorAll('nav a').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const sectionId = link.getAttribute('href').substring(1);
      showSection(sectionId);
    });
  });

  function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(section => {
      section.classList.remove('active');
    });
    const section = document.getElementById(sectionId);
    if (section) section.classList.add('active');
  }

  // Funkcja do dynamicznego wypełniania tabeli zgłoszeń
  const airdropList = document.getElementById('airdropList');
  const airdropRef = ref(db, 'airdrops/');
  get(airdropRef).then((snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      let html = '';
      for (let key in data) {
        const entry = data[key];
        html += `
          <tr>
            <td>${entry.wallet}</td>
            <td>${entry.xUsername}</td>
            <td>${entry.telegram}</td>
            <td>${entry.tiktok || '-'}</td>
            <td>${new Date(entry.date).toLocaleString()}</td>
            <td>
              <button onclick="verifyAirdropEntry('${key}')">
                ✓ Verify
              </button>
            </td>
          </tr>
        `;
      }
      airdropList.innerHTML = html;
    }
  }).catch((error) => {
    console.error('Error fetching data: ', error);
  });
});

