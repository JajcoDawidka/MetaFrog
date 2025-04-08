const firebaseConfig = {
  apiKey: "AIzaSyAR6Ha8baMX5EPsPVayTno0e0QBRqZrmco",
  authDomain: "metafrog-airdrop.firebaseapp.com",
  databaseURL: "https://metafrog-airdrop-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "metafrog-airdrop",
  storageBucket: "metafrog-airdrop.appspot.com",
  messagingSenderId: "546707737127",
  appId: "1:546707737127:web:67956ae63ffef3ebeddc02",
  measurementId: "G-2Z78VYL739"
};

const MetaFrogApp = {
  isProcessing: false,

  async init() {
    try {
      // Inicjalizacja Firebase
      firebase.initializeApp(firebaseConfig);
      this.db = firebase.firestore();
      this.realtimeDb = firebase.database();

      // Sprawdź poprzednią rejestrację
      if (this.isRegistered()) {
        this.markFormAsCompleted();
        this.updateStepsUI();
      }

      this.setupEventListeners();
      this.showSection(window.location.hash.substring(1) || 'home');
    } catch (error) {
      console.error("Init error:", error);
      this.showEmergencyMode();
    }
  },

  setupEventListeners() {
    // Obsługa formularza
    const form = document.querySelector('.airdrop-form');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.processForm(form);
      });
    }

    // Nawigacja
    document.querySelectorAll('nav a').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        this.showSection(e.target.getAttribute('href').substring(1));
      });
    });
  },

  async processForm(form) {
    if (this.isProcessing) return;
    this.isProcessing = true;

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;

    try {
      // 1. Przygotuj dane
      const formData = {
        wallet: form.wallet.value.trim(),
        xUsername: this.normalizeUsername(form.xUsername.value.trim()),
        telegram: this.normalizeUsername(form.telegram.value.trim()),
        tiktok: form.tiktok.value.trim() ? this.normalizeUsername(form.tiktok.value.trim()) : 'N/A',
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        status: 'registered'
      };

      // 2. Walidacja
      if (!formData.wallet || !formData.xUsername || !formData.telegram) {
        throw new Error('Wypełnij wszystkie wymagane pola');
      }

      if (!this.isValidSolanaAddress(formData.wallet)) {
        throw new Error('Nieprawidłowy adres portfela Solana');
      }

      // 3. Zapisz do Firebase
      await this.db.collection('airdropParticipants').doc(formData.wallet).set(formData);
      
      // 4. Aktualizuj UI
      submitBtn.textContent = '✓ Zarejestrowano';
      submitBtn.style.backgroundColor = '#4CAF50';
      submitBtn.disabled = true;
      form.querySelectorAll('input').forEach(input => input.disabled = true);

      // 5. Zapisz w localStorage
      localStorage.setItem('mfrog_registered', 'true');
      localStorage.setItem('mfrog_wallet', formData.wallet);

      // 6. Aktualizuj kroki
      this.updateStepsUI();
      this.showAlert('Rejestracja udana!', 'success');

    } catch (error) {
      console.error("Błąd rejestracji:", error);
      submitBtn.innerHTML = originalText;
      this.showAlert(error.message, 'error');
    } finally {
      this.isProcessing = false;
    }
  },

  updateStepsUI() {
    const steps = document.querySelectorAll('.step-card');
    if (!steps) return;

    const isRegistered = this.isRegistered();

    steps.forEach((step, index) => {
      // Resetuj klasy
      step.classList.remove('active-step', 'completed-step', 'pending-step');
      
      // Znajdź element statusu
      const statusEl = step.querySelector('.step-status');
      if (!statusEl) return;

      if (isRegistered) {
        if (index === 0) {
          step.classList.add('completed-step');
          statusEl.textContent = 'ZAKOŃCZONY';
        } else if (index === 1) {
          step.classList.add('active-step');
          statusEl.textContent = 'AKTYWNY';
        } else {
          step.classList.add('pending-step');
          statusEl.textContent = 'OCZEKUJĄCY';
        }
      } else {
        if (index === 0) {
          step.classList.add('active-step');
          statusEl.textContent = 'AKTYWNY';
        } else {
          step.classList.add('pending-step');
          statusEl.textContent = 'OCZEKUJĄCY';
        }
      }
    });
  },

  markFormAsCompleted() {
    const form = document.querySelector('.airdrop-form');
    if (!form) return;

    form.querySelectorAll('input').forEach(input => input.disabled = true);
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.textContent = '✓ Już zarejestrowano';
      submitBtn.disabled = true;
      submitBtn.style.backgroundColor = '#4CAF50';
    }
  },

  showSection(sectionId) {
    document.querySelectorAll('.section').forEach(section => {
      section.classList.remove('active');
    });

    const section = document.getElementById(sectionId);
    if (section) {
      section.classList.add('active');
      window.scrollTo(0, 0);
      history.replaceState(null, null, `#${sectionId}`);
    }
  },

  showAlert(message, type = 'info') {
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.innerHTML = `
      <span class="alert-icon">${
        type === 'success' ? '✓' :
        type === 'error' ? '✕' :
        type === 'warning' ? '⚠' : 'i'
      }</span>
      ${message}
    `;

    document.body.appendChild(alert);
    setTimeout(() => {
      alert.classList.add('fade-out');
      setTimeout(() => alert.remove(), 300);
    }, 5000);
  },

  showEmergencyMode() {
    const submitBtn = document.querySelector('.airdrop-form button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Serwis niedostępny';
    }
    this.showAlert('Trwają prace techniczne. Spróbuj ponownie później.', 'error');
  },

  normalizeUsername(username) {
    return username.startsWith('@') ? username : `@${username}`;
  },

  isValidSolanaAddress(address) {
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
  },

  isRegistered() {
    return localStorage.getItem('mfrog_registered') === 'true';
  }
};

// Inicjalizacja aplikacji
document.addEventListener('DOMContentLoaded', () => {
  MetaFrogApp.init();
});

// Funkcja kopiowania linku referalnego
window.copyReferralLink = function() {
  if (!localStorage.getItem('mfrog_registered')) {
    MetaFrogApp.showAlert('Najpierw zakończ rejestrację', 'warning');
    return;
  }

  const wallet = localStorage.getItem('mfrog_wallet');
  const referralLink = `${window.location.origin}${window.location.pathname}?ref=${wallet}`;

  navigator.clipboard.writeText(referralLink)
    .then(() => MetaFrogApp.showAlert('Skopiowano link referencyjny!', 'success'))
    .catch(() => MetaFrogApp.showAlert('Błąd kopiowania', 'error'));
};
