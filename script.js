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
      await this.loadFirebase();
      this.setupNavigation();
      this.setupAirdropForm();
      this.initializeSteps();
      this.showSection(window.location.hash.substring(1) || 'home');
    } catch (error) {
      console.error('Initialization error:', error);
      this.showEmergencyMode();
    }
  },

  async loadFirebase() {
    if (typeof firebase === 'undefined') {
      await this.loadScript('https://www.gstatic.com/firebasejs/9.6.0/firebase-app-compat.js');
      await this.loadScript('https://www.gstatic.com/firebasejs/9.6.0/firebase-firestore-compat.js');
      await this.loadScript('https://www.gstatic.com/firebasejs/9.6.0/firebase-database-compat.js');
    }

    const app = firebase.initializeApp(firebaseConfig);
    this.db = app.firestore();
    this.realtimeDb = app.database();
  },

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
    document.querySelectorAll('.section').forEach(section => {
      section.style.display = 'none';
    });
    
    const section = document.getElementById(sectionId);
    if (section) {
      section.style.display = 'block';
      window.scrollTo(0, 0);
      history.pushState(null, null, `#${sectionId}`);
    }
  },

  setupAirdropForm() {
    const form = document.querySelector('.airdrop-form');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleFormSubmit(e.target);
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
      form.querySelectorAll('input').forEach(input => input.disabled = true);
    } catch (error) {
      this.showError(error);
    } finally {
      submitBtn.textContent = 'Submitted';
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
    };
    
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
    return address.length >= 32 && address.length <= 44 && /^[A-HJ-NP-Za-km-z1-9]*$/.test(address);
  },

  async saveToFirebase(data) {
    await Promise.all([
      this.db.collection('airdropParticipants').doc(data.wallet).set(data),
      this.realtimeDb.ref(`airdropSubmissions/${data.wallet.replace(/\./g, '_')}`).set(data)
    ]);
  },

  updateUIAfterSubmission() {
    localStorage.setItem('mfrog_registered', 'true');
    this.updateSteps();
    this.showAlert('✅ Registration successful!');
  },

  initializeSteps() {
    this.updateSteps();
  },

  updateSteps() {
    const registered = localStorage.getItem('mfrog_registered');
    const taskCompleted = localStorage.getItem('mfrog_tasks_completed') === 'true';

    document.querySelectorAll('.step-card').forEach((step, index) => {
      if (index === 0) {
        step.className = `step-card ${registered ? 'completed' : 'active'}`;
      } else if (index === 1) {
        step.className = `step-card ${taskCompleted ? 'completed' : 'active'}`;
      } else if (index === 2) {
        step.className = `step-card ${taskCompleted ? 'completed' : 'pending'}`;
      }
    });
  },

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
  }
};

document.addEventListener('DOMContentLoaded', () => MetaFrogApp.init());
window.addEventListener('popstate', () => {
  MetaFrogApp.showSection(window.location.hash.substring(1) || 'home');
});
