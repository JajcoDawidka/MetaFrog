/**
 * MetaFrog - Complete Website Script
 * Version 4.6.4 - Fixed Navigation
 */

const firebaseConfig = {
  apiKey: "AIzaSyAR6Ha8baMX5EPsPVayTno0e0QBRqZrmco",
  authDomain: "metafrog-airdrop.firebaseapp.com",
  projectId: "metafrog-airdrop",
  storageBucket: "metafrog-airdrop.appspot.com",
  messagingSenderId: "546707737127",
  appId: "1:546707737127:web:67956ae63ffef3ebeddc02",
  measurementId: "G-2Z78VYL739",
  databaseURL: "https://metafrog-airdrop-default-rtdb.europe-west1.firebasedatabase.app"
};

const MetaFrogApp = {
  isProcessing: false,
  db: null,
  realtimeDb: null,

  async initializeFirebase() {
    try {
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
      
      this.setupNavigation(); // Inicjalizacja nawigacji
      this.setupAirdropForm();
      this.initializeAirdropSteps();
      
      // Pokazujemy sekcję na podstawie hash w URL
      const currentSection = window.location.hash.substring(1) || 'home';
      this.showSection(currentSection);
      
    } catch (error) {
      console.error('Initialization error:', error);
      this.showEmergencyMode();
    }
  },

  // ======================
  // NAVIGATION FIXED VERSION
  // ======================
  setupNavigation() {
    document.querySelectorAll('nav a').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const sectionId = e.target.getAttribute('href').substring(1);
        this.showSection(sectionId);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });
  },

  showSection(sectionId) {
    // Ukrywamy wszystkie sekcje
    document.querySelectorAll('.section').forEach(section => {
      section.classList.remove('active');
    });
    
    // Pokazujemy wybraną sekcję
    const section = document.getElementById(sectionId);
    if (section) {
      section.classList.add('active');
      history.pushState(null, null, `#${sectionId}`);
    }
  },

  // ======================
  // FORM HANDLING
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

      await this.db.collection('airdropParticipants').doc(wallet).set(submissionData);
      
      // Aktualizacja kroków
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

// Inicjalizacja aplikacji
document.addEventListener('DOMContentLoaded', () => {
  MetaFrogApp.init();
});

// Obsługa przycisków powrotu/naprzód w przeglądarce
window.addEventListener('popstate', () => {
  const currentSection = window.location.hash.substring(1) || 'home';
  MetaFrogApp.showSection(currentSection);
});

// Wbudowane style
const style = document.createElement('style');
style.textContent = `
  /* Style dla nawigacji */
  .section {
    display: none;
  }
  .section.active {
    display: block;
    animation: fadeIn 0.3s ease-out;
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  /* Style dla alertów */
  .alert {
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 24px;
    border-radius: 4px;
    color: white;
    z-index: 1000;
    animation: slideIn 0.3s forwards;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
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
  
  /* Style dla kroków */
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
  
  /* Style dla przycisków */
  button[disabled] {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;
document.head.appendChild(style);
