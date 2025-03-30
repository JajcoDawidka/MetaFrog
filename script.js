// Importujemy odpowiednie funkcje z SDK Firebase
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, get, child, update } from "firebase/database";
import { getAnalytics } from "firebase/analytics";

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

// Klasa aplikacji MetaFrogApp
class MetaFrogApp {
  constructor() {
    this.setupNavigation();
    this.setupEventListeners();
    this.checkSubmissionStatus();
  }

  // ======================
  // NAVIGATION MANAGEMENT
  // ======================
  setupNavigation() {
    document.querySelectorAll('nav a').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const sectionId = link.getAttribute('href').substring(1);
        this.showSection(sectionId);
      });
    });
  }

  showSection(sectionId) {
    document.querySelectorAll('.section').forEach(section => {
      section.classList.remove('active');
    });
    
    const section = document.getElementById(sectionId);
    if (section) section.classList.add('active');
  }

  // ======================
  // AIRDROP MANAGEMENT
  // ======================
  checkSubmissionStatus() {
    if (localStorage.getItem('mfrogAirdropSubmitted') === 'true') {
      this.updateUIAfterSubmission();
    } else {
      this.updateStepStatus(1, "ACTIVE");
      this.updateStepStatus(2, "PENDING");
      this.updateStepStatus(3, "PENDING");
    }
  }

  // Zaktualizowanie statusu kroku
  updateStepStatus(step, status) {
    const stepElement = document.getElementById(`step${step}`);
    const statusElement = document.getElementById(`status${step}`);

    if (status === 'ACTIVE') {
      stepElement.classList.add('active-step');
      stepElement.classList.remove('pending-step', 'completed-step');
      statusElement.textContent = 'ACTIVE';
    } else if (status === 'PENDING') {
      stepElement.classList.add('pending-step');
      stepElement.classList.remove('active-step', 'completed-step');
      statusElement.textContent = 'PENDING';
    } else if (status === 'COMPLETED') {
      stepElement.classList.add('completed-step');
      stepElement.classList.remove('active-step', 'pending-step');
      statusElement.textContent = 'COMPLETED';
    }
  }

  // Formularz airdrop
  setupEventListeners() {
    const form = document.getElementById('airdropForm');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleAirdropSubmission();
      });
    }
  }

  // Obsługuje przesyłanie formularza
  async handleAirdropSubmission() {
    const formData = {
      wallet: document.getElementById('wallet').value.trim(),
      xUsername: document.getElementById('xUsername').value.trim(),
      telegram: document.getElementById('telegram').value.trim(),
      tiktok: document.getElementById('tiktok').value.trim() || 'Not provided',
      timestamp: new Date().toISOString(),
      status: 'registered'
    };

    if (!this.validateForm(formData)) return;

    try {
      const newSubmissionRef = ref(db, 'airdrops/' + Date.now());
      await set(newSubmissionRef, formData);
      this.updateUIAfterSubmission();
      this.saveSubmissionToLocalStorage();
    } catch (error) {
      console.error("Submission error:", error);
      alert('Error submitting form. Please try again.');
    }
  }

  // Walidacja formularza
  validateForm(data) {
    if (!data.wallet || data.wallet.length < 32 || data.wallet.length > 44) {
      alert('Invalid wallet address (32-44 characters required)');
      return false;
    }

    if (!data.xUsername.startsWith('@') || !data.telegram.startsWith('@')) {
      alert('Usernames must start with @');
      return false;
    }

    return true;
  }

  // Zaktualizowanie UI po wysłaniu formularza
  updateUIAfterSubmission() {
    this.updateStepStatus(1, 'COMPLETED');
    this.updateStepStatus(2, 'ACTIVE');
    alert('Registration successful! Complete tasks to qualify.');
  }

  // Zapisanie statusu w LocalStorage
  saveSubmissionToLocalStorage() {
    localStorage.setItem('mfrogAirdropSubmitted', 'true');
  }

  // ======================
  // TASK VERIFICATION (opcjonalnie, jeżeli chcesz dodać weryfikację zadań)
  // ======================
  setupTaskVerification() {
    // Przykładowe kliknięcie na link do weryfikacji zadania
    const dexscreenerLink = document.querySelector('.dexscreener-link');
    if (dexscreenerLink) {
      dexscreenerLink.addEventListener('click', () => {
        this.markTaskAsVerified('dexscreener');
      });
    }

    // Przykładowy link do systemu poleceń
    const referralButton = document.querySelector('.task-link[onclick="copyReferralLink()"]');
    if (referralButton) {
      referralButton.addEventListener('click', (e) => {
        e.preventDefault();
        this.copyReferralLink();
      });
    }
  }

  // Weryfikacja zadania (jeśli jest)
  markTaskAsVerified(taskType) {
    const statusElement = document.querySelector(`.${taskType}-verification`);
    if (statusElement) {
      statusElement.textContent = '✓ Verified';
      statusElement.style.color = '#4CAF50';
    }
  }

  // Kopiowanie linku do poleceń
  copyReferralLink() {
    const referralId = localStorage.getItem('mfrogReferralId') || this.generateReferralId();
    const referralLink = `${window.location.href}?ref=${referralId}`;
    
    navigator.clipboard.writeText(referralLink)
      .then(() => alert('Referral link copied!'))
      .catch(() => {
        // Fallback dla starszych przeglądarek
        const textarea = document.createElement('textarea');
        textarea.value = referralLink;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        alert('Referral link copied!');
      });
  }

  // Generowanie ID do polecenia
  generateReferralId() {
    const id = 'mfrog-' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('mfrogReferralId', id);
    return id;
  }
}

// Inicjalizowanie aplikacji po załadowaniu strony
document.addEventListener('DOMContentLoaded', () => {
  new MetaFrogApp();
});
