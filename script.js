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

    this.checkReferral();
  },

  async handleFormSubmission(form) {
    console.log("Form submitted!");
    if (this.isProcessing) return;

    const submitBtn = form.querySelector('button[type="submit"]');
    this.toggleProcessing(true, submitBtn);

    try {
      const formData = this.validateFormData(form);
      console.log("Form data validated:", formData);
      await this.saveSubmission(formData);
      this.handleSuccess(form, formData.wallet);
    } catch (error) {
      console.error("Form submission failed:", error);
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
      points: 0,
      step1_completed: true, // Mark step 1 as completed
      step2_active: true     // Mark step 2 as active
    };
  },

  async saveSubmission(data) {
    console.log("Saving submission:", data);
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
    console.log("Data saved successfully!");
  },

  handleSuccess(form, wallet) {
    localStorage.setItem('mfrog_registered', 'true');
    localStorage.setItem('mfrog_wallet', wallet);
    form.querySelectorAll('input').forEach(input => input.disabled = true);
    this.updateProgressSteps();
    this.showAlert('Registration successful!', 'success');
  },

  updateProgressSteps() {
    const steps = document.querySelectorAll('.step-card');
    
    if (!steps || steps.length < 2) return;

    if (this.isRegistered()) {
      // Step 1 - completed
      steps[0].classList.remove('active-step', 'pending-step');
      steps[0].classList.add('completed-step');
      steps[0].querySelector('.step-status').textContent = 'COMPLETED';

      // Step 2 - active
      steps[1].classList.remove('completed-step', 'pending-step');
      steps[1].classList.add('active-step');
      steps[1].querySelector('.step-status').textContent = 'ACTIVE';

      // If there's a step 3, keep it pending
      if (steps[2]) {
        steps[2].classList.remove('completed-step', 'active-step');
        steps[2].classList.add('pending-step');
        steps[2].querySelector('.step-status').textContent = 'PENDING';
      }
    } else {
      // Default state for new visitors
      steps[0].classList.remove('completed-step', 'pending-step');
      steps[0].classList.add('active-step');
      steps[0].querySelector('.step-status').textContent = 'ACTIVE';

      steps[1].classList.remove('completed-step', 'active-step');
      steps[1].classList.add('pending-step');
      steps[1].querySelector('.step-status').textContent = 'PENDING';

      if (steps[2]) {
        steps[2].classList.remove('completed-step', 'active-step');
        steps[2].classList.add('pending-step');
        steps[2].querySelector('.step-status').textContent = 'PENDING';
      }
    }
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

  handleError(error, submitBtn) {
    console.error("Error:", error);
    this.showAlert(error.message || 'An error occurred. Please try again.', 'error');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit';
    }
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
