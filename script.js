/**
 * MetaFrog - Kompletny skrypt z integracją Firebase
 * Wersja 1.0 - Pełna obsługa airdrop, weryfikacji i nawigacji
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

// Główny kontroler aplikacji
const MetaFrogApp = {
  // Inicjalizacja aplikacji
  init() {
    this.initializeFirebase();
    this.checkLocalStorage();
    this.setupEventListeners();
    this.handleInitialRoute();
    this.checkVerificationStatus();
    this.checkAirdropProgress();
    this.restoreFormData();
  },

  // Inicjalizacja Firebase
  initializeFirebase() {
    try {
      firebase.initializeApp(firebaseConfig);
      this.db = firebase.firestore();
      console.log("Firebase zainicjalizowane pomyślnie");
    } catch (e) {
      console.error("Błąd inicjalizacji Firebase:", e);
    }
  },

  // Sprawdź dostępność localStorage
  checkLocalStorage() {
    try {
      const test = '__test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      this.storageAvailable = true;
    } catch (e) {
      this.storageAvailable = false;
      console.warn('LocalStorage nie jest dostępne');
    }
  },

  // Przywróć dane formularza z localStorage
  restoreFormData() {
    if (!this.storageAvailable) return;
    
    const savedData = localStorage.getItem('airdropFormData');
    if (savedData) {
      try {
        const data = JSON.parse(savedData);
        document.getElementById('wallet').value = data.wallet || '';
        document.getElementById('xUsername').value = data.xUsername.replace('@', '') || '';
        document.getElementById('telegram').value = data.telegram.replace('@', '') || '';
        document.getElementById('tiktok').value = data.tiktok.replace('@', '') || '';
      } catch (e) {
        console.error('Błąd przywracania danych:', e);
      }
    }
  },

  // Ustaw nasłuchiwacze zdarzeń
  setupEventListeners() {
    // Nawigacja
    document.addEventListener('click', (e) => {
      const navLink = e.target.closest('nav a');
      if (navLink) {
        e.preventDefault();
        const section = this.getSectionFromHref(navLink.getAttribute('href'));
        this.showSection(section);
      }

      if (e.target.closest('.copy-referral-btn')) {
        this.copyReferralLink();
      }

      if (e.target.closest('.dexscreener-link')) {
        e.preventDefault();
        this.verifyDexScreener(e);
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

    if (!wallet || !xUsername || !telegram) {
      this.showAlert('Proszę wypełnić wszystkie wymagane pola');
      return;
    }

    if (!this.isValidSolanaAddress(wallet)) {
      this.showAlert('Proszę podać prawidłowy adres portfela Solana');
      return;
    }

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
      await this.db.collection('airdropParticipants').doc(wallet).set(submissionData);
      
      this.advanceToStep(2);
      this.showAlert('Rejestracja udana! Możesz teraz wykonać zadania.', 'success');

      if (this.storageAvailable) {
        localStorage.setItem('airdropFormSubmitted', 'true');
        localStorage.setItem('airdropFormData', JSON.stringify(submissionData));
      }

      this.trackConversion();
      
    } catch (error) {
      console.error("Błąd zapisu:", error);
      this.showAlert('Wystąpił błąd. Proszę spróbować ponownie.');
    }
  },

  // Pokazuj alerty
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

  // Walidacja adresu Solana
  isValidSolanaAddress(address) {
    return address.length >= 32 && address.length <= 44 && 
           /^[A-HJ-NP-Za-km-z1-9]*$/.test(address);
  },

  // Pobierz kod polecający z URL
  getReferralCodeFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('ref');
  },

  // Śledzenie konwersji
  trackConversion() {
    if (window.gtag) {
      gtag('event', 'conversion', {
        'send_to': 'AW-123456789/AbCdEfGhIjKlMnOpQrStUv'
      });
    }
  },

  // Weryfikacja DexScreener
  async verifyDexScreener(e) {
    e.preventDefault();
    const wallet = document.getElementById('wallet')?.value.trim();
    
    if (!wallet) {
      this.showAlert('Proszę najpierw podać adres portfela');
      return;
    }

    try {
      await this.db.collection('airdropParticipants').doc(wallet).update({
        'verificationStatus.dexscreener': true,
        'completedTasks': firebase.firestore.FieldValue.arrayUnion('dexscreener'),
        'points': firebase.firestore.FieldValue.increment(10)
      });
      
      const statusElement = document.querySelector('.dexscreener-verification');
      if (statusElement) {
        statusElement.innerHTML = '<i class="fas fa-check-circle"></i> Zweryfikowano';
        statusElement.style.color = '#4CAF50';
      }
      
      this.showAlert('Zadanie DexScreener zweryfikowane!', 'success');
    } catch (error) {
      console.error("Błąd weryfikacji:", error);
      this.showAlert('Błąd weryfikacji. Spróbuj ponownie.');
    }
  },

  // Sprawdź status weryfikacji
  async checkVerificationStatus() {
    const wallet = document.getElementById('wallet')?.value.trim();
    if (!wallet) return;

    try {
      const doc = await this.db.collection('airdropParticipants').doc(wallet).get();
      if (doc.exists) {
        const data = doc.data();
        
        if (data.verificationStatus?.dexscreener) {
          const statusElement = document.querySelector('.dexscreener-verification');
          if (statusElement) {
            statusElement.innerHTML = '<i class="fas fa-check-circle"></i> Zweryfikowano';
            statusElement.style.color = '#4CAF50';
          }
        }
      }
    } catch (error) {
      console.error("Błąd sprawdzania statusu:", error);
    }
  },

  // Kopiuj link polecający
  copyReferralLink() {
    const referralLink = `${window.location.origin}${window.location.pathname}?ref=${this.generateReferralCode()}`;
    navigator.clipboard.writeText(referralLink)
      .then(() => this.showAlert('Link skopiowany do schowka!', 'success'))
      .catch(err => {
        console.error('Błąd kopiowania:', err);
        this.showAlert('Błąd kopiowania linku');
      });
  },

  // Generuj kod polecający
  generateReferralCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  },

  // Przejdź do kroku airdrop
  advanceToStep(stepNumber) {
    document.querySelectorAll('.step-card').forEach((card, index) => {
      if (index + 1 < stepNumber) {
        card.classList.add('completed-step');
        card.classList.remove('active-step');
      } else if (index + 1 === stepNumber) {
        card.classList.add('active-step');
        card.classList.remove('pending-step');
      } else {
        card.classList.add('pending-step');
        card.classList.remove('active-step');
      }
    });
  },

  // Animacja licznika
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

  // Pokaż sekcję
  showSection(sectionId) {
    document.querySelectorAll('.section').forEach(section => {
      section.classList.remove('active');
    });
    
    const section = document.getElementById(sectionId);
    if (section) {
      section.classList.add('active');
    }
    
    history.pushState(null, null, `#${sectionId}`);
  },

  // Obsłuż początkową trasę
  handleInitialRoute() {
    const hash = window.location.hash.substring(1);
    this.showSection(hash || 'home');
  },

  // Pobierz sekcję z href
  getSectionFromHref(href) {
    return href.replace(/^#|\/$/g, '') || 'home';
  },

  // Sprawdź postęp airdrop
  checkAirdropProgress() {
    // Tutaj można dodać logikę sprawdzania postępu
  }
};

// Inicjalizacja po załadowaniu DOM
document.addEventListener('DOMContentLoaded', () => {
  MetaFrogApp.init();
  
  // Inicjalizacja liczników
  MetaFrogApp.animateCounter('participants-counter', 12500);
  MetaFrogApp.animateCounter('tokens-counter', 2500000);
});

// Globalna obsługa błędów
window.addEventListener('error', (event) => {
  console.error('Błąd:', event.error);
  if (window.gtag) {
    gtag('event', 'exception', {
      description: event.error.message,
      fatal: true
    });
  }
});
