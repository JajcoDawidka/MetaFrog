/**
 * MetaFrog - Complete Website Script
 * Version 4.6 - Full Integration
 */

const firebaseConfig = {
  apiKey: "AIzaSyAR6Ha8baMX5EPsPVayTno0e0QBRqZrmco",
  authDomain: "metafrog-airdrop.firebaseapp.com",
  projectId: "metafrog-airdrop",
  storageBucket: "metafrog-airdrop.appspot.com",
  messagingSenderId: "546707737127",
  appId: "1:546707737127:web:67956ae63ffef3ebeddc02",
  measurementId: "G-2Z78VYL739",
  databaseURL: "https://metafrog-airdrop-default-rtdb.firebaseio.com"
};

const MetaFrogApp = {
  debugMode: false,
  isProcessing: false,
  db: null,
  auth: null,
  realtimeDb: null,

  async initializeFirebase() {
    try {
      // Dynamiczne ładowanie brakujących bibliotek
      if (typeof firebase === 'undefined') {
        await this.loadFirebaseDependencies();
      }

      // Inicjalizacja Firebase
      const app = firebase.initializeApp(firebaseConfig);
      this.db = app.firestore();
      this.auth = app.auth();
      this.realtimeDb = app.database();

      // Logowanie anonimowe
      await this.auth.signInAnonymously();
      console.log('Firebase initialized successfully');
      return true;
    } catch (error) {
      console.error('Firebase initialization failed:', error);
      return false;
    }
  },

  async loadFirebaseDependencies() {
    const firebaseScripts = [
      'https://www.gstatic.com/firebasejs/9.6.0/firebase-app-compat.js',
      'https://www.gstatic.com/firebasejs/9.6.0/firebase-firestore-compat.js',
      'https://www.gstatic.com/firebasejs/9.6.0/firebase-auth-compat.js',
      'https://www.gstatic.com/firebasejs/9.6.0/firebase-database-compat.js'
    ];

    await Promise.all(firebaseScripts.map(url => this.loadScript(url)));
  },

  async init() {
    try {
      // Inicjalizacja Firebase
      const firebaseReady = await this.initializeFirebase();
      
      // Podstawowe funkcje UI
      this.setupNavigation();
      this.scrollToTop(true);
      
      // Funkcje zależne od Firebase
      if (firebaseReady) {
        this.setupAirdropForm();
        this.setupFormValidation();
        this.setupUsernameFormatting();
        this.checkVerificationStatus();
        this.initializeAirdropSteps();
      } else {
        this.showAlert('⚠️ Running in limited mode (database offline)', 'warning');
      }

    } catch (error) {
      console.error('App initialization failed:', error);
      this.showEmergencyMode();
    }
  },

  // ======================
  // CORE FUNCTIONALITY
  // ======================
  setupNavigation() {
    document.querySelectorAll('nav a').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const sectionId = e.target.getAttribute('href').substring(1);
        this.showSection(sectionId);
        this.scrollToTop();
      });
    });
  },

  showSection(sectionId) {
    document.querySelectorAll('.section').forEach(section => {
      section.classList.remove('active');
    });
    const section = document.getElementById(sectionId);
    if (section) {
      section.classList.add('active');
      history.pushState(null, null, `#${sectionId}`);
    }
  },

  scrollToTop(force = false) {
    if (force || window.pageYOffset > 0) {
      window.scrollTo({
        top: 0,
        behavior: force ? 'auto' : 'smooth'
      });
    }
  },

  // ======================
  // AIRDROP FUNCTIONALITY
  // ======================
  setupAirdropForm() {
    const form = document.querySelector('.airdrop-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleAirdropForm(e);
      });
    }
  },

  async handleAirdropForm(e) {
    if (this.isProcessing) return;
    this.isProcessing = true;
    this.toggleSubmitButton(true);

    try {
      const wallet = document.getElementById('wallet').value.trim();
      const xUsername = document.getElementById('xUsername').value.trim();
      const telegram = document.getElementById('telegram').value.trim();
      const tiktok = document.getElementById('tiktok').value.trim();

      // Walidacja
      if (!wallet || !xUsername || !telegram) {
        throw new Error('Please fill all required fields');
      }

      if (!this.isValidSolanaAddress(wallet)) {
        throw new Error('Invalid Solana wallet address');
      }

      const submissionData = {
        wallet,
        xUsername: xUsername.startsWith('@') ? xUsername : `@${xUsername}`,
        telegram: telegram.startsWith('@') ? telegram : `@${telegram}`,
        tiktok: tiktok ? (tiktok.startsWith('@') ? tiktok : `@${tiktok}`) : 'N/A',
        status: 'pending',
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        ip: await this.getIP()
      };

      // Zapis do Firestore i Realtime Database
      await Promise.all([
        this.db.collection('airdropParticipants').doc(wallet).set(submissionData),
        this.realtimeDb.ref(`airdropSubmissions/${wallet.replace(/\./g, '_')}`).set(submissionData)
      ]);

      // Aktualizacja UI - POPRAWIONE
      this.updateStepStatus(1, 'completed');
      this.updateStepStatus(2, 'active');
      this.updateStepStatus(3, 'pending');
      
      // Wyświetlenie komunikatu sukcesu
      this.showAlert('✅ Registration successful! Please complete the next steps.', 'success');
      localStorage.setItem('mfrog_registered', 'true');

      // Reset formularza
      e.target.reset();

    } catch (error) {
      console.error('Submission error:', error);
      let message = error.message;
      if (error.code === 'permission-denied') {
        message = 'Database permissions issue. Please refresh the page.';
      }
      this.showAlert(`❌ ${message}`, 'error');
      
      // Przywrócenie poprzedniego stanu kroków w przypadku błędu
      this.updateStepStatus(1, 'active');
      this.updateStepStatus(2, 'pending');
      this.updateStepStatus(3, 'pending');
    } finally {
      this.isProcessing = false;
      this.toggleSubmitButton(false);
    }
  },

  initializeAirdropSteps() {
    const steps = document.querySelectorAll('.step-card');
    steps.forEach((step, index) => {
      const status = index === 0 ? 'active' : 'pending';
      this.updateStepElement(step, status);
    });
  },

  updateStepStatus(stepNumber, status) {
    const step = document.querySelector(`.step-card:nth-child(${stepNumber})`);
    if (step) {
      this.updateStepElement(step, status);
    }
  },

  checkVerificationStatus() {
    const wallet = document.getElementById('wallet')?.value.trim();
    if (!wallet) return;

    if (localStorage.getItem('mfrog_registered')) {
      this.updateStepStatus(1, 'completed');
      this.updateStepStatus(2, 'active');
      this.updateStepStatus(3, 'pending');
      return;
    }

    if (this.db) {
      this.db.collection('airdropParticipants').doc(wallet).get()
        .then(doc => {
          if (doc.exists && doc.data().status === 'registered') {
            this.updateStepStatus(1, 'completed');
            this.updateStepStatus(2, 'active');
            this.updateStepStatus(3, 'pending');
            localStorage.setItem('mfrog_registered', 'true');
          }
        })
        .catch(error => console.error('Status check error:', error));
    }
  },

  // ======================
  // UTILITIES
  // ======================
  async getIP() {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip || 'unknown';
    } catch {
      return 'unknown';
    }
  },

  isValidSolanaAddress(address) {
    return address.length >= 32 && address.length <= 44 && 
           /^[A-HJ-NP-Za-km-z1-9]*$/.test(address);
  },

  showAlert(message, type = 'error') {
    const alert = document.createElement('div');
    alert.className = `mfrog-alert ${type}`;
    alert.innerHTML = `<div class="mfrog-alert-content">${message}</div>`;
    document.body.appendChild(alert);
    
    setTimeout(() => {
      alert.classList.add('fade-out');
      setTimeout(() => alert.remove(), 500);
    }, 5000);
  },

  toggleSubmitButton(loading) {
    const submitBtn = document.querySelector('.airdrop-form button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = loading;
      submitBtn.innerHTML = loading 
        ? '<i class="fas fa-spinner fa-spin"></i> Processing...' 
        : 'Submit & Continue';
        
      // Dodanie stylów dla lepszej widoczności
      if (loading) {
        submitBtn.style.opacity = '0.7';
        submitBtn.style.cursor = 'not-allowed';
      } else {
        submitBtn.style.opacity = '1';
        submitBtn.style.cursor = 'pointer';
      }
    }
  },

  setupFormValidation() {
    const walletInput = document.getElementById('wallet');
    if (walletInput) {
      walletInput.addEventListener('blur', () => {
        if (walletInput.value && !this.isValidSolanaAddress(walletInput.value)) {
          walletInput.style.borderColor = 'red';
          this.showAlert('Invalid Solana wallet address', 'error');
        } else {
          walletInput.style.borderColor = '';
        }
      });
    }
  },

  setupUsernameFormatting() {
    ['xUsername', 'telegram', 'tiktok'].forEach(id => {
      const input = document.getElementById(id);
      if (input) {
        input.addEventListener('blur', () => {
          if (input.value && !input.value.startsWith('@')) {
            input.value = `@${input.value}`;
          }
        });
      }
    });
  },

  copyReferralLink() {
    const link = `${window.location.origin}${window.location.pathname}?ref=${this.generateReferralCode()}`;
    navigator.clipboard.writeText(link)
      .then(() => this.showAlert('✅ Referral link copied!', 'success'))
      .catch(err => {
        console.error('Copy error:', err);
        this.showAlert('❌ Failed to copy link', 'error');
      });
  },

  generateReferralCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  },

  // ======================
  // FALLBACK SYSTEMS
  // ======================
  loadScript(url) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Failed to load script: ${url}`));
      document.head.appendChild(script);
    });
  },

  showEmergencyMode() {
    document.body.classList.add('firebase-error');
    this.showAlert('⚠️ System is running in limited mode. Some features may not work.', 'warning');
    
    const form = document.querySelector('.airdrop-form');
    if (form) {
      form.querySelector('button[type="submit"]').disabled = true;
      form.innerHTML += '<p class="error-message">Form submission temporarily unavailable</p>';
    }
  },

  updateStepElement(element, status) {
    element.classList.remove('completed-step', 'active-step', 'pending-step');
    element.classList.add(`${status}-step`);
    
    const statusElement = element.querySelector('.step-status');
    if (statusElement) {
      statusElement.textContent = status.toUpperCase();
    }
  }
};

// Inicjalizacja aplikacji
document.addEventListener('DOMContentLoaded', () => {
  MetaFrogApp.init().catch(error => {
    console.error('Critical initialization error:', error);
    MetaFrogApp.showEmergencyMode();
  });
});

// Dodanie styli
const style = document.createElement('style');
style.textContent = `
  .mfrog-alert {
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 25px;
    border-radius: 8px;
    color: white;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 10000;
    transform: translateX(200%);
    animation: slideIn 0.5s forwards;
    max-width: 350px;
  }
  
  .mfrog-alert.success {
    background: #4CAF50;
    border-left: 5px solid #2E7D32;
  }
  
  .mfrog-alert.error {
    background: #f44336;
    border-left: 5px solid #c62828;
  }
  
  .mfrog-alert.warning {
    background: #ff9800;
    border-left: 5px solid #e65100;
  }
  
  .mfrog-alert-content {
    line-height: 1.5;
  }
  
  .mfrog-alert.fade-out {
    animation: fadeOut 0.5s forwards;
  }
  
  .error-message {
    color: #ff4444;
    margin-top: 15px;
    font-weight: bold;
  }
  
  body.firebase-error .section:not(.active) {
    opacity: 0.5;
    pointer-events: none;
  }
  
  @keyframes slideIn {
    to { transform: translateX(0); }
  }
  
  @keyframes fadeOut {
    to { opacity: 0; transform: translateX(200%); }
  }
  
  .completed-step {
    border-color: #4CAF50 !important;
    background: linear-gradient(135deg, #1a1a1a, #0a2e0a) !important;
  }
  
  .completed-step .step-number {
    background: #4CAF50 !important;
    border-color: #4CAF50 !important;
  }
  
  .completed-step h3 {
    color: #4CAF50 !important;
  }
  
  .completed-step .step-status {
    background: rgba(76, 175, 80, 0.2) !important;
    color: #4CAF50 !important;
  }
  
  .active-step {
    border-color: #2196F3 !important;
    background: linear-gradient(135deg, #1a1a1a, #0a1a2e) !important;
  }
  
  .active-step .step-number {
    background: #2196F3 !important;
    border-color: #2196F3 !important;
  }
  
  .active-step h3 {
    color: #2196F3 !important;
  }
  
  .active-step .step-status {
    background: rgba(33, 150, 243, 0.2) !important;
    color: #2196F3 !important;
  }
`;
document.head.appendChild(style);
