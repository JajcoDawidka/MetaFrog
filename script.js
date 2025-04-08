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
      this.checkPreviousSubmission();
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
    } catch (error) {
      console.error("Firebase initialization error:", error);
      throw new Error("Failed to initialize Firebase services");
    }
  },

  setupEventListeners() {
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
      points: 0
    };
  },

  async saveSubmission(data) {
    const batch = this.db.batch();
    const participantRef = this.db.collection('airdropParticipants').doc(data.wallet);
    
    const doc = await participantRef.get();
    if (doc.exists) {
      throw new Error('This wallet is already registered');
    }

    batch.set(participantRef, data);
    
    const rtdbRef = this.realtimeDb.ref(`airdropSubmissions/${data.wallet.replace(/\./g, '_')}`);
    const rtdbData = {
      ...data,
      timestamp: firebase.database.ServerValue.TIMESTAMP
    };

    await Promise.all([batch.commit(), rtdbRef.set(rtdbData)]);
  },

  handleSuccess(form, wallet) {
    localStorage.setItem('mfrog_registered', 'true');
    localStorage.setItem('mfrog_wallet', wallet);
    form.querySelectorAll('input').forEach(input => input.disabled = true);
    form.querySelector('button[type="submit"]').textContent = 'Already Registered';
    this.updateProgressSteps();
    this.showAlert('Registration successful!', 'success');
  },

  updateProgressSteps() {
    const steps = document.querySelectorAll('.step-card');

    if (this.isRegistered()) {
      steps[0].classList.remove('active-step', 'pending-step');
      steps[0].classList.add('completed-step');
      steps[0].querySelector('.step-status').textContent = 'COMPLETED';

      steps[1].classList.remove('completed-step', 'pending-step');
      steps[1].classList.add('active-step');
      steps[1].querySelector('.step-status').textContent = 'ACTIVE';

      if (steps[2]) {
        steps[2].classList.remove('completed-step', 'active-step');
        steps[2].classList.add('pending-step');
        steps[2].querySelector('.step-status').textContent = 'PENDING';
      }
    } else {
      steps.forEach((step, i) => {
        step.classList.remove('completed-step', 'active-step', 'pending-step');
        if (i === 0) {
          step.classList.add('active-step');
          step.querySelector('.step-status').textContent = 'ACTIVE';
        } else {
          step.classList.add('pending-step');
          step.querySelector('.step-status').textContent = 'PENDING';
        }
      });
    }
  },

  handleDexScreenerTask(e) {
    e.preventDefault();
    const link = e.target.href;
    window.open(link, '_blank');

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
        form.querySelector('button[type="submit"]').textContent = 'Already Registered';
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
  },

  toggleProcessing(processing, button) {
    this.isProcessing = processing;
    if (button) {
      button.disabled = processing;
      button.innerHTML = processing 
        ? '<span class="spinner"></span> Processing...' 
        : 'Submit';
    }
  }
};

// Init
document.addEventListener('DOMContentLoaded', () => MetaFrogApp.init());
window.addEventListener('popstate', () => {
  const section = window.location.hash.substring(1) || 'home';
  MetaFrogApp.showSection(section);
});
