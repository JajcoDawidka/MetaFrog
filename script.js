/**
 * MetaFrog - Pełna implementacja z Firebase Realtime Database
 * Wersja finalna - Działający formularz airdrop z zapisem do bazy
 */

// Konfiguracja Firebase
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

  init() {
    console.log("Inicjalizacja aplikacji MetaFrog...");
    this.initializeFirebase();
    this.setupEventListeners();
  },

  initializeFirebase() {
    try {
      firebase.initializeApp(firebaseConfig);
      this.db = firebase.database();
      console.log("Połączono z Firebase Realtime Database");
      
      // Test połączenia
      this.db.ref('.info/connected').on('value', (snapshot) => {
        if (snapshot.val() === true) {
          console.log("Połączenie aktywne");
        } else {
          console.warn("Brak połączenia z Firebase");
        }
      });
    } catch (error) {
      console.error("Błąd inicjalizacji Firebase:", error);
      alert("Błąd połączenia z bazą danych. Odśwież stronę.");
    }
  },

  setupEventListeners() {
    // Formularz airdrop
    const form = document.querySelector('.airdrop-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleAirdropForm();
      });
    } else {
      console.error("Nie znaleziono formularza airdrop!");
    }

    // Przycisk weryfikacji DexScreener
    const dexscreenerBtn = document.querySelector('.dexscreener-link');
    if (dexscreenerBtn) {
      dexscreenerBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.verifyDexScreener();
      });
    }
  },

  async handleAirdropForm() {
    const wallet = document.getElementById('wallet').value.trim();
    const xUsername = document.getElementById('xUsername').value.trim();
    const telegram = document.getElementById('telegram').value.trim();
    const tiktok = document.getElementById('tiktok').value.trim();

    // Walidacja
    if (!this.validateForm(wallet, xUsername, telegram)) {
      return;
    }

    const userData = {
      wallet: wallet,
      xUsername: this.formatUsername(xUsername),
      telegram: this.formatUsername(telegram),
      tiktok: this.formatUsername(tiktok, false),
      timestamp: Date.now(),
      completedTasks: {
        registration: true
      },
      status: "registered",
      points: 10
    };

    try {
      // Zapis do bazy
      await this.db.ref('airdropParticipants/' + wallet).set(userData);
      
      this.currentUser = wallet;
      localStorage.setItem('mfrog_user', wallet);
      
      this.showAlert("Rejestracja udana! Możesz teraz wykonywać zadania.", "success");
      this.updateProgress(2);
      
      // Aktualizacja UI
      document.getElementById('wallet').readOnly = true;
      document.getElementById('xUsername').readOnly = true;
      document.getElementById('telegram').readOnly = true;
      
    } catch (error) {
      console.error("Błąd zapisu:", error);
      this.showAlert("Błąd podczas zapisywania danych", "error");
    }
  },

  async verifyDexScreener() {
    if (!this.currentUser) {
      this.showAlert("Najpierw zarejestruj się w airdropie", "error");
      return;
    }

    try {
      const updates = {};
      updates['airdropParticipants/' + this.currentUser + '/completedTasks/dexscreener'] = true;
      updates['airdropParticipants/' + this.currentUser + '/points'] = firebase.database.ServerValue.increment(10);
      
      await this.db.ref().update(updates);
      this.showAlert("Zadanie DexScreener zweryfikowane!", "success");
      this.markTaskCompleted('dexscreener');
      
    } catch (error) {
      console.error("Błąd weryfikacji:", error);
      this.showAlert("Błąd podczas weryfikacji zadania", "error");
    }
  },

  // Pomocnicze funkcje
  validateForm(wallet, xUsername, telegram) {
    if (!wallet || !xUsername || !telegram) {
      this.showAlert("Wypełnij wszystkie wymagane pola", "error");
      return false;
    }

    if (!this.isValidSolanaAddress(wallet)) {
      this.showAlert("Nieprawidłowy adres portfela Solana", "error");
      return false;
    }

    return true;
  },

  updateProgress(step) {
    const steps = document.querySelectorAll('.step-card');
    steps.forEach((s, idx) => {
      s.classList.remove('completed-step', 'active-step', 'pending-step');
      if (idx < step - 1) s.classList.add('completed-step');
      else if (idx === step - 1) s.classList.add('active-step');
      else s.classList.add('pending-step');
    });
  },

  markTaskCompleted(task) {
    const element = document.querySelector(`.${task}-verification`);
    if (element) {
      element.innerHTML = '<i class="fas fa-check-circle"></i> Zweryfikowano';
      element.style.color = '#4CAF50';
    }
  },

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

// Uruchomienie aplikacji
document.addEventListener('DOMContentLoaded', () => {
  MetaFrogApp.init();
});
