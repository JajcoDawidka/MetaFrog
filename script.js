/**
 * MetaFrog - Kompletna implementacja z poprawionym formularzem airdrop
 * Wersja 4.0 - Pełna obsługa formularza + debugowanie
 */

// Konfiguracja Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAR6Ha8baMX5EPsPVayTno0e0QBRqZrmco",
  authDomain: "metafrog-airdrop.firebaseapp.com",
  projectId: "metafrog-airdrop",
  storageBucket: "metafrog-airdrop.appspot.com",
  messagingSenderId: "546707737127",
  appId: "1:546707737127:web:67956ae63ffef3ebeddc02",
  measurementId: "G-2Z78VYL739"
};

// Główny obiekt aplikacji
const MetaFrogApp = {
  db: null,
  currentUser: null,

  // Inicjalizacja aplikacji
  init() {
    console.log("[MetaFrog] Inicjalizacja aplikacji...");
    this.initializeFirebase();
    this.setupEventListeners();
    this.initUI();
    this.checkPreviousRegistration();
  },

  // Inicjalizacja Firebase
  initializeFirebase() {
    try {
      console.log("[Firebase] Inicjalizacja...");
      firebase.initializeApp(firebaseConfig);
      this.db = firebase.firestore();
      
      // Ustawienie timeoutu dla Firestore
      this.db.settings({
        timeout: 10000 // 10 sekund timeout
      });
      
      console.log("[Firebase] Inicjalizacja zakończona sukcesem");
    } catch (error) {
      console.error("[Firebase] Błąd inicjalizacji:", error);
      this.showAlert("Błąd połączenia z bazą danych. Odśwież stronę.", "error");
    }
  },

  // Ustawienie nasłuchiwaczy zdarzeń
  setupEventListeners() {
    console.log("[UI] Konfiguracja nasłuchiwaczy zdarzeń...");
    
    // Formularz airdrop
    const airdropForm = document.querySelector('.airdrop-form');
    if (airdropForm) {
      airdropForm.addEventListener('submit', (e) => {
        e.preventDefault();
        console.log("[Formularz] Zatwierdzono formularz");
        this.handleAirdropForm();
      });
    } else {
      console.error("[UI] Nie znaleziono formularza airdrop!");
    }

    // Nawigacja
    document.querySelectorAll('nav a').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const section = e.target.getAttribute('href').replace('#', '');
        this.showSection(section);
      });
    });

    // Przycisk DexScreener
    const dexscreenerBtn = document.querySelector('.dexscreener-link');
    if (dexscreenerBtn) {
      dexscreenerBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.verifyDexScreener();
      });
    }
  },

  // Inicjalizacja UI
  initUI() {
    console.log("[UI] Inicjalizacja interfejsu...");
    this.updateStepProgress(1); // Domyślnie pokazujemy krok 1
    this.disableCompletedTasks(); // Wyłączamy nieaktywne zadania
  },

  // Sprawdzenie poprzedniej rejestracji
  checkPreviousRegistration() {
    const savedWallet = localStorage.getItem('mfrog_wallet');
    if (savedWallet) {
      console.log("[Rejestracja] Znaleziono zapisany portfel:", savedWallet);
      this.currentUser = savedWallet;
      this.updateStepProgress(2); // Przejdź do kroku 2 jeśli użytkownik jest już zarejestrowany
    }
  },

  // Obsługa formularza airdrop
  async handleAirdropForm() {
    console.log("[Formularz] Przetwarzanie danych...");
    
    const wallet = document.getElementById('wallet').value.trim();
    const xUsername = document.getElementById('xUsername').value.trim();
    const telegram = document.getElementById('telegram').value.trim();
    const tiktok = document.getElementById('tiktok').value.trim();

    console.log("[Formularz] Wprowadzone dane:", {
      wallet,
      xUsername,
      telegram,
      tiktok
    });

    // Walidacja
    if (!this.validateForm(wallet, xUsername, telegram)) {
      return;
    }

    // Przygotowanie danych
    const userData = {
      wallet,
      xUsername: this.formatUsername(xUsername),
      telegram: this.formatUsername(telegram),
      tiktok: this.formatUsername(tiktok, false),
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      completedTasks: ['registration'],
      status: 'registered',
      points: 10,
      referralCode: this.getReferralCode() || 'direct'
    };

    console.log("[Firestore] Przygotowane dane:", userData);

    try {
      console.log("[Firestore] Próba zapisu danych...");
      await this.db.collection('airdropParticipants').doc(wallet).set(userData);
      
      console.log("[Firestore] Dane zapisane pomyślnie");
      this.currentUser = wallet;
      localStorage.setItem('mfrog_wallet', wallet);
      
      this.showAlert("Rejestracja udana! Możesz teraz wykonywać zadania.", "success");
      this.updateStepProgress(2);
      this.enableTasks();
      
    } catch (error) {
      console.error("[Firestore] Błąd zapisu:", error);
      this.showAlert("Błąd podczas zapisywania danych. Spróbuj ponownie.", "error");
    }
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

  // Weryfikacja zadania DexScreener
  async verifyDexScreener() {
    if (!this.currentUser) {
      this.showAlert("Najpierw zarejestruj się w airdropie", "error");
      return;
    }

    console.log("[Weryfikacja] Rozpoczynanie weryfikacji DexScreener...");

    try {
      await this.db.collection('airdropParticipants').doc(this.currentUser).update({
        'verificationStatus.dexscreener': true,
        'completedTasks': firebase.firestore.FieldValue.arrayUnion('dexscreener'),
        'points': firebase.firestore.FieldValue.increment(10)
      });

      console.log("[Weryfikacja] Zadanie DexScreener potwierdzone");
      this.showAlert("Zadanie DexScreener zakończone pomyślnie!", "success");
      this.markTaskAsCompleted('dexscreener');
      
    } catch (error) {
      console.error("[Weryfikacja] Błąd:", error);
      this.showAlert("Błąd podczas weryfikacji zadania", "error");
    }
  },

  // Aktualizacja progresu kroków
  updateStepProgress(currentStep) {
    console.log(`[UI] Aktualizacja kroków na: ${currentStep}`);
    
    const steps = document.querySelectorAll('.step-card');
    steps.forEach((step, index) => {
      step.classList.remove('completed-step', 'active-step', 'pending-step');
      
      if (index + 1 < currentStep) {
        step.classList.add('completed-step');
      } else if (index + 1 === currentStep) {
        step.classList.add('active-step');
      } else {
        step.classList.add('pending-step');
      }
    });
  },

  // Oznaczanie zadania jako ukończone
  markTaskAsCompleted(taskName) {
    const taskElement = document.querySelector(`.${taskName}-verification`);
    if (taskElement) {
      taskElement.innerHTML = '<i class="fas fa-check-circle"></i> Zweryfikowano';
      taskElement.style.color = '#4CAF50';
    }
  },

  // Włączenie zadań po rejestracji
  enableTasks() {
    document.querySelectorAll('.task-link').forEach(btn => {
      btn.style.pointerEvents = 'auto';
      btn.style.opacity = '1';
    });
  },

  // Wyłączenie nieukończonych zadań
  disableCompletedTasks() {
    document.querySelectorAll('.task-link').forEach(btn => {
      btn.style.pointerEvents = 'none';
      btn.style.opacity = '0.5';
    });
  },

  // Pokazywanie sekcji
  showSection(sectionId) {
    document.querySelectorAll('.section').forEach(section => {
      section.classList.remove('active');
    });
    
    const section = document.getElementById(sectionId);
    if (section) {
      section.classList.add('active');
      window.location.hash = sectionId;
    }
  },

  // Pokazywanie alertów
  showAlert(message, type = 'error') {
    const alertBox = document.createElement('div');
    alertBox.className = `alert ${type}`;
    alertBox.textContent = message;
    document.body.appendChild(alertBox);
    
    setTimeout(() => {
      alertBox.classList.add('fade-out');
      setTimeout(() => alertBox.remove(), 500);
    }, 3000);
  },

  // Generowanie kodu polecającego
  generateReferralCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  },

  // Pobranie kodu polecającego z URL
  getReferralCode() {
    const params = new URLSearchParams(window.location.search);
    return params.get('ref');
  },

  // Formatowanie nazwy użytkownika
  formatUsername(username, required = true) {
    if (!username && !required) return 'N/A';
    return username.startsWith('@') ? username : `@${username}`;
  },

  // Walidacja adresu Solana
  isValidSolanaAddress(address) {
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
  }
};

// Inicjalizacja po załadowaniu DOM
document.addEventListener('DOMContentLoaded', () => {
  console.log("[MetaFrog] Strona załadowana");
  MetaFrogApp.init();
});

// Obsługa błędów
window.addEventListener('error', (error) => {
  console.error("[System] Nieprzechwycony błąd:", error);
});
