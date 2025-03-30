// Import Firebase (wersja modularna)
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getDatabase, ref, push } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

// Konfiguracja Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAR6Ha8baMX5EPsPVayTno0e0QBRqZrmco",
  authDomain: "metafrog-airdrop.firebaseapp.com",
  databaseURL: "https://metafrog-airdrop-default-rtdb.firebaseio.com",
  projectId: "metafrog-airdrop",
  storageBucket: "metafrog-airdrop.firebasestorage.app",
  messagingSenderId: "546707737127",
  appId: "1:546707737127:web:67956ae63ffef3ebeddc02",
  measurementId: "G-2Z78VYL739"
};

// Inicjalizacja Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);

// Logowanie anonimowe
signInAnonymously(auth).catch(error => {
  console.error("Błąd logowania:", error);
});

class MetaFrogApp {
  constructor() {
    this.validSections = ['home', 'games', 'airdrop', 'staking', 'about'];
    this.currentSection = null;
    this.init();
  }

  init() {
    this.checkCurrentPath();
    this.setupNavigation();
    this.setupEventListeners();
  }

  checkCurrentPath() {
    const path = window.location.pathname.replace(/^\//, '') || 'home';
    const section = this.validSections.includes(path) ? path : 'home';
    this.showSection(section);
  }

  setupNavigation() {
    document.querySelectorAll('nav a').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const section = link.getAttribute('href').replace(/^\//, '');
        if (this.validSections.includes(section)) {
          this.navigateTo(section);
        } else {
          this.navigateTo('home');
        }
      });
    });
  }

  navigateTo(section) {
    if (this.currentSection === section) return;
    
    this.showSection(section);
    window.history.pushState({}, '', `/${section === 'home' ? '' : section}`);
    this.currentSection = section;
  }

  showSection(section) {
    // Ukryj wszystkie sekcje
    document.querySelectorAll('.section').forEach(sec => {
      sec.classList.remove('active');
    });

    // Pokaż wybraną sekcję
    const sectionEl = document.getElementById(section);
    if (sectionEl) {
      sectionEl.classList.add('active');
      window.scrollTo(0, 0);
    }

    // Aktualizuj styl nawigacji
    this.updateNavStyle(section);
  }

  updateNavStyle(activeSection) {
    document.querySelectorAll('nav a').forEach(link => {
      const linkSection = link.getAttribute('href').replace(/^\//, '');
      if (linkSection === activeSection) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }

  setupEventListeners() {
    window.addEventListener('popstate', () => {
      this.checkCurrentPath();
    });

    // Inicjalizacja airdrop jeśli jest na stronie
    if (window.location.pathname.includes('airdrop')) {
      this.initAirdrop();
    }
  }

  // ======================
  // AIRDROP IMPLEMENTATION
  // ======================
  initAirdrop() {
    this.setupAirdropForm();
    this.setupTaskVerification();
  }

  setupAirdropForm() {
    const form = document.querySelector('.airdrop-form');
    if (form) {
      form.addEventListener('submit', (e) => this.handleAirdropForm(e));
    }
  }

  async handleAirdropForm(e) {
    e.preventDefault();

    const wallet = document.getElementById('wallet').value.trim();
    const xUsername = document.getElementById('xUsername').value.trim();
    const telegram = document.getElementById('telegram').value.trim();
    const tiktok = document.getElementById('tiktok').value.trim();

    if (!wallet || !xUsername || !telegram) {
      alert('Proszę wypełnić wymagane pola!');
      return;
    }

    try {
      await push(ref(database, 'airdrops'), {
        wallet,
        xUsername,
        telegram,
        tiktok: tiktok || "",
        date: new Date().toISOString()
      });
      alert('Dziękujemy za zgłoszenie!');
    } catch (error) {
      console.error("Błąd zapisu:", error);
      alert('Wystąpił błąd podczas zapisywania danych.');
    }
  }

  setupTaskVerification() {
    // Tutaj dodaj logikę weryfikacji zadań
  }
}

// Inicjalizacja aplikacji
document.addEventListener('DOMContentLoaded', () => {
  window.app = new MetaFrogApp();

  // Globalne funkcje
  window.showHome = () => window.app.navigateTo('home');
  window.showGames = () => window.app.navigateTo('games');
  window.showAirdrop = () => window.app.navigateTo('airdrop');
  window.showStaking = () => window.app.navigateTo('staking');
  window.showAbout = () => window.app.navigateTo('about');
});
