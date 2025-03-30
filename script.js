/**
 * MetaFrog - Pełna implementacja z Firebase Realtime Database
 * Wersja 5.0 - Optymalizacja pod Realtime Database
 */

// Konfiguracja Firebase (Realtime Database)
const firebaseConfig = {
  apiKey: "AIzaSyAR6Ha8baMX5EPsPVayTno0e0QBRqZrmco",
  authDomain: "metafrog-airdrop.firebaseapp.com",
  databaseURL: "https://metafrog-airdrop-default-rtdb.firebaseio.com",
  projectId: "metafrog-airdrop",
  storageBucket: "metafrog-airdrop.appspot.com",
  messagingSenderId: "546707737127",
  appId: "1:546707737127:web:67956ae63ffef3ebeddc02",
  measurementId: "G-2Z78VYL739"
};

const MetaFrogApp = {
  db: null,
  currentUser: null,

  // Inicjalizacja aplikacji
  init() {
    console.log("[Init] Ładowanie aplikacji...");
    this.initializeFirebase();
    this.setupEventListeners();
    this.checkPreviousRegistration();
  },

  // Inicjalizacja Firebase
  initializeFirebase() {
    try {
      console.log("[Firebase] Inicjalizacja...");
      firebase.initializeApp(firebaseConfig);
      this.db = firebase.database(); // Używamy Realtime Database!
      console.log("[Firebase] Połączenie udane");
    } catch (error) {
      console.error("[Firebase] Błąd:", error);
      this.showAlert("Błąd połączenia z bazą danych", "error");
    }
  },

  // Ustawienie nasłuchiwaczy
  setupEventListeners() {
    console.log("[UI] Konfiguracja zdarzeń...");
    
    // Formularz airdrop
    const form = document.querySelector('.airdrop-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleAirdropForm();
      });
    }

    // Przycisk DexScreener
    document.querySelector('.dexscreener-link')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.verifyDexScreener();
    });
  },

  // Obsługa formularza
  async handleAirdropForm() {
    const wallet = document.getElementById('wallet').value.trim();
    const xUsername = document.getElementById('xUsername').value.trim();
    const telegram = document.getElementById('telegram').value.trim();
    const tiktok = document.getElementById('tiktok').value.trim();

    console.log("[Form] Dane:", { wallet, xUsername, telegram, tiktok });

    // Walidacja
    if (!wallet || !xUsername || !telegram) {
      this.showAlert("Wypełnij wszystkie wymagane pola", "error");
      return;
    }

    if (!this.isValidSolanaAddress(wallet)) {
      this.showAlert("Nieprawidłowy adres portfela Solana", "error");
      return;
    }

    // Przygotowanie danych
    const userData = {
      wallet,
      xUsername: this.formatUsername(xUsername),
      telegram: this.formatUsername(telegram),
      tiktok: this.formatUsername(tiktok, false),
      timestamp: Date.now(),
      completedTasks: { registration: true },
      status: "registered",
      points: 10
    };

    try {
      console.log("[DB] Zapis danych...");
      await this.db.ref('airdropParticipants/' + wallet).set(userData);
      
      this.currentUser = wallet;
      localStorage.setItem('mf_user', wallet);
      
      this.showAlert("Rejestracja udana!", "success");
      this.updateUI();
      
    } catch (error) {
      console.error("[DB] Błąd zapisu:", error);
      this.showAlert("Błąd zapisu danych", "error");
    }
  },

  // Weryfikacja DexScreener
  async verifyDexScreener() {
    if (!this.currentUser) {
      this.showAlert("Najpierw się zarejestruj", "error");
      return;
    }

    try {
      const updates = {
        ['airdropParticipants/' + this.currentUser + '/completedTasks/dexscreener']: true,
        ['airdropParticipants/' + this.currentUser + '/points']: firebase.database.ServerValue.increment(10)
      };
      
      await this.db.ref().update(updates);
      this.showAlert("Zadanie zweryfikowane!", "success");
      this.markTaskCompleted('dexscreener');
      
    } catch (error) {
      console.error("[Verify] Błąd:", error);
      this.showAlert("Błąd weryfikacji", "error");
    }
  },

  // Aktualizacja UI
  updateUI() {
    const steps = document.querySelectorAll('.step-card');
    steps[0].classList.add('completed-step');
    steps[1].classList.add('active-step');
  },

  // Oznaczanie zadań
  markTaskCompleted(task) {
    const element = document.querySelector(`.${task}-verification`);
    if (element) {
      element.innerHTML = '<i class="fas fa-check-circle"></i> Verified';
      element.style.color = '#4CAF50';
    }
  },

  // Sprawdzenie poprzedniej rejestracji
  checkPreviousRegistration() {
    const savedUser = localStorage.getItem('mf_user');
    if (savedUser) {
      this.currentUser = savedUser;
      this.updateUI();
    }
  },

  // Helpery
  isValidSolanaAddress(address) {
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
  },

  formatUsername(username, required = true) {
    if (!username && !required) return 'N/A';
    return username.startsWith('@') ? username : `@${username}`;
  },

  showAlert(message, type) {
    const alert = document.createElement('div');
    alert.className = `alert ${type}`;
    alert.textContent = message;
    document.body.appendChild(alert);
    setTimeout(() => alert.remove(), 3000);
  }
};

// Start aplikacji
document.addEventListener('DOMContentLoaded', () => {
  MetaFrogApp.init();
});
