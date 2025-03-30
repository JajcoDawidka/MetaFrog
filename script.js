/**
 * MetaFrog - Główny plik JavaScript z integracją Firebase
 * Wersja z pełną obsługą formularza airdrop i śledzeniem zadań
 */

// Konfiguracja Firebase (użyj swojej konfiguracji)
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
  },

  // Inicjalizacja Firebase
  initializeFirebase() {
    try {
      // Inicjalizacja Firebase
      firebase.initializeApp(firebaseConfig);
      this.db = firebase.firestore();
      console.log("Firebase zainicjalizowane pomyślnie");
    } catch (e) {
      console.error("Błąd inicjalizacji Firebase:", e);
    }
  },

  // Sprawdź czy localStorage jest dostępne
  checkLocalStorage() {
    try {
      const test = '__test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      this.storageAvailable = true;
    } catch (e) {
      this.storageAvailable = false;
      console.warn('LocalStorage nie jest dostępne. Niektóre funkcje mogą być ograniczone.');
    }
  },

  // Ustaw wszystkie nasłuchiwacze zdarzeń
  setupEventListeners() {
    // Linki nawigacyjne
    document.addEventListener('click', (e) => {
      const navLink = e.target.closest('nav a');
      if (navLink) {
        e.preventDefault();
        const section = this.getSectionFromHref(navLink.getAttribute('href'));
        this.showSection(section);
      }

      // Kopiuj link polecający
      if (e.target.closest('.copy-referral-btn')) {
        this.copyReferralLink();
      }

      // Weryfikacja DexScreener
      if (e.target.closest('.dexscreener-link')) {
        e.preventDefault();
        this.verifyDexScreener(e);
      }
    });

    // Zatwierdzenie formularza
    const airdropForm = document.querySelector('.airdrop-form');
    if (airdropForm) {
      airdropForm.addEventListener('submit', (e) => this.handleAirdropForm(e));
    }

    // Nawigacja przeglądarki (wstecz/dalej)
    window.addEventListener('popstate', () => this.handleInitialRoute());
  },

  // Obsługa formularza airdrop
  async handleAirdropForm(e) {
    e.preventDefault();
    
    const wallet = document.getElementById('wallet').value.trim();
    const xUsername = document.getElementById('xUsername').value.trim();
    const telegram = document.getElementById('telegram').value.trim();
    const tiktok = document.getElementById('tiktok').value.trim();

    // Podstawowa walidacja
    if (!wallet || !xUsername || !telegram) {
      alert('Proszę wypełnić wszystkie wymagane pola');
      return;
    }

    // Walidacja adresu portfela SOL (podstawowe sprawdzenie)
    if (!this.isValidSolanaAddress(wallet)) {
      alert('Proszę podać prawidłowy adres portfela Solana');
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
      // Zapisz do Firestore z portfelem jako ID dokumentu
      await this.db.collection('airdropParticipants').doc(wallet).set(submissionData);
      
      // Przejdź do kroku 2 (Wykonaj zadania)
      this.advanceToStep(2);

      // Zapisz dane formularza w localStorage
      if (this.storageAvailable) {
        localStorage.setItem('airdropFormSubmitted', 'true');
        localStorage.setItem('airdropFormData', JSON.stringify(submissionData));
      }

      // Pokaż komunikat o sukcesie
      alert('Rejestracja udana! Możesz teraz wykonać zadania.');
      
      // Śledź konwersję (opcjonalne)
      this.trackConversion();
      
    } catch (error) {
      console.error("Błąd zapisu do Firestore:", error);
      alert('Wystąpił błąd podczas przesyłania formularza. Proszę spróbować ponownie.');
    }
  },

  // Podstawowa walidacja adresu Solana
  isValidSolanaAddress(address) {
    // Podstawowe sprawdzenie - adresy Solana są zakodowane w base58 i mają 32-44 znaki
    return address.length >= 32 && address.length <= 44 && 
           /^[A-HJ-NP-Za-km-z1-9]*$/.test(address);
  },

  // Pobierz kod polecający z URL jeśli istnieje
  getReferralCodeFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('ref');
  },

  // Śledź konwersję (opcjonalne)
  trackConversion() {
    // Tutaj możesz dodać Google Analytics, Facebook Pixel itp.
    console.log("Zarejestrowano udział w airdropie");
  },

  // Weryfikacja zadania DexScreener
  async verifyDexScreener(e) {
    e.preventDefault();
    const wallet = document.getElementById('wallet')?.value.trim();
    
    if (!wallet) {
      alert('Proszę najpierw podać adres portfela');
      return;
    }

    try {
      // Aktualizuj dokument w Firestore
      await this.db.collection('airdropParticipants').doc(wallet).update({
        'verificationStatus.dexscreener': true,
        'completedTasks': firebase.firestore.FieldValue.arrayUnion('dexscreener'),
        'points': firebase.firestore.FieldValue.increment(10)
      });
      
      // Aktualizuj UI
      const statusElement = document.querySelector('.dexscreener-verification');
      if (statusElement) {
        statusElement.textContent = '✓ Zweryfikowano';
        statusElement.style.color = 'green';
      }
      
      alert('Zadanie DexScreener zweryfikowane!');
    } catch (error) {
      console.error("Błąd weryfikacji DexScreener:", error);
      alert('Wystąpił błąd podczas weryfikacji zadania. Proszę spróbować ponownie.');
    }
  },

  // Sprawdź status weryfikacji przy ładowaniu strony
  async checkVerificationStatus() {
    const wallet = document.getElementById('wallet')?.value.trim();
    if (!wallet) return;

    try {
      const doc = await this.db.collection('airdropParticipants').doc(wallet).get();
      if (doc.exists) {
        const data = doc.data();
        
        // Aktualizuj wskaźniki statusu weryfikacji
        if (data.verificationStatus?.dexscreener) {
          const statusElement = document.querySelector('.dexscreener-verification');
          if (statusElement) {
            statusElement.textContent = '✓ Zweryfikowano';
            statusElement.style.color = 'green';
          }
        }
        
        // Możesz dodać podobne sprawdzenia dla innych zadań
      }
    } catch (error) {
      console.error("Błąd sprawdzania statusu weryfikacji:", error);
    }
  },

  // Kopiuj link polecający
  copyReferralLink() {
    const referralLink = `${window.location.origin}${window.location.pathname}?ref=${this.generateReferralCode()}`;
    navigator.clipboard.writeText(referralLink)
      .then(() => alert('Link polecający skopiowany do schowka!'))
      .catch(err => console.error('Błąd kopiowania:', err));
  },

  // Generuj kod polecający
  generateReferralCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  },

  // Przejdź do konkretnego kroku airdrop
  advanceToStep(stepNumber) {
    // Tutaj dodaj logikę przejścia między krokami airdrop
    console.log(`Przechodzę do kroku ${stepNumber}`);
  },

  // Sprawdź postęp airdrop
  checkAirdropProgress() {
    // Tutaj dodaj logikę sprawdzania postępu
  },

  // Pokaż sekcję
  showSection(section) {
    // Tutaj dodaj logikę pokazywania sekcji
  },

  // Obsłuż początkową trasę
  handleInitialRoute() {
    // Tutaj dodaj logikę routingu
  },

  // Pobierz sekcję z href
  getSectionFromHref(href) {
    // Tutaj dodaj logikę parsowania href
    return href.replace('/', '');
  }
};

// Inicjalizuj aplikację gdy DOM jest gotowy
document.addEventListener('DOMContentLoaded', () => {
  MetaFrogApp.init();
  
  // Przykładowe liczniki - możesz je usunąć lub zmodyfikować
  if (typeof MetaFrogApp.animateCounter === 'function') {
    MetaFrogApp.animateCounter('participants-counter', 12500);
    MetaFrogApp.animateCounter('tokens-counter', 2500000);
  }
});

// Obsługa błędów globalnie
window.addEventListener('error', (event) => {
  console.error('Globalny błąd:', event.error);
  // Tutaj możesz dodać śledzenie błędów
});
