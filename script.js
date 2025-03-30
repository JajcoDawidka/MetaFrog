/**
 * MetaFrog - Kompletny skrypt zarządzający stroną
 * Wersja 2.0 - Pełna integracja z Firebase, nawigacja i funkcje airdrop
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
  // Inicjalizacja aplikacji
  init() {
    this.initializeFirebase();
    this.setupEventListeners();
    this.handleInitialRoute();
    this.initCounters();
    console.log("Aplikacja MetaFrog została zainicjalizowana");
  },

  // Inicjalizacja Firebase
  initializeFirebase() {
    try {
      firebase.initializeApp(firebaseConfig);
      this.db = firebase.firestore();
      console.log("Firebase zostało pomyślnie zainicjalizowane");
    } catch (error) {
      console.error("Błąd inicjalizacji Firebase:", error);
      this.showAlert("Błąd połączenia z serwerem. Spróbuj odświeżyć stronę.", "error");
    }
  },

  // Ustawienie nasłuchiwaczy zdarzeń
  setupEventListeners() {
    // Formularz airdrop
    const airdropForm = document.querySelector('.airdrop-form');
    if (airdropForm) {
      airdropForm.addEventListener('submit', (e) => this.handleAirdropForm(e));
    }

    // Nawigacja
    document.addEventListener('click', (e) => {
      const navLink = e.target.closest('nav a');
      if (navLink) {
        e.preventDefault();
        const section = this.getSectionFromHref(navLink.getAttribute('href'));
        this.showSection(section);
      }
    });
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
      this.showAlert('Proszę wypełnić wszystkie wymagane pola', 'error');
      return;
    }

    // Walidacja adresu portfela Solana
    if (!this.isValidSolanaAddress(wallet)) {
      this.showAlert('Proszę podać prawidłowy adres portfela Solana', 'error');
      return;
    }

    // Przygotowanie danych do wysłania
    const submissionData = {
      wallet,
      xUsername: xUsername.startsWith('@') ? xUsername : `@${xUsername}`,
      telegram: telegram.startsWith('@') ? telegram : `@${telegram}`,
      tiktok: tiktok ? (tiktok.startsWith('@') ? tiktok : `@${tiktok}`) : 'N/A',
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      userAgent: navigator.userAgent,
      completedTasks: [],
      status: 'registered',
      referralCode: this.getReferralCodeFromURL() || 'direct',
      verificationStatus: {
        twitter: false,
        telegram: false,
        tiktok: false,
        dexscreener: false
      },
      points: 0
    };

    try {
      // Zapisz do Firestore
      await this.db.collection('airdropParticipants').doc(wallet).set(submissionData);
      
      // Aktualizacja UI
      this.advanceToStep(2);
      this.updateStepStatus(1, 'completed');  // Krok 1 na completed
      this.updateStepStatus(2, 'active');    // Krok 2 na active
      this.showAlert('Rejestracja udana! Możesz teraz wykonać zadania.', 'success');
      this.trackConversion();
    } catch (error) {
      console.error("Błąd zapisu do Firestore:", error);
      this.showAlert('Wystąpił błąd podczas przesyłania formularza. Proszę spróbować ponownie.', 'error');
    }
  },

  // Sprawdzenie statusu weryfikacji
  async checkVerificationStatus() {
    const wallet = document.getElementById('wallet')?.value.trim();
    if (!wallet) return;

    try {
      const doc = await this.db.collection('airdropParticipants').doc(wallet).get();
      if (doc.exists) {
        const data = doc.data();
        
        // Aktualizuj UI dla każdego zweryfikowanego zadania
        for (const task in data.verificationStatus) {
          if (data.verificationStatus[task]) {
            this.updateVerificationUI(task);
          }
        }
      }
    } catch (error) {
      console.error("Błąd sprawdzania statusu:", error);
    }
  },

  // Aktualizacja UI dla weryfikacji zadania
  updateVerificationUI(taskName) {
    const statusElement = document.querySelector(`.${taskName}-verification`);
    if (statusElement) {
      statusElement.innerHTML = '<i class="fas fa-check-circle"></i> Zweryfikowano';
      statusElement.style.color = '#4CAF50';
    }
  },

  // Zaktualizowanie statusu kroku (active, completed, pending)
  updateStepStatus(stepNumber, status) {
    const stepCard = document.querySelector(`#step-${stepNumber}`);
    if (!stepCard) return;

    const stepLabel = stepCard.querySelector('.step-label');
    stepCard.classList.remove('active-step', 'completed-step', 'pending-step');
    if (status === 'active') {
      stepCard.classList.add('active-step');
      stepLabel.textContent = 'ACTIVE';
    } else if (status === 'completed') {
      stepCard.classList.add('completed-step');
      stepLabel.textContent = 'COMPLETED';
    } else {
      stepCard.classList.add('pending-step');
      stepLabel.textContent = 'PENDING';
    }
  },

  // Sprawdzenie postępu airdrop (możesz rozbudować)
  checkAirdropProgress() {
    // Tutaj możesz dodać logikę sprawdzania postępu
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

  // Sprawdzenie poprawności adresu portfela Solana
  isValidSolanaAddress(address) {
    return address.length >= 32 && address.length <= 44 && 
           /^[A-HJ-NP-Za-km-z1-9]*$/.test(address);
  },

  // Pobranie kodu polecającego z URL
  getReferralCodeFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('ref');
  },

  // Generowanie kodu polecającego
  generateReferralCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  },

  // Inicjalizacja liczników
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

  // Śledzenie konwersji
  trackConversion() {
    if (typeof gtag !== 'undefined') {
      gtag('event', 'conversion', {
        'send_to': 'AW-123456789/AbCdEfGhIjKlMnOpQrStUv'
      });
    }
  },

  // Nawigacja - pokaż sekcję
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

  // Obsługa początkowego routingu
  handleInitialRoute() {
    const section = this.getSectionFromHref(window.location.hash) || 'home';
    this.showSection(section);
  },

  // Pobranie nazwy sekcji z href
  getSectionFromHref(href) {
    return href.replace(/^#\/?/, '') || 'home';
  }
};

// Inicjalizacja aplikacji po załadowaniu DOM
document.addEventListener('DOMContentLoaded', () => {
  MetaFrogApp.init();
});
