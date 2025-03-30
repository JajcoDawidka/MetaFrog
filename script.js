/**
 * MetaFrog - Kompletny skrypt zarządzający stroną
 * Wersja 3.0 - Pełna integracja z Firebase i poprawne zarządzanie krokami airdrop
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
  currentUserWallet: null,
  db: null,
  
  // Inicjalizacja aplikacji
  init() {
    this.initializeFirebase();
    this.setupEventListeners();
    this.handleInitialRoute();
    this.initCounters();
    console.log("MetaFrog App initialized");
  },

  // Inicjalizacja Firebase
  initializeFirebase() {
    try {
      firebase.initializeApp(firebaseConfig);
      this.db = firebase.firestore();
      
      // Obserwuj zmiany w danych użytkownika
      this.monitorUserProgress();
      
      console.log("Firebase initialized successfully");
    } catch (error) {
      console.error("Firebase initialization error:", error);
      this.showAlert("Connection error. Please refresh the page.", "error");
    }
  },

  // Ustawienie nasłuchiwaczy zdarzeń
  setupEventListeners() {
    // Nawigacja
    document.addEventListener('click', (e) => {
      const navLink = e.target.closest('nav a');
      if (navLink) {
        e.preventDefault();
        const section = this.getSectionFromHref(navLink.getAttribute('href'));
        this.showSection(section);
      }

      // Kopiowanie linku polecającego
      if (e.target.closest('.copy-referral-btn')) {
        e.preventDefault();
        this.copyReferralLink();
      }

      // Weryfikacja DexScreener
      if (e.target.closest('.dexscreener-link')) {
        e.preventDefault();
        this.verifyDexScreener();
      }
    });

    // Formularz airdrop
    const airdropForm = document.querySelector('.airdrop-form');
    if (airdropForm) {
      airdropForm.addEventListener('submit', (e) => this.handleAirdropForm(e));
    }

    // Obsługa historii przeglądarki
    window.addEventListener('popstate', () => this.handleInitialRoute());
  },

  // Obsługa formularza airdrop
  async handleAirdropForm(e) {
    e.preventDefault();
    
    const wallet = document.getElementById('wallet').value.trim();
    const xUsername = document.getElementById('xUsername').value.trim();
    const telegram = document.getElementById('telegram').value.trim();
    const tiktok = document.getElementById('tiktok').value.trim();

    // Walidacja pól wymaganych
    if (!wallet || !xUsername || !telegram) {
      this.showAlert('Please fill all required fields', 'error');
      return;
    }

    // Walidacja adresu Solana
    if (!this.isValidSolanaAddress(wallet)) {
      this.showAlert('Please enter a valid Solana wallet address', 'error');
      return;
    }

    // Przygotowanie danych
    const submissionData = {
      wallet,
      xUsername: this.formatUsername(xUsername),
      telegram: this.formatUsername(telegram),
      tiktok: this.formatUsername(tiktok, false),
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      userAgent: navigator.userAgent,
      completedTasks: ['registration'],
      status: 'registered',
      referralCode: this.getReferralCodeFromURL() || 'direct',
      verificationStatus: {
        twitter: false,
        telegram: false,
        tiktok: false,
        dexscreener: false
      },
      points: 10
    };

    try {
      // Zapisz do Firestore
      await this.db.collection('airdropParticipants').doc(wallet).set(submissionData);
      
      // Ustaw aktualnego użytkownika
      this.currentUserWallet = wallet;
      localStorage.setItem('registeredWallet', wallet);
      
      // Aktualizacja UI
      this.updateProgress(2);
      this.showAlert('Registration successful! Complete tasks now.', 'success');
      
      // Śledzenie konwersji
      this.trackConversion();
      
    } catch (error) {
      console.error("Error saving data:", error);
      this.showAlert('Error saving data. Please try again.', 'error');
    }
  },

  // Monitorowanie postępu użytkownika
  monitorUserProgress() {
    const wallet = localStorage.getItem('registeredWallet');
    if (!wallet) return;

    this.db.collection('airdropParticipants').doc(wallet)
      .onSnapshot((doc) => {
        if (doc.exists) {
          const data = doc.data();
          this.updateUIBasedOnProgress(data);
        }
      });
  },

  // Aktualizacja UI na podstawie postępu
  updateUIBasedOnProgress(userData) {
    // Ustaw odpowiedni krok
    if (userData.completedTasks.includes('registration')) {
      this.updateProgress(2);
    }
    
    // Aktualizuj status zadań
    this.updateTaskStatus('twitter', userData.verificationStatus?.twitter);
    this.updateTaskStatus('telegram', userData.verificationStatus?.telegram);
    this.updateTaskStatus('tiktok', userData.verificationStatus?.tiktok);
    this.updateTaskStatus('dexscreener', userData.verificationStatus?.dexscreener);
  },

  // Aktualizacja statusu zadania
  updateTaskStatus(taskName, isCompleted) {
    const statusElement = document.querySelector(`.${taskName}-verification`);
    if (!statusElement) return;

    if (isCompleted) {
      statusElement.innerHTML = '<i class="fas fa-check-circle"></i> Verified';
      statusElement.style.color = '#4CAF50';
    }
  },

  // Weryfikacja zadania DexScreener
  async verifyDexScreener() {
    if (!this.currentUserWallet) {
      this.showAlert('Please complete registration first', 'error');
      return;
    }

    try {
      await this.db.collection('airdropParticipants').doc(this.currentUserWallet).update({
        'verificationStatus.dexscreener': true,
        'completedTasks': firebase.firestore.FieldValue.arrayUnion('dexscreener'),
        'points': firebase.firestore.FieldValue.increment(10)
      });
      
      this.showAlert('DexScreener task verified!', 'success');
    } catch (error) {
      console.error("Verification error:", error);
      this.showAlert('Verification failed. Please try again.', 'error');
    }
  },

  // Aktualizacja kroków airdrop
  updateProgress(currentStep) {
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

  // Kopiowanie linku polecającego
  copyReferralLink() {
    const referralLink = `${window.location.origin}${window.location.pathname}?ref=${this.generateReferralCode()}`;
    navigator.clipboard.writeText(referralLink)
      .then(() => this.showAlert('Referral link copied!', 'success'))
      .catch(err => {
        console.error('Copy error:', err);
        this.showAlert('Failed to copy link', 'error');
      });
  },

  // Generowanie kodu polecającego
  generateReferralCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  },

  // Formatowanie nazwy użytkownika
  formatUsername(username, required = true) {
    if (!username && !required) return 'N/A';
    return username.startsWith('@') ? username : `@${username}`;
  },

  // Walidacja adresu Solana
  isValidSolanaAddress(address) {
    return address.length >= 32 && address.length <= 44 && 
           /^[A-HJ-NP-Za-km-z1-9]*$/.test(address);
  },

  // Pobranie kodu polecającego z URL
  getReferralCodeFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('ref');
  },

  // Wyświetlanie powiadomień
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

  // Nawigacja - pokaż sekcję
  showSection(sectionId) {
    // Ukryj wszystkie sekcje
    document.querySelectorAll('.section').forEach(section => {
      section.classList.remove('active');
    });
    
    // Pokaż wybraną sekcję
    const section = document.getElementById(sectionId);
    if (section) {
      section.classList.add('active');
      window.location.hash = sectionId;
      
      // Inicjalizacja sekcji airdrop
      if (sectionId === 'airdrop') {
        this.initAirdropSection();
      }
    }
  },

  // Inicjalizacja sekcji airdrop
  initAirdropSection() {
    const wallet = localStorage.getItem('registeredWallet');
    
    if (wallet) {
      this.currentUserWallet = wallet;
      this.updateProgress(2); // Użytkownik już zarejestrowany - krok 2 aktywny
    } else {
      this.updateProgress(1); // Nowy użytkownik - krok 1 aktywny
    }
  },

  // Obsługa początkowego routingu
  handleInitialRoute() {
    const section = this.getSectionFromHref(window.location.hash) || 'home';
    this.showSection(section);
  },

  // Pobranie nazwy sekcji z href
  getSectionFromHref(href) {
    return href.replace(/^#\/?/, '') || 'home';
  },

  // Inicjalizacja liczników
  initCounters() {
    this.animateCounter('participants-counter', 12500);
    this.animateCounter('tokens-counter', 2500000);
  },

  // Animacja liczników
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

  // Śledzenie konwersji
  trackConversion() {
    if (typeof gtag !== 'undefined') {
      gtag('event', 'conversion', {
        'send_to': 'AW-123456789/AbCdEfGhIjKlMnOpQrStUv'
      });
    }
  }
};

// Inicjalizacja aplikacji po załadowaniu DOM
document.addEventListener('DOMContentLoaded', () => {
  MetaFrogApp.init();
});

// Globalna obsługa błędów
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  if (typeof gtag !== 'undefined') {
    gtag('event', 'exception', {
      description: event.error.message,
      fatal: true
    });
  }
});
