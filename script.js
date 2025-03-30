/**
 * MetaFrog - Complete Website Script
 * Version 4.6.2 - Final Fixes
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
  isProcessing: false,
  db: null,
  auth: null,
  realtimeDb: null,

  async initializeFirebase() {
    try {
      if (typeof firebase === 'undefined') {
        await this.loadFirebaseDependencies();
      }

      const app = firebase.initializeApp(firebaseConfig);
      this.db = app.firestore();
      this.auth = app.auth();
      this.realtimeDb = app.database();

      await this.auth.signInAnonymously();
      return true;
    } catch (error) {
      console.error('Firebase init error:', error);
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
      const firebaseReady = await this.initializeFirebase();
      
      this.setupNavigation();
      this.scrollToTop(true);
      
      if (firebaseReady) {
        this.setupAirdropForm();
        this.setupFormValidation();
        this.setupUsernameFormatting();
        this.checkVerificationStatus();
        this.initializeAirdropSteps();
      }
    } catch (error) {
      console.error('Init error:', error);
    }
  },

  // ======================
  // FORM HANDLING - FIXED VERSION
  // ======================
  async handleAirdropForm(e) {
    e.preventDefault();
    
    if (this.isProcessing) return;
    this.isProcessing = true;
    
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;
    
    // Ustawienie stanu ładowania
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> Processing...';
    
    try {
      const formData = {
        wallet: form.wallet.value.trim(),
        xUsername: form.xUsername.value.trim(),
        telegram: form.telegram.value.trim(),
        tiktok: form.tiktok.value.trim() || 'N/A'
      };

      // Walidacja
      if (!formData.wallet || !formData.xUsername || !formData.telegram) {
        throw new Error('Please fill all required fields');
      }

      if (!this.isValidSolanaAddress(formData.wallet)) {
        throw new Error('Invalid Solana wallet address');
      }

      // Formatowanie nazw użytkowników
      if (!formData.xUsername.startsWith('@')) formData.xUsername = '@' + formData.xUsername;
      if (!formData.telegram.startsWith('@')) formData.telegram = '@' + formData.telegram;
      if (formData.tiktok !== 'N/A' && !formData.tiktok.startsWith('@')) {
        formData.tiktok = '@' + formData.tiktok;
      }

      const submissionData = {
        ...formData,
        status: 'pending',
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        ip: await this.getIP()
      };

      // Zapis do Firebase
      await Promise.all([
        this.db.collection('airdropParticipants').doc(formData.wallet).set(submissionData),
        this.realtimeDb.ref(`airdropSubmissions/${formData.wallet.replace(/\./g, '_')}`).set(submissionData)
      ]);

      // Aktualizacja kroków
      this.updateStepStatus(1, 'completed');
      this.updateStepStatus(2, 'active');
      this.updateStepStatus(3, 'pending');
      
      // Komunikat i zapis w localStorage
      this.showAlert('✅ Registration successful!', 'success');
      localStorage.setItem('mfrog_registered', 'true');

    } catch (error) {
      console.error('Submission error:', error);
      this.showAlert(`❌ ${error.message}`, 'error');
    } finally {
      // Przywrócenie przycisku
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnText;
      this.isProcessing = false;
    }
  },

  // ======================
  // STEP MANAGEMENT
  // ======================
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
      step.classList.remove('completed', 'active', 'pending');
      step.classList.add(status);
      
      const statusElement = step.querySelector('.step-status');
      if (statusElement) {
        statusElement.textContent = status.toUpperCase();
      }
    }
  },

  checkVerificationStatus() {
    const wallet = document.getElementById('wallet')?.value.trim();
    if (!wallet) return;

    if (localStorage.getItem('mfrog_registered')) {
      this.updateStepStatus(1, 'completed');
      this.updateStepStatus(2, 'active');
      this.updateStepStatus(3, 'pending');
    }
  },

  // ======================
  // UTILITIES
  // ======================
  isValidSolanaAddress(address) {
    return address.length >= 32 && address.length <= 44 && 
           /^[A-HJ-NP-Za-km-z1-9]*$/.test(address);
  },

  async getIP() {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch {
      return 'unknown';
    }
  },

  showAlert(message, type) {
    const alert = document.createElement('div');
    alert.className = `alert ${type}`;
    alert.innerHTML = message;
    document.body.appendChild(alert);
    
    setTimeout(() => {
      alert.remove();
    }, 5000);
  },

  setupFormValidation() {
    const walletInput = document.getElementById('wallet');
    if (walletInput) {
      walletInput.addEventListener('blur', () => {
        if (walletInput.value && !this.isValidSolanaAddress(walletInput.value)) {
          walletInput.classList.add('invalid');
        } else {
          walletInput.classList.remove('invalid');
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

  loadScript(url) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
};

// Inicjalizacja
document.addEventListener('DOMContentLoaded', () => {
  MetaFrogApp.init();
});

// Style
const style = document.createElement('style');
style.textContent = `
  .spinner {
    display: inline-block;
    width: 1em;
    height: 1em;
    border: 2px solid rgba(255,255,255,0.3);
    border-radius: 50%;
    border-top-color: #fff;
    animation: spin 1s ease-in-out infinite;
    margin-right: 8px;
    vertical-align: middle;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .alert {
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 25px;
    border-radius: 8px;
    color: white;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 1000;
    animation: slideIn 0.3s forwards;
  }

  .alert.success {
    background: #4CAF50;
  }

  .alert.error {
    background: #f44336;
  }

  @keyframes slideIn {
    from { transform: translateX(100%); }
    to { transform: translateX(0); }
  }

  .step-card.completed {
    border-color: #4CAF50;
    background: rgba(76, 175, 80, 0.1);
  }

  .step-card.active {
    border-color: #2196F3;
    background: rgba(33, 150, 243, 0.1);
  }

  .step-card.pending {
    opacity: 0.7;
  }

  .invalid {
    border-color: #f44336 !important;
  }
`;
document.head.appendChild(style);
