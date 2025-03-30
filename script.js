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
    this.checkVerificationStatus();
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
    // Nawigacja
    document.addEventListener('click', (e) => {
      const navLink = e.target.closest('nav a');
      if (navLink) {
        e.preventDefault();
        const section = this.getSectionFromHref(navLink.getAttribute('href'));
        this.showSection(section);
      }

      // Formularz airdrop
      const airdropForm = document.querySelector('.airdrop-form');
      if (airdropForm) {
        airdropForm.addEventListener('submit', (e) => this.handleAirdropForm(e));
      }
    });

    // Obsługa historii przeglądarki
    window.addEventListener('popstate', () => this.handleInitialRoute());
  },

  // Aktualizacja kroków airdrop
  advanceToStep(stepNumber) {
    document.querySelectorAll('.step-card').forEach((card, index) => {
      const stepStatus = card.querySelector('.step-status');
      
      // Usunięcie istniejących klas
      card.classList.remove('completed-step', 'active-step', 'pending-step');

      // Zaktualizowanie klasy i napisu na podstawie numeru kroku
      if (index + 1 < stepNumber) {
        card.classList.add('completed-step'); // Krok zakończony
        stepStatus.innerHTML = 'Completed'; // Zmiana napisu na "Completed"
      } else if (index + 1 === stepNumber) {
        card.classList.add('active-step'); // Krok aktywny
        stepStatus.innerHTML = 'Active'; // Zmiana napisu na "Active"
      } else {
        card.classList.add('pending-step'); // Krok oczekujący
        stepStatus.innerHTML = 'Pending'; // Zmiana napisu na "Pending"
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

      // Zaktualizowanie UI po wysłaniu formularza
      this.advanceToStep(2); // Zmiana na krok 2 (krok 1 już zmienia się na completed)
      this.showAlert('Rejestracja udana! Możesz teraz wykonać zadania.', 'success');
      this.trackConversion(); // Śledzenie konwersji (Google Analytics)

    } catch (error) {
      console.error("Błąd zapisu do Firestore:", error);
      this.showAlert('Wystąpił błąd podczas przesyłania formularza. Proszę spróbować ponownie.', 'error');
    }
  },

  // Sprawdzenie, czy adres Solana jest poprawny
  isValidSolanaAddress(address) {
    return address.length >= 32 && address.length <= 44 && 
           /^[A-HJ-NP-Za-km-z1-9]*$/.test(address);
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
    this.checkVerificationStatus();
    this.checkAirdropProgress();
  },

  // Pobranie nazwy sekcji z href
  getSectionFromHref(href) {
    return href.replace(/^#\/?/, '') || 'home';
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

  // Śledzenie konwersji
  trackConversion() {
    if (typeof gtag !== 'undefined') {
      gtag('event', 'conversion', {
        'send_to': 'AW-123456789/AbCdEfGhIjKlMnOpQrStUv'
      });
    }
  },

  // Sprawdzenie postępu airdrop (możesz rozbudować)
  checkAirdropProgress() {
    // Tutaj możesz dodać logikę sprawdzania postępu
  }
};

// Inicjalizacja aplikacji po załadowaniu DOM
document.addEventListener('DOMContentLoaded', () => {
  MetaFrogApp.init();
});

// Globalna obsługa błędów
window.addEventListener('error', (event) => {
  console.error('Globalny błąd:', event.error);
  if (typeof gtag !== 'undefined') {
    gtag('event', 'exception', {
      description: event.error.message,
      fatal: true
    });
  }
});
