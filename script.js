/**
 * MetaFrog - Kompletna implementacja z Firebase Realtime Database
 * Wersja finalna - Działający formularz airdrop z zapisem do bazy
 */

// Inicjalizacja Firebase
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
    console.log("Start aplikacji MetaFrog...");
    this.initializeFirebase();
    this.setupEventListeners();
    this.checkPreviousUser();
    this.initCounters();
  },

  // Połączenie z Firebase
  initializeFirebase() {
    try {
      firebase.initializeApp(firebaseConfig);
      this.db = firebase.database();
      console.log("Połączono z Firebase Realtime Database");
      
      // Monitorowanie połączenia
      this.db.ref('.info/connected').on('value', (snapshot) => {
        if (snapshot.val() === true) {
          console.log("Aktywne połączenie z Firebase");
        } else {
          console.warn("Brak połączenia z Firebase");
        }
      });
    } catch (error) {
      console.error("Błąd inicjalizacji Firebase:", error);
      this.showAlert("Błąd połączenia z bazą danych", "error");
    }
  },

  // Ustawienie nasłuchiwaczy zdarzeń
  setupEventListeners() {
    // Formularz airdrop
    const form = document.querySelector('.airdrop-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleAirdropForm();
      });
    }

    // Przyciski zadań
    document.querySelectorAll('.task-link').forEach(btn => {
      btn.addEventListener('click', (e) => {
        if (btn.classList.contains('dexscreener-link')) {
          e.preventDefault();
          this.verifyTask('dexscreener');
        }
      });
    });

    // Kopiowanie linku polecającego
    document.querySelector('.copy-referral-btn')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.copyReferralLink();
    });
  },

  // Obsługa formularza airdrop
  async handleAirdropForm() {
    const wallet = document.getElementById('wallet').value.trim();
    const xUsername = document.getElementById('xUsername').value.trim();
    const telegram = document.getElementById('telegram').value.trim();
    const tiktok = document.getElementById('tiktok').value.trim();

    // Walidacja formularza
    if (!this.validateForm(wallet, xUsername, telegram)) {
      return;
    }

    // Przygotowanie danych
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
      points: 10,
      referralCode: this.generateReferralCode()
    };

    try {
      // Zapis do bazy danych
      await this.db.ref('airdropParticipants/' + wallet).set(userData);
      
      // Aktualizacja stanu
      this.currentUser = wallet;
      localStorage.setItem('mfrog_user', wallet);
      
      // Aktualizacja UI
      this.showAlert("Rejestracja zakończona sukcesem!", "success");
      this.updateProgress(2);
      this.lockFormFields();
      
    } catch (error) {
      console.error("Błąd zapisu danych:", error);
      this.showAlert("Błąd podczas zapisywania danych", "error");
    }
  },

  // Weryfikacja zadania
  async verifyTask(taskName) {
    if (!this.currentUser) {
      this.showAlert("Najpierw zarejestruj się w airdropie", "error");
      return;
    }

    try {
      const updates = {};
      updates['airdropParticipants/' + this.currentUser + '/completedTasks/' + taskName] = true;
      updates['airdropParticipants/' + this.currentUser + '/points'] = firebase.database.ServerValue.increment(10);
      
      await this.db.ref().update(updates);
      this.showAlert(`Zadanie ${taskName} zweryfikowane!`, "success");
      this.markTaskCompleted(taskName);
      
    } catch (error) {
      console.error(`Błąd weryfikacji zadania ${taskName}:`, error);
      this.showAlert("Błąd podczas weryfikacji zadania", "error");
    }
  },

  // Sprawdzenie poprzedniego użytkownika
  checkPreviousUser() {
    const savedUser = localStorage.getItem('mfrog_user');
    if (savedUser) {
      this.currentUser = savedUser;
      this.updateProgress(2);
      this.lockFormFields();
    }
  },

  // Aktualizacja progresu
  updateProgress(currentStep) {
    const steps = document.querySelectorAll('.step-card');
    steps.forEach((step, index) => {
      step.classList.remove('completed-step', 'active-step', 'pending-step');
      
      if (index < currentStep - 1) {
        step.classList.add('completed-step');
      } else if (index === currentStep - 1) {
        step.classList.add('active-step');
      } else {
        step.classList.add('pending-step');
      }
    });
  },

  // Oznaczenie zadania jako ukończone
  markTaskCompleted(taskName) {
    const element = document.querySelector(`.${taskName}-verification`);
    if (element) {
      element.innerHTML = '<i class="fas fa-check-circle"></i> Zweryfikowano';
      element.style.color = '#4CAF50';
    }
  },

  // Zablokowanie pól formularza po rejestracji
  lockFormFields() {
    ['wallet', 'xUsername', 'telegram'].forEach(id => {
      const field = document.getElementById(id);
      if (field) field.readOnly = true;
    });
  },

  // Generowanie kodu polecającego
  generateReferralCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  },

  // Kopiowanie linku polecającego
  copyReferralLink() {
    const referralLink = `${window.location.origin}?ref=${this.generateReferralCode()}`;
    navigator.clipboard.writeText(referralLink)
      .then(() => this.showAlert("Link polecający skopiowany!", "success"))
      .catch(err => {
        console.error("Błąd kopiowania:", err);
        this.showAlert("Błąd podczas kopiowania linku", "error");
      });
  },

  // Animacja liczników
  initCounters() {
    this.animateCounter('participants-counter', 12500);
    this.animateCounter('tokens-counter', 2500000);
  },

  animateCounter(elementId, target) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    let current = 0;
    const increment = target / 100;
    const timer = setInterval(() => {
      current += increment;
      element.textContent = Math.floor(current).toLocaleString();
      if (current >= target) {
        element.textContent = target.toLocaleString();
        clearInterval(timer);
      }
    }, 20);
  },

  // Walidacja formularza
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

  // Formatowanie nazwy użytkownika
  formatUsername(username, required = true) {
    if (!username && !required) return 'N/A';
    return username.startsWith('@') ? username : `@${username}`;
  },

  // Walidacja adresu Solana
  isValidSolanaAddress(address) {
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
  },

  // Wyświetlanie powiadomień
  showAlert(message, type) {
    const alert = document.createElement('div');
    alert.className = `alert ${type}`;
    alert.textContent = message;
    document.body.appendChild(alert);
    setTimeout(() => alert.remove(), 3000);
  }
};

// Uruchomienie aplikacji po załadowaniu DOM
document.addEventListener('DOMContentLoaded', () => {
  MetaFrogApp.init();
});
