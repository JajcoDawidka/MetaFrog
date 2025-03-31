/**
 * MetaFrog - Final Working Version
 * Full Firebase Integration
 */

// Firebase configuration
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
      // Initialize Firebase
      await this.loadFirebase();
      
      // Setup application
      this.setupNavigation();
      this.setupAirdropForm();
      this.initializeSteps();
      
      // Show initial section
      this.showSection(window.location.hash.substring(1) || 'home');
      
    } catch (error) {
      console.error('Initialization error:', error);
      this.showEmergencyMode();
    }
  },

  async loadFirebase() {
    // Load Firebase SDK if not already loaded
    if (typeof firebase === 'undefined') {
      await this.loadScript('https://www.gstatic.com/firebasejs/9.6.0/firebase-app-compat.js');
      await this.loadScript('https://www.gstatic.com/firebasejs/9.6.0/firebase-firestore-compat.js');
      await this.loadScript('https://www.gstatic.com/firebasejs/9.6.0/firebase-database-compat.js');
    }

    // Initialize Firebase
    const app = firebase.initializeApp(firebaseConfig);
    this.db = app.firestore();
    this.realtimeDb = app.database();
  },

  // Navigation
  setupNavigation() {
    document.querySelectorAll('nav a').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const sectionId = e.target.getAttribute('href').substring(1);
        this.showSection(sectionId);
      });
    });
  },

  showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
      section.style.display = 'none';
    });

    // Show requested section
    const section = document.getElementById(sectionId);
    if (section) {
      section.style.display = 'block';
      window.scrollTo(0, 0);
      history.pushState(null, null, `#${sectionId}`);
    }
  },

  // Form handling
  setupAirdropForm() {
    const form = document.querySelector('.airdrop-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleFormSubmit(e.target);
      });
    }
  },

  async handleFormSubmit(form) {
    if (this.isProcessing) return;
    
    const submitBtn = form.querySelector('button[type="submit"]');
    this.isProcessing = true;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> Processing...';

    try {
      const formData = this.getFormData(form);
      await this.saveToFirebase(formData);
      this.updateUIAfterSubmission();
    } catch (error) {
      this.showError(error);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit';
      this.isProcessing = false;
    }
  },

  getFormData(form) {
    const data = {
      wallet: form.wallet.value.trim(),
      xUsername: this.formatUsername(form.xUsername.value.trim()),
      telegram: this.formatUsername(form.telegram.value.trim()),
      tiktok: form.tiktok.value.trim() ? this.formatUsername(form.tiktok.value.trim()) : 'N/A',
      status: 'pending',
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      ip: 'unknown' // Removed external API call for Vercel compatibility
    };

    // Validation
    if (!data.wallet || !data.xUsername || !data.telegram) {
      throw new Error('Please fill all required fields');
    }

    if (!this.isValidSolanaAddress(data.wallet)) {
      throw new Error('Invalid Solana wallet address');
    }

    return data;
  },

  formatUsername(username) {
    return username.startsWith('@') ? username : `@${username}`;
  },

  isValidSolanaAddress(address) {
    return address.length >= 32 && address.length <= 44 && 
           /^[A-HJ-NP-Za-km-z1-9]*$/.test(address);
  },

  async saveToFirebase(data) {
    await Promise.all([
      this.db.collection('airdropParticipants').doc(data.wallet).set(data),
      this.realtimeDb.ref(`airdropSubmissions/${data.wallet.replace(/\./g, '_')}`).set(data)
    ]);
  },

  updateUIAfterSubmission() {
    document.querySelectorAll('.step-card').forEach((step, index) => {
      step.className = `step-card ${index === 0 ? 'completed' : index === 1 ? 'active' : 'pending'}`;
    });
    this.showAlert('✅ Registration successful!');
    localStorage.setItem('mfrog_registered', 'true');
  },

  // Steps management
  initializeSteps() {
    if (localStorage.getItem('mfrog_registered')) {
      document.querySelectorAll('.step-card').forEach((step, index) => {
        step.className = `step-card ${index === 0 ? 'completed' : index === 1 ? 'active' : 'pending'}`;
      });
    } else {
      document.querySelectorAll('.step-card').forEach((step, index) => {
        step.className = `step-card ${index === 0 ? 'active' : 'pending'}`;
      });
    }
  },

  // Utilities
  loadScript(url) {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = url;
      script.onload = resolve;
      document.head.appendChild(script);
    });
  },

  showAlert(message, type = 'success') {
    const alert = document.createElement('div');
    alert.className = `alert ${type}`;
    alert.textContent = message;
    document.body.appendChild(alert);
    setTimeout(() => alert.remove(), 3000);
  },

  showError(error) {
    console.error('Error:', error);
    this.showAlert(`❌ ${error.message}`, 'error');
  },

  showEmergencyMode() {
    const submitBtn = document.querySelector('.airdrop-form button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Service unavailable';
    }
    this.showAlert('⚠️ System is in maintenance mode', 'error');
  },

  copyReferralLink() {
    const link = `${window.location.origin}${window.location.pathname}?ref=MFROG${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    navigator.clipboard.writeText(link)
      .then(() => this.showAlert('✅ Referral link copied!'))
      .catch(err => this.showError(err));
  }
};

// Initialize application
document.addEventListener('DOMContentLoaded', () => MetaFrogApp.init());
window.addEventListener('popstate', () => {
  const sectionId = window.location.hash.substring(1) || 'home';
  MetaFrogApp.showSection(sectionId);
});

// Add copy referral link functionality
document.querySelectorAll('.task-link').forEach(link => {
  if (link.textContent.includes('Copy Referral Link')) {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      MetaFrogApp.copyReferralLink();
    });
  }
});

// Na końcu pliku
console.log('MetaFrog initialized');
if (typeof firebase !== 'undefined') {
  console.log('Firebase loaded successfully');
} else {
  console.warn('Firebase not loaded');
}
