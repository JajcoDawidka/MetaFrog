/**
 * MetaFrog - Complete Website Script
 * Version 3.4 - Complete Fixed Version
 */

const firebaseConfig = {
  apiKey: "AIzaSyAR6Ha8baMX5EPsPVayTno0e0QBRqZrmco",
  authDomain: "metafrog-airdrop.firebaseapp.com",
  projectId: "metafrog-airdrop",
  storageBucket: "metafrog-airdrop.appspot.com",
  messagingSenderId: "546707737127",
  appId: "1:546707737127:web:67956ae63ffef3ebeddc02",
  measurementId: "G-2Z78VYL739"
};

const MetaFrogApp = {
  debugMode: true,
  isProcessing: false,
  currentSection: null,

  init() {
    console.log('Initializing MetaFrog application');
    document.documentElement.style.scrollBehavior = 'smooth';

    try {
      firebase.initializeApp(firebaseConfig);
      this.db = firebase.firestore();
      console.log('Firebase initialized successfully');
    } catch (error) {
      console.error('Firebase initialization error:', error);
    }

    this.setupEventListeners();
    this.initializeAirdropSteps();
    this.handleInitialRoute();
    this.initCounters();
    this.checkVerificationStatus();
    this.forceScrollToTop();
  },

  setupEventListeners() {
    document.addEventListener('click', (e) => {
      const navLink = e.target.closest('nav a');
      if (navLink) {
        e.preventDefault();
        const sectionId = navLink.getAttribute('href').substring(1);
        this.showSection(sectionId);
      }

      if (e.target.closest('.task-link') && e.target.closest('[onclick="copyReferralLink()"]')) {
        e.preventDefault();
        this.copyReferralLink();
      }

      if (e.target.closest('.dexscreener-link')) {
        e.preventDefault();
        this.verifyDexScreener(e);
      }

      if (e.target.closest('.airdrop-form button[type="submit"]')) {
        e.preventDefault();
        this.handleAirdropForm(e);
      }
    });

    window.addEventListener('popstate', () => {
      const section = this.getSectionFromHref(window.location.hash);
      this.showSection(section);
    });
  },

  async handleAirdropForm(e) {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    this.toggleSubmitButton(true);

    const wallet = document.getElementById('wallet').value.trim();
    const xUsername = document.getElementById('xUsername').value.trim();
    const telegram = document.getElementById('telegram').value.trim();
    const tiktok = document.getElementById('tiktok').value.trim();

    if (!wallet || !xUsername || !telegram) {
      this.showAlert('Please fill all required fields', 'error');
      this.isProcessing = false;
      this.toggleSubmitButton(false);
      return;
    }

    if (!this.isValidSolanaAddress(wallet)) {
      this.showAlert('Invalid Solana wallet address', 'error');
      this.isProcessing = false;
      this.toggleSubmitButton(false);
      return;
    }

    const submissionData = {
      wallet,
      xUsername: xUsername.startsWith('@') ? xUsername : `@${xUsername}`,
      telegram: telegram.startsWith('@') ? telegram : `@${telegram}`,
      tiktok: tiktok ? (tiktok.startsWith('@') ? tiktok : `@${tiktok}`) : 'N/A',
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      completedTasks: [],
      status: 'registered',
      verificationStatus: {
        twitter: false,
        telegram: false,
        tiktok: false,
        dexscreener: false
      }
    };

    try {
      if (this.debugMode) {
        await new Promise(resolve => setTimeout(resolve, 800));
      } else {
        await this.db.collection('airdropParticipants').doc(wallet).set(submissionData);
      }

      this.updateStepStatus(1, 'completed');
      this.updateStepStatus(2, 'active');
      this.updateStepStatus(3, 'pending');
      this.showAlert('Registration successful!', 'success');
      
    } catch (error) {
      console.error('Form submission error:', error);
      this.showAlert('Submission error. Please try again.', 'error');
    } finally {
      this.isProcessing = false;
      this.toggleSubmitButton(false);
    }
  },

  showSection(sectionId) {
    if (this.currentSection === sectionId) return;
    this.currentSection = sectionId;

    document.querySelectorAll('.section').forEach(section => {
      section.classList.remove('active');
    });

    const section = document.getElementById(sectionId);
    if (section) {
      section.classList.add('active');
      history.replaceState(null, null, `#${sectionId}`);
      this.forceScrollToTop();
    }
  },

  forceScrollToTop() {
    window.scrollTo(0, 0);
    setTimeout(() => {
      if (window.pageYOffset > 0) {
        window.scrollTo({ top: 0, behavior: 'auto' });
      }
    }, 50);
  },

  toggleSubmitButton(loading) {
    const submitBtn = document.querySelector('.airdrop-form button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = loading;
      submitBtn.innerHTML = loading 
        ? '<i class="fas fa-spinner fa-spin"></i> Processing...' 
        : 'Submit';
    }
  },

  updateStepStatus(stepNumber, status) {
    const step = document.querySelector(`.step-card:nth-child(${stepNumber})`);
    if (step) {
      step.classList.remove('completed-step', 'active-step', 'pending-step');
      step.classList.add(`${status}-step`);
      
      const statusElement = step.querySelector('.step-status');
      if (statusElement) {
        statusElement.textContent = status.toUpperCase();
      }
    }
  },

  initializeAirdropSteps() {
    const steps = document.querySelectorAll('.step-card');
    steps.forEach((step, index) => {
      const status = index === 0 ? 'active' : 'pending';
      this.updateStepElement(step, status);
    });
  },

  updateStepElement(element, status) {
    element.classList.remove('completed-step', 'active-step', 'pending-step');
    element.classList.add(`${status}-step`);
    
    const statusElement = element.querySelector('.step-status');
    if (statusElement) {
      statusElement.textContent = status.toUpperCase();
    }
  },

  async verifyDexScreener(e) {
    const wallet = document.getElementById('wallet')?.value.trim();
    if (!wallet) {
      this.showAlert('Please enter wallet address first', 'error');
      return;
    }

    try {
      await this.db.collection('airdropParticipants').doc(wallet).update({
        'verificationStatus.dexscreener': true,
        'completedTasks': firebase.firestore.FieldValue.arrayUnion('dexscreener')
      });
      
      this.updateVerificationUI('dexscreener');
      this.showAlert('DexScreener task verified!', 'success');
    } catch (error) {
      console.error('Verification error:', error);
      this.showAlert('Verification failed. Please try again.', 'error');
    }
  },

  updateVerificationUI(taskName) {
    const element = document.querySelector(`.${taskName}-verification`);
    if (element) {
      element.innerHTML = '<i class="fas fa-check-circle"></i> Verified';
      element.style.color = '#4CAF50';
    }
  },

  async checkVerificationStatus() {
    const wallet = document.getElementById('wallet')?.value.trim();
    if (!wallet) return;

    try {
      const doc = await this.db.collection('airdropParticipants').doc(wallet).get();
      if (doc.exists) {
        const data = doc.data();
        
        for (const task in data.verificationStatus) {
          if (data.verificationStatus[task]) {
            this.updateVerificationUI(task);
          }
        }
        
        if (data.status === 'registered') {
          this.updateStepStatus(1, 'completed');
          this.updateStepStatus(2, 'active');
          this.updateStepStatus(3, 'pending');
        }
      }
    } catch (error) {
      console.error('Status check error:', error);
    }
  },

  copyReferralLink() {
    const link = `${window.location.origin}${window.location.pathname}?ref=${this.generateReferralCode()}`;
    navigator.clipboard.writeText(link)
      .then(() => this.showAlert('Referral link copied!', 'success'))
      .catch(err => {
        console.error('Copy error:', err);
        this.showAlert('Failed to copy link', 'error');
      });
  },

  generateReferralCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  },

  isValidSolanaAddress(address) {
    return address.length >= 32 && address.length <= 44 && 
           /^[A-HJ-NP-Za-km-z1-9]*$/.test(address);
  },

  showAlert(message, type = 'error') {
    const alert = document.createElement('div');
    alert.className = `alert ${type}`;
    alert.textContent = message;
    document.body.appendChild(alert);
    
    setTimeout(() => {
      alert.classList.add('fade-out');
      setTimeout(() => alert.remove(), 500);
    }, 3000);
  },

  handleInitialRoute() {
    const section = this.getSectionFromHref(window.location.hash) || 'home';
    this.showSection(section);
  },

  getSectionFromHref(href) {
    return href.replace(/^#\/?/, '') || 'home';
  },

  initCounters() {
    this.animateCounter('participants-counter', 12500);
    this.animateCounter('tokens-counter', 2500000);
  },

  animateCounter(id, target) {
    const element = document.getElementById(id);
    if (!element) return;
    
    let current = 0;
    const timer = setInterval(() => {
      current += target / 100;
      element.textContent = Math.floor(current).toLocaleString();
      if (current >= target) {
        element.textContent = target.toLocaleString();
        clearInterval(timer);
      }
    }, 20);
  },

  trackConversion() {
    if (typeof gtag !== 'undefined') {
      gtag('event', 'conversion', {
        'send_to': 'AW-123456789/AbCdEfGhIjKlMnOpQrStUv'
      });
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  MetaFrogApp.init();
});

window.addEventListener('load', () => {
  MetaFrogApp.forceScrollToTop();
});

window.addEventListener('error', (e) => {
  console.error('Global error:', e.error);
  MetaFrogApp.showAlert('An unexpected error occurred', 'error');
});
