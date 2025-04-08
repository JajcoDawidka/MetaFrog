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
      this.setupTaskVerification();
    } catch (error) {
      console.error("Initialization failed:", error);
      this.showEmergencyMode();
    }
  },

  async initializeFirebase() {
    try {
      const app = firebase.initializeApp(firebaseConfig);
      this.db = app.firestore();
      this.realtimeDb = app.database();
      await this.db.enablePersistence({ synchronizeTabs: true });
      console.log("Firebase initialized successfully!");
    } catch (error) {
      console.error("Firebase initialization error:", error);
      throw new Error("Failed to initialize Firebase services");
    }
  },

  setupEventListeners() {
    document.querySelectorAll('nav a').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        this.showSection(e.target.getAttribute('href').substring(1));
      });
    });

    const form = document.querySelector('.airdrop-form');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleFormSubmission(e.target);
      });
    }

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

    this.checkReferral();
  },

  async handleFormSubmission(form) {
    if (this.isProcessing) return;
    this.isProcessing = true;

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span class="spinner"></span> Processing...';
    submitBtn.disabled = true;

    try {
      const formData = this.validateFormData(form);
      await this.saveSubmission(formData);
      
      submitBtn.textContent = 'Registered!';
      form.querySelectorAll('input').forEach(input => input.disabled = true);
      
      localStorage.setItem('mfrog_registered', 'true');
      localStorage.setItem('mfrog_wallet', formData.wallet);
      
      this.updateProgressSteps();
      this.showAlert('Registration successful!', 'success');

      setTimeout(() => this.updateProgressSteps(), 1000);

    } catch (error) {
      console.error("Error:", error);
      submitBtn.innerHTML = originalBtnText;
      submitBtn.disabled = false;
      this.showAlert(error.message || 'An error occurred', 'error');
    } finally {
      this.isProcessing = false;
    }
  },

  validateFormData(form) {
    const wallet = form.wallet.value.trim();
    const xUsername = form.xUsername.value.trim();
    const telegram = form.telegram.value.trim();
    const tiktok = form.tiktok.value.trim();

    if (!wallet || !xUsername || !telegram) {
      throw new Error('All required fields must be filled');
    }

    if (!this.isValidSolanaAddress(wallet)) {
      throw new Error('Invalid Solana wallet address format');
    }

    return {
      wallet: wallet,
      xUsername: this.normalizeUsername(xUsername),
      telegram: this.normalizeUsername(telegram),
      tiktok: tiktok ? this.normalizeUsername(tiktok) : 'N/A',
      status: 'pending',
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      ip: '',
      userAgent: navigator.userAgent,
      referrer: this.getReferralSource(),
      points: 0,
      step1_completed: true,
      step2_active: true
    };
  },

  async saveSubmission(data) {
    const participantRef = this.db.collection('airdropParticipants').doc(data.wallet);
    const doc = await participantRef.get();
    if (doc.exists) {
      throw new Error('This wallet is already registered');
    }

    await participantRef.set(data);
    
    const rtdbRef = this.realtimeDb.ref(`airdropSubmissions/${data.wallet.replace(/\./g, '_')}`);
    await rtdbRef.set({
      ...data,
      timestamp: firebase.database.ServerValue.TIMESTAMP
    });
  },

  updateProgressSteps() {
    const steps = document.querySelectorAll('.step-card');
    if (!steps || steps.length === 0) return;

    const isRegistered = this.isRegistered();

    steps.forEach((step, index) => {
      step.classList.remove('active-step', 'completed-step', 'pending-step');
      const statusElement = step.querySelector('.step-status');

      if (isRegistered) {
        if (index === 0) {
          step.classList.add('completed-step');
          statusElement.textContent = 'COMPLETED';
        } else if (index === 1) {
          step.classList.add('active-step');
          statusElement.textContent = 'ACTIVE';
        } else {
          step.classList.add('pending-step');
          statusElement.textContent = 'PENDING';
        }
      } else {
        if (index === 0) {
          step.classList.add('active-step');
          statusElement.textContent = 'ACTIVE';
        } else {
          step.classList.add('pending-step');
          statusElement.textContent = 'PENDING';
        }
      }
    });
  },

  handleDexScreenerTask(e) {
    e.preventDefault();
    window.open(e.target.href, '_blank');
    const verification = document.querySelector('.dexscreener-verification');
    verification.textContent = '✓ Verified';
    verification.classList.add('task-verified');
    this.updateTaskCompletion('dexscreener');
    this.showAlert('DexScreener task completed!', 'success');
  },

  async updateTaskCompletion(taskName) {
    const wallet = localStorage.getItem('mfrog_wallet');
    if (!wallet) return;

    try {
      await this.db.collection('airdropParticipants').doc(wallet).update({
        [`tasks.${taskName}`]: true,
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      console.error("Failed to update task:", error);
    }
  },

  setupTaskVerification() {
    if (!this.isRegistered()) return;

    const wallet = localStorage.getItem('mfrog_wallet');
    this.db.collection('airdropParticipants').doc(wallet).onSnapshot(doc => {
      if (doc.exists) {
        const data = doc.data();

        if (data.tasks?.twitter) {
          document.querySelector('[twitter-task] .verification-status').classList.add('task-verified');
        }
        if (data.tasks?.telegram) {
          document.querySelector('[telegram-task] .verification-status').classList.add('task-verified');
        }
        if (data.tasks?.tiktok) {
          document.querySelector('[tiktok-task] .verification-status').classList.add('task-verified');
        }
      }
    });
  },

  checkPreviousSubmission() {
    if (this.isRegistered()) {
      this.updateProgressSteps();
      const form = document.querySelector('.airdrop-form');
      if (form) {
        form.querySelectorAll('input').forEach(input => input.disabled = true);
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.textContent = 'Already Registered';
        submitBtn.disabled = true;
      }
    } else {
      this.updateProgressSteps();
    }
  },

  checkReferral() {
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get('ref');

    if (ref && this.isValidSolanaAddress(ref)) {
      localStorage.setItem('mfrog_referrer', ref);

      if (!this.isRegistered()) {
        this.db.collection('referrals').doc(ref).update({
          clicks: firebase.firestore.FieldValue.increment(1),
          lastClick: firebase.firestore.FieldValue.serverTimestamp()
        }).catch(() => {
          this.db.collection('referrals').doc(ref).set({
            clicks: 1,
            wallet: ref,
            lastClick: firebase.firestore.FieldValue.serverTimestamp()
          });
        });
      }
    }
  },

  getReferralSource() {
    return localStorage.getItem('mfrog_referrer') || document.referrer || 'direct';
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
      submitBtn.textContent = 'Service Unavailable';
    }
    this.showAlert('System maintenance in progress. Please check back later.', 'error');
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

document.addEventListener('DOMContentLoaded', () => MetaFrogApp.init());

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
