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
      if (e.target.closest('.airdrop-form')) {
        e.preventDefault();
        this.handleAirdropForm(e);
      }
    });

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
      
      // Zmiana statusu kroków
      this.updateStepStatus(1, 'completed');
      this.updateStepStatus(2, 'active');

      this.showAlert('Rejestracja udana! Możesz teraz wykonać zadania.', 'success');
      
    } catch (error) {
      console.error("Błąd zapisu do Firestore:", error);
      this.showAlert('Wystąpił błąd podczas przesyłania formularza. Proszę spróbować ponownie.', 'error');
    }
  },

  // Funkcja aktualizująca status kroków
  updateStepStatus(stepNumber, status) {
    const stepElement = document.querySelector(`#step-${stepNumber}`);
    
    if (!stepElement) return;
    
    const stepTitle = stepElement.querySelector('.step-title');
    const stepDescription = stepElement.querySelector('.step-description');
    
    if (status === 'active') {
      stepElement.classList.add('active');
      stepElement.classList.remove('completed');
      stepTitle.innerText = `Step ${stepNumber} - Active`;
      stepDescription.innerText = `In Progress...`;
    } else if (status === 'completed') {
      stepElement.classList.remove('active');
      stepElement.classList.add('completed');
      stepTitle.innerText = `Step ${stepNumber} - Completed`;
      stepDescription.innerText = `Completed`;
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
    }
  },

  // Inicjalizacja sekcji airdrop
  initAirdropSection() {
    this.checkVerificationStatus();
    this.checkAirdropProgress();
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
});
