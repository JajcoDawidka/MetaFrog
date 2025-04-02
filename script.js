/**
 * MetaFrog - Production Ready
 * Firebase Integration with Error Handling
 */

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
  db: null,
  realtimeDb: null,

  async init() {
    try {
      await this.initializeFirebase();
      this.setupEventListeners();
      this.showSection(window.location.hash.substring(1) || 'home');
      this.checkPreviousSubmission();
    } catch (error) {
      console.error("Initialization failed:", error);
      this.showEmergencyMode();
    }
  },

  async initializeFirebase() {
    try {
      // Load Firebase SDKs dynamically
      await this.loadDependencies([
        'https://www.gstatic.com/firebasejs/9.6.0/firebase-app-compat.js',
        'https://www.gstatic.com/firebasejs/9.6.0/firebase-firestore-compat.js',
        'https://www.gstatic.com/firebasejs/9.6.0/firebase-database-compat.js'
      ]);

      const app = firebase.initializeApp(firebaseConfig);
      this.db = app.firestore();
      this.realtimeDb = app.database();
      
      // Enable offline persistence
      await this.db.enablePersistence();
      console.log("Firebase initialized successfully");
    } catch (error) {
      console.error("Firebase initialization error:", error);
      throw new Error("Failed to initialize Firebase services");
    }
  },

  async loadDependencies(urls) {
    const loadScript = (url) => {
      return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${url}"]`)) return resolve();
        
        const script = document.createElement('script');
        script.src = url;
        script.onload = resolve;
        script.onerror = () => reject(new Error(`Failed to load script: ${url}`));
        document.head.appendChild(script);
      });
    };

    await Promise.all(urls.map(loadScript));
  },

  setupEventListeners() {
    // Navigation
    document.querySelectorAll('nav a').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        this.showSection(e.target.getAttribute('href').substring(1));
      });
    });

    // Form submission
    const form = document.querySelector('.airdrop-form');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleFormSubmission(e.target);
      });
    }

    // Task links
    document.querySelectorAll('.task-link').forEach(link => {
      if (!link.classList.contains('dexscreener-link')) {
        link.addEventListener('click', (e) => {
          if (!this.isRegistered()) {
            e.preventDefault();
            this.showAlert('Please complete registration first', 'warning');
          }
        });
      }
    });

    // DexScreener special handling
    const dexscreenerLink = document.querySelector('.dexscreener-link');
    if (dexscreenerLink) {
      dexscreenerLink.addEventListener('click', (e) => {
        if (!this.isRegistered()) {
          e.preventDefault();
          this.showAlert('Please complete registration first', 'warning');
          return;
        }
        this.handleDexScreenerTask(e);
      });
    }
  },

  async handleFormSubmission(form) {
    if (this.isProcessing) return;
    
    const submitBtn = form.querySelector('button[type="submit"]');
    this.toggleProcessing(true, submitBtn);

    try {
      const formData = this.validateFormData(form);
      await this.saveSubmission(formData);
      this.handleSuccess(form, formData.wallet);
    } catch (error) {
      this.handleError(error, submitBtn);
    } finally {
      this.toggleProcessing(false, submitBtn);
    }
  },

  validateFormData(form) {
    const data = {
      wallet: form.wallet.value.trim(),
      xUsername: this.normalizeUsername(form.xUsername.value.trim()),
      telegram: this.normalizeUsername(form.telegram.value.trim()),
      tiktok: form.tiktok.value.trim() ? this.normalizeUsername(form.tiktok.value.trim()) : 'N/A',
      status: 'pending',
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      ip: '', // Will be set by cloud function
      userAgent: navigator.userAgent,
      referrer: document.referrer || 'direct'
    };

    // Validation
    if (!data.wallet || !data.xUsername || !data.telegram) {
      throw new Error('All required fields must be filled');
    }

    if (!this.isValidSolanaAddress(data.wallet)) {
      throw new Error('Invalid Solana wallet address format');
    }

    return data;
  },

  async saveSubmission(data) {
    try {
      const batch = this.db.batch();
      const participantRef = this.db.collection('airdropParticipants').doc(data.wallet);
      
      batch.set(participantRef, data);
      
      const rtdbRef = this.realtimeDb.ref(`airdropSubmissions/${data.wallet.replace(/\./g, '_')}`);
      const rtdbData = {
        ...data,
        timestamp: firebase.database.ServerValue.TIMESTAMP
      };

      await Promise.all([
        batch.commit(),
        rtdbRef.set(rtdbData)
      ]);
    } catch (error) {
      console.error("Save operation failed:", {
        error: error.message,
        code: error.code,
        stack: error.stack
      });
      throw this.translateFirebaseError(error);
    }
  },

  translateFirebaseError(error) {
    const messages = {
      'permission-denied': 'Server rejected the request. Please try again later.',
      'network-error': 'Network connection failed. Please check your internet.',
      'too-many-requests': 'Too many attempts. Please wait before trying again.'
    };
    return new Error(messages[error.code] || 'An unexpected error occurred');
  },

  handleSuccess(form, wallet) {
    localStorage.setItem('mfrog_registered', 'true');
    localStorage.setItem('mfrog_wallet', wallet);
    form.querySelectorAll('input').forEach(input => input.disabled = true);
    this.updateProgressSteps();
    this.showAlert('Registration successful!', 'success');
  },

  handleError(error, submitBtn) {
    console.error("Submission error:", error);
    this.showAlert(error.message, 'error');
    submitBtn.textContent = 'Try Again';
  },

  // Helper methods
  normalizeUsername(username) {
    return username.startsWith('@') ? username : `@${username}`;
  },

  isValidSolanaAddress(address) {
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
  },

  isRegistered() {
    return localStorage.getItem('mfrog_registered') === 'true';
  },

  toggleProcessing(processing, button) {
    this.isProcessing = processing;
    if (button) {
      button.disabled = processing;
      button.innerHTML = processing 
        ? '<span class="spinner"></span> Processing...' 
        : 'Submit';
    }
  },

  // UI Methods
  showSection(sectionId) {
    document.querySelectorAll('.section').forEach(section => {
      section.classList.remove('active');
      section.style.display = 'none';
    });
    
    const section = document.getElementById(sectionId);
    if (section) {
      section.classList.add('active');
      section.style.display = 'block';
      window.scrollTo(0, 0);
      history.replaceState(null, null, `#${sectionId}`);
    }
  },

  updateProgressSteps() {
    const steps = [
      { status: 'completed', text: 'COMPLETED' },
      { status: 'active', text: 'ACTIVE' },
      { status: 'pending', text: 'PENDING' }
    ];

    const container = document.querySelector('.airdrop-steps');
    container.innerHTML = steps.map((step, i) => `
      <div class="step-card ${step.status}-step">
        <div class="step-number">${i + 1}</div>
        <h3>${this.getStepTitle(i)}</h3>
        <p>${this.getStepDescription(i)}</p>
        <div class="step-status">${step.text}</div>
      </div>
      ${i < steps.length - 1 ? '<div class="step-connector"></div>' : ''}
    `).join('');
  },

  getStepTitle(index) {
    const titles = [
      'Register for Airdrop',
      'Complete Tasks',
      'Wait for Verification'
    ];
    return titles[index];
  },

  getStepDescription(index) {
    const descriptions = [
      'Your wallet and social profiles have been registered',
      'Finish all required tasks to qualify for the airdrop',
      'Our team will verify your submission within 24-48 hours'
    ];
    return descriptions[index];
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
      <span class="alert-message">${message}</span>
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
      submitBtn.textContent = 'Service Unavailable';
    }
    this.showAlert('System maintenance in progress. Please check back later.', 'error');
  },

  checkPreviousSubmission() {
    if (this.isRegistered()) {
      this.updateProgressSteps();
      const form = document.querySelector('.airdrop-form');
      if (form) {
        form.querySelectorAll('input').forEach(input => input.disabled = true);
        form.querySelector('button[type="submit"]').textContent = 'Already Registered';
      }
    }
  },

  handleDexScreenerTask(e) {
    e.preventDefault();
    const link = document.querySelector('.dexscreener-link').href;
    window.open(link, '_blank');
    
    const verification = document.querySelector('.dexscreener-verification');
    verification.textContent = '✓ Verified';
    verification.style.color = '#4CAF50';
    
    this.showAlert('DexScreener task completed!', 'success');
  }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => MetaFrogApp.init());

// Handle browser back/forward
window.addEventListener('popstate', () => {
  MetaFrogApp.showSection(window.location.hash.substring(1) || 'home');
});

// Global function for referral links
window.copyReferralLink = function() {
  if (!localStorage.getItem('mfrog_registered')) {
    MetaFrogApp.showAlert('Please complete registration first', 'warning');
    return;
  }
  
  const wallet = localStorage.getItem('mfrog_wallet');
  const referralLink = `${window.location.origin}${window.location.pathname}?ref=${wallet}`;
  
  navigator.clipboard.writeText(referralLink)
    .then(() => MetaFrogApp.showAlert('Referral link copied!', 'success'))
    .catch(() => MetaFrogApp.showAlert('Failed to copy link', 'error'));
};
