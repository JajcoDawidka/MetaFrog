/**
 * MetaFrog - Complete Website Script
 * Version 4.6.5 - Vercel Compatible
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
  async initializeFirebase() {
    try {
      if (typeof firebase === 'undefined') {
        await Promise.all([
          this.loadScript('https://www.gstatic.com/firebasejs/9.6.0/firebase-app-compat.js'),
          this.loadScript('https://www.gstatic.com/firebasejs/9.6.0/firebase-firestore-compat.js'),
          this.loadScript('https://www.gstatic.com/firebasejs/9.6.0/firebase-database-compat.js')
        ]);
      }
      
      const app = firebase.initializeApp(firebaseConfig);
      this.db = app.firestore();
      this.realtimeDb = app.database();
      return true;
    } catch (error) {
      console.error('Firebase initialization failed:', error);
      return false;
    }
  },

  async init() {
    try {
      // Initialize Firebase
      const firebaseReady = await this.initializeFirebase();
      
      // Setup core functionality
      this.setupNavigation();
      this.setupAirdropForm();
      this.initializeAirdropSteps();
      
      // Show initial section
      const hash = window.location.hash.substring(1);
      this.showSection(hash || 'home');
      
    } catch (error) {
      console.error('App initialization failed:', error);
      this.showEmergencyMode();
    }
  },

  // Navigation
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
    document.querySelectorAll('.section').forEach(section => {
      section.classList.remove('active');
    });
    
    const section = document.getElementById(sectionId);
    if (section) {
      section.classList.add('active');
      history.pushState(null, null, `#${sectionId}`);
    }
  },

  // Airdrop Form
  async handleAirdropForm(e) {
    e.preventDefault();
    
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    if (!submitBtn || this.isProcessing) return;
    
    this.isProcessing = true;
    submitBtn.disabled = true;
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Processing...';

    try {
      const formData = {
        wallet: form.wallet.value.trim(),
        xUsername: form.xUsername.value.trim(),
        telegram: form.telegram.value.trim(),
        tiktok: form.tiktok.value.trim() || 'N/A'
      };

      // Validation
      if (!formData.wallet || !formData.xUsername || !formData.telegram) {
        throw new Error('Please fill all required fields');
      }

      // Save to Firebase
      await this.db.collection('airdropParticipants').doc(formData.wallet).set({
        ...formData,
        status: 'pending',
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });

      // Update UI
      this.updateStepStatus(1, 'completed');
      this.updateStepStatus(2, 'active');
      this.showAlert('Registration successful!');
      
    } catch (error) {
      console.error('Form submission error:', error);
      this.showAlert(`Error: ${error.message}`, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
      this.isProcessing = false;
    }
  },

  // Steps Management
  initializeAirdropSteps() {
    document.querySelectorAll('.step-card').forEach((step, index) => {
      this.updateStepElement(step, index === 0 ? 'active' : 'pending');
    });
  },

  updateStepStatus(stepNumber, status) {
    const step = document.querySelector(`.step-card:nth-child(${stepNumber})`);
    if (step) this.updateStepElement(step, status);
  },

  updateStepElement(element, status) {
    element.classList.remove('completed', 'active', 'pending');
    element.classList.add(status);
  },

  // Utilities
  showAlert(message, type = 'success') {
    const alert = document.createElement('div');
    alert.className = `alert ${type}`;
    alert.textContent = message;
    document.body.appendChild(alert);
    setTimeout(() => alert.remove(), 3000);
  },

  setupAirdropForm() {
    const form = document.querySelector('.airdrop-form');
    if (form) form.addEventListener('submit', (e) => this.handleAirdropForm(e));
  },

  loadScript(url) {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = url;
      script.onload = resolve;
      script.onerror = () => console.error(`Failed to load script: ${url}`);
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

// Initialize
document.addEventListener('DOMContentLoaded', () => MetaFrogApp.init());
window.addEventListener('popstate', () => {
  const sectionId = window.location.hash.substring(1) || 'home';
  MetaFrogApp.showSection(sectionId);
});

// Inline Styles
const style = document.createElement('style');
style.textContent = `
  .section { display: none; }
  .section.active { display: block; animation: fadeIn 0.3s; }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  
  .alert {
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 24px;
    border-radius: 4px;
    color: white;
    z-index: 1000;
    animation: slideIn 0.3s;
  }
  .alert.success { background: #4CAF50; }
  .alert.error { background: #f44336; }
  
  .step-card.completed { border-left: 4px solid #4CAF50; }
  .step-card.active { border-left: 4px solid #2196F3; }
  .step-card.pending { opacity: 0.6; }
  
  button[disabled] { opacity: 0.7; cursor: not-allowed; }
`;
document.head.appendChild(style);
