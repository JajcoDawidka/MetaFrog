/**
 * MetaFrog - Complete Website Script
 * Version 4.6.3 - CSP Compatible
 */

const firebaseConfig = {
  apiKey: "AIzaSyAR6Ha8baMX5EPsPVayTno0e0QBRqZrmco",
  authDomain: "metafrog-airdrop.firebaseapp.com",
  projectId: "metafrog-airdrop",
  storageBucket: "metafrog-airdrop.appspot.com",
  messagingSenderId: "546707737127",
  appId: "1:546707737127:web:67956ae63ffef3ebeddc02",
  measurementId: "G-2Z78VYL739",
  databaseURL: "https://metafrog-airdrop-default-rtdb.europe-west1.firebasedatabase.app" // Poprawiony URL
};

const MetaFrogApp = {
  isProcessing: false,

  async initializeFirebase() {
    try {
      // Dynamiczne ładowanie tylko brakujących skryptów
      if (typeof firebase === 'undefined') {
        await this.loadScript('https://www.gstatic.com/firebasejs/9.6.0/firebase-app-compat.js');
        await this.loadScript('https://www.gstatic.com/firebasejs/9.6.0/firebase-firestore-compat.js');
        await this.loadScript('https://www.gstatic.com/firebasejs/9.6.0/firebase-database-compat.js');
      }

      const app = firebase.initializeApp(firebaseConfig);
      this.db = app.firestore();
      this.realtimeDb = app.database();
      return true;
    } catch (error) {
      console.error('Firebase init error:', error);
      return false;
    }
  },

  async init() {
    try {
      const firebaseReady = await this.initializeFirebase();
      if (!firebaseReady) throw new Error('Firebase initialization failed');
      
      this.setupAirdropForm();
      this.initializeAirdropSteps();
    } catch (error) {
      console.error('Initialization error:', error);
      this.showEmergencyMode();
    }
  },

  // ======================
  // FORM HANDLING - SIMPLIFIED
  // ======================
  async handleAirdropForm(e) {
    e.preventDefault();
    if (this.isProcessing) return;
    
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Processing...';
    this.isProcessing = true;

    try {
      const wallet = form.wallet.value.trim();
      const xUsername = form.xUsername.value.trim();
      const telegram = form.telegram.value.trim();
      const tiktok = form.tiktok.value.trim() || 'N/A';

      // Basic validation
      if (!wallet || !xUsername || !telegram) {
        throw new Error('Please fill all required fields');
      }

      const submissionData = {
        wallet,
        xUsername: xUsername.startsWith('@') ? xUsername : `@${xUsername}`,
        telegram: telegram.startsWith('@') ? telegram : `@${telegram}`,
        tiktok: tiktok !== 'N/A' && !tiktok.startsWith('@') ? `@${tiktok}` : tiktok,
        status: 'pending',
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      };

      // Single write operation
      await this.db.collection('airdropParticipants').doc(wallet).set(submissionData);
      
      // Update UI
      document.querySelectorAll('.step-card').forEach((step, index) => {
        step.classList.remove('completed', 'active', 'pending');
        step.classList.add(index === 0 ? 'completed' : index === 1 ? 'active' : 'pending');
      });

      this.showAlert('Registration successful!');
      localStorage.setItem('mfrog_registered', 'true');

    } catch (error) {
      console.error('Submission error:', error);
      this.showAlert(`Error: ${error.message}`, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Submit';
      this.isProcessing = false;
    }
  },

  // ======================
  // UTILITIES
  // ======================
  showAlert(message, type = 'success') {
    const alert = document.createElement('div');
    alert.className = `alert ${type}`;
    alert.textContent = message;
    document.body.appendChild(alert);
    setTimeout(() => alert.remove(), 3000);
  },

  setupAirdropForm() {
    const form = document.querySelector('.airdrop-form');
    if (form) {
      form.addEventListener('submit', (e) => this.handleAirdropForm(e));
    }
  },

  initializeAirdropSteps() {
    const steps = document.querySelectorAll('.step-card');
    steps.forEach((step, index) => {
      step.classList.add(index === 0 ? 'active' : 'pending');
    });
  },

  loadScript(url) {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = url;
      script.onload = resolve;
      script.onerror = () => console.error('Failed to load script:', url);
      document.head.appendChild(script);
    });
  },

  showEmergencyMode() {
    const submitBtn = document.querySelector('.airdrop-form button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Service unavailable';
    }
    this.showAlert('System is in maintenance mode', 'error');
  }
};

// Inicjalizacja
document.addEventListener('DOMContentLoaded', () => {
  MetaFrogApp.init();
});

// Wbudowane style
const style = document.createElement('style');
style.textContent = `
  .alert {
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 24px;
    border-radius: 4px;
    color: white;
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
    border-left: 4px solid #4CAF50;
    background: rgba(76, 175, 80, 0.05);
  }
  .step-card.active {
    border-left: 4px solid #2196F3;
    background: rgba(33, 150, 243, 0.05);
  }
  .step-card.pending {
    opacity: 0.6;
  }
  button[disabled] {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;
document.head.appendChild(style);
