/**
 * MetaFrog - Final Working Version
 * Compatible with Vercel Deployment
 */

// Firebase configuration - ensure all URLs are HTTPS
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
  async initialize() {
    try {
      // Load Firebase only if not already loaded
      if (typeof firebase === 'undefined') {
        await this.loadDependencies();
      }

      // Initialize Firebase
      firebase.initializeApp(firebaseConfig);
      this.db = firebase.firestore();
      this.realtimeDb = firebase.database();

      // Setup application
      this.setupNavigation();
      this.setupAirdropForm();
      this.initializeSteps();

      // Show initial section
      this.showSection(window.location.hash.substring(1) || 'home');

      return true;
    } catch (error) {
      console.error('Initialization error:', error);
      this.showEmergencyMode();
      return false;
    }
  },

  async loadDependencies() {
    const firebaseSDK = [
      'https://www.gstatic.com/firebasejs/9.6.0/firebase-app-compat.js',
      'https://www.gstatic.com/firebasejs/9.6.0/firebase-firestore-compat.js',
      'https://www.gstatic.com/firebasejs/9.6.0/firebase-database-compat.js'
    ];

    await Promise.all(firebaseSDK.map(url => this.loadScript(url)));
  },

  // Navigation system
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
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.processForm(e.target);
      });
    }
  },

  async processForm(form) {
    const submitBtn = form.querySelector('button[type="submit"]');
    if (!submitBtn || this.isProcessing) return;

    this.isProcessing = true;
    submitBtn.disabled = true;
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Processing...';

    try {
      const formData = this.getFormData(form);
      await this.saveToFirebase(formData);
      this.updateUIAfterSubmission();
    } catch (error) {
      this.showError(error);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
      this.isProcessing = false;
    }
  },

  getFormData(form) {
    const data = {
      wallet: form.wallet.value.trim(),
      xUsername: form.xUsername.value.trim(),
      telegram: form.telegram.value.trim(),
      tiktok: form.tiktok.value.trim() || 'N/A',
      status: 'pending',
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };

    // Validate
    if (!data.wallet || !data.xUsername || !data.telegram) {
      throw new Error('Please fill all required fields');
    }

    return data;
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
    this.showAlert('Registration successful!');
  },

  // Steps management
  initializeSteps() {
    document.querySelectorAll('.step-card').forEach((step, index) => {
      step.className = `step-card ${index === 0 ? 'active' : 'pending'}`;
    });
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
    this.showAlert(`Error: ${error.message}`, 'error');
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

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
  MetaFrogApp.initialize();
});

// Handle browser navigation
window.addEventListener('popstate', () => {
  const sectionId = window.location.hash.substring(1) || 'home';
  document.querySelectorAll('.section').forEach(section => {
    section.style.display = section.id === sectionId ? 'block' : 'none';
  });
});
