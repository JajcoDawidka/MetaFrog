/**
 * MetaFrog - Complete Website Script
 * Version 3.1 - Full Form Submission Fix
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
  debugMode: true, // Set to false in production
  hasInitialLoad: false,

  init() {
    this.log('Application initialization started');
    document.documentElement.style.scrollBehavior = 'smooth';

    try {
      firebase.initializeApp(firebaseConfig);
      this.db = firebase.firestore();
      this.log('Firebase initialized successfully');
    } catch (error) {
      this.log('Firebase initialization failed:', error, 'error');
      this.showAlert("Database connection error. Please refresh.", "error");
    }

    this.setupEventListeners();
    this.handleInitialRoute();
    this.initCounters();
    this.checkVerificationStatus();
    this.initializeAirdropSteps();
    this.handleInitialScroll();
  },

  log(message, data = null, type = 'log') {
    if (this.debugMode) {
      const timestamp = new Date().toISOString();
      const styles = {
        log: 'color: #4CAF50;',
        error: 'color: #f44336;',
        warn: 'color: #FFC107;'
      };
      console.log(`%c[MetaFrog][${timestamp}] ${message}`, styles[type] || '');
      if (data) console[type](data);
    }
  },

  handleInitialScroll() {
    if (!this.hasInitialLoad) {
      this.hasInitialLoad = true;
      this.log('Performing initial scroll to top');
      
      const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'auto' });
        setTimeout(() => {
          if (window.pageYOffset > 0) {
            this.log('Initial scroll failed, retrying...');
            window.scrollTo({ top: 0, behavior: 'auto' });
          }
        }, 100);
      };

      setTimeout(scrollToTop, 50);
    }
  },

  initializeAirdropSteps() {
    const steps = document.querySelectorAll('.step-card');
    const wallet = document.getElementById('wallet')?.value.trim();
    
    if (!wallet) {
      this.log('Initializing steps for new user');
      steps.forEach((step, index) => {
        this.updateStepElement(step, index === 0 ? 'active' : 'pending');
      });
    } else {
      this.log('User already registered, skipping step initialization');
    }
  },

  scrollToTop() {
    this.log('Scrolling to top');
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
    
    setTimeout(() => {
      if (window.pageYOffset > 0) {
        window.scrollTo({ top: 0, behavior: 'auto' });
      }
    }, 500);
  },

  setupEventListeners() {
    this.log('Setting up event listeners');
    
    // Navigation
    document.addEventListener('click', (e) => {
      const navLink = e.target.closest('nav a');
      if (navLink) {
        e.preventDefault();
        const sectionId = navLink.getAttribute('href').substring(1);
        this.log(`Navigation to section: ${sectionId}`);
        this.showSection(sectionId);
      }

      // Referral link
      if (e.target.closest('.task-link') && e.target.closest('[onclick="copyReferralLink()"]')) {
        e.preventDefault();
        this.log('Copy referral link clicked');
        this.copyReferralLink();
      }

      // DexScreener verification
      if (e.target.closest('.dexscreener-link')) {
        e.preventDefault();
        this.log('DexScreener verification clicked');
        this.verifyDexScreener(e);
      }
    });

    // Form submission
    const airdropForm = document.querySelector('.airdrop-form');
    if (airdropForm) {
      airdropForm.addEventListener('submit', (e) => {
        this.log('Airdrop form submission detected');
        this.handleAirdropForm(e);
      });
      this.log('Airdrop form event listener added');
    } else {
      this.log('Airdrop form not found!', null, 'error');
    }

    // History navigation
    window.addEventListener('popstate', () => {
      this.log('History navigation detected');
      this.handleInitialRoute();
      this.scrollToTop();
    });
  },

  async handleAirdropForm(e) {
    e.preventDefault();
    this.log('Starting form submission process');
    
    // Get form values
    const wallet = document.getElementById('wallet').value.trim();
    const xUsername = document.getElementById('xUsername').value.trim();
    const telegram = document.getElementById('telegram').value.trim();
    const tiktok = document.getElementById('tiktok').value.trim();

    this.log('Form values:', {
      wallet,
      xUsername,
      telegram, 
      tiktok
    });

    // Validation
    if (!wallet || !xUsername || !telegram) {
      this.log('Validation failed: missing required fields', null, 'warn');
      this.showAlert('Please fill all required fields', 'error');
      return;
    }

    if (!this.isValidSolanaAddress(wallet)) {
      this.log('Validation failed: invalid Solana address', null, 'warn');
      this.showAlert('Please enter a valid Solana wallet address', 'error');
      return;
    }

    // Prepare submission data
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
      this.log('Attempting to save to Firestore...');
      this.toggleSubmitButton(true);
      
      await this.db.collection('airdropParticipants').doc(wallet).set(submissionData);
      
      this.log('Firestore save successful');
      this.updateStepStatus(1, 'completed');
      this.updateStepStatus(2, 'active');
      this.updateStepStatus(3, 'pending');
      
      this.showAlert('Registration successful! You can now complete tasks.', 'success');
      this.trackConversion();
      
    } catch (error) {
      this.log('Firestore save failed:', error, 'error');
      this.showAlert('Submission error. Please try again.', 'error');
    } finally {
      this.toggleSubmitButton(false);
    }
  },

  toggleSubmitButton(loading) {
    const submitBtn = document.querySelector('.airdrop-form button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = loading;
      submitBtn.innerHTML = loading
        ? '<i class="fas fa-spinner fa-spin"></i> Processing...'
        : 'Submit';
      this.log(`Submit button state: ${loading ? 'loading' : 'ready'}`);
    } else {
      this.log('Submit button not found!', null, 'error');
    }
  },

  updateStepStatus(stepNumber, status) {
    const step = document.querySelector(`.step-card:nth-child(${stepNumber})`);
    if (step) {
      this.log(`Updating step ${stepNumber} to ${status}`);
      this.updateStepElement(step, status);
    } else {
      this.log(`Step ${stepNumber} element not found!`, null, 'error');
    }
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
      this.log('DexScreener verification failed: no wallet', null, 'warn');
      this.showAlert('Please enter wallet address first', 'error');
      return;
    }

    try {
      this.log('Verifying DexScreener task...');
      await this.db.collection('airdropParticipants').doc(wallet).update({
        'verificationStatus.dexscreener': true,
        'completedTasks': firebase.firestore.FieldValue.arrayUnion('dexscreener')
      });
      
      this.updateVerificationUI('dexscreener');
      this.showAlert('DexScreener task verified!', 'success');
      this.log('DexScreener verification successful');
    } catch (error) {
      this.log('DexScreener verification failed:', error, 'error');
      this.showAlert('Verification error. Please try again.', 'error');
    }
  },

  updateVerificationUI(taskName) {
    const element = document.querySelector(`.${taskName}-verification`);
    if (element) {
      element.innerHTML = '<i class="fas fa-check-circle"></i> Verified';
      element.style.color = '#4CAF50';
      this.log(`Updated UI for ${taskName} verification`);
    } else {
      this.log(`${taskName} verification element not found!`, null, 'error');
    }
  },

  async checkVerificationStatus() {
    const wallet = document.getElementById('wallet')?.value.trim();
    if (!wallet) {
      this.log('No wallet for verification check');
      return;
    }

    try {
      this.log('Checking verification status...');
      const doc = await this.db.collection('airdropParticipants').doc(wallet).get();
      
      if (doc.exists) {
        const data = doc.data();
        this.log('User data found:', data);
        
        for (const task in data.verificationStatus) {
          if (data.verificationStatus[task]) {
            this.updateVerificationUI(task);
          }
        }
        
        if (data.status === 'registered') {
          this.updateStepStatus(1, 'completed');
          this.updateStepStatus(2, 'active');
          this.updateStepStatus(3, 'pending');
          this.log('Updated steps for registered user');
        }
      } else {
        this.log('No user data found in Firestore');
      }
    } catch (error) {
      this.log('Verification check failed:', error, 'error');
    }
  },

  copyReferralLink() {
    const referralLink = `${window.location.origin}${window.location.pathname}?ref=${this.generateReferralCode()}`;
    navigator.clipboard.writeText(referralLink)
      .then(() => {
        this.showAlert('Referral link copied!', 'success');
        this.log('Referral link copied to clipboard');
      })
      .catch(err => {
        this.log('Failed to copy referral link:', err, 'error');
        this.showAlert('Failed to copy link', 'error');
      });
  },

  generateReferralCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  },

  isValidSolanaAddress(address) {
    const isValid = address.length >= 32 && address.length <= 44 && 
                   /^[A-HJ-NP-Za-km-z1-9]*$/.test(address);
    this.log(`Solana address validation: ${isValid}`);
    return isValid;
  },

  showAlert(message, type = 'error') {
    this.log(`Showing alert: ${type} - ${message}`);
    
    // Remove existing alerts
    document.querySelectorAll('.alert').forEach(alert => alert.remove());
    
    const alert = document.createElement('div');
    alert.className = `alert ${type}`;
    alert.textContent = message;
    document.body.appendChild(alert);
    
    setTimeout(() => {
      alert.classList.add('fade-out');
      setTimeout(() => alert.remove(), 500);
    }, 3000);
  },

  showSection(sectionId) {
    this.log(`Showing section: ${sectionId}`);
    
    document.querySelectorAll('.section').forEach(s => {
      s.classList.remove('active');
    });
    
    const section = document.getElementById(sectionId);
    if (section) {
      section.classList.add('active');
      history.pushState(null, null, `#${sectionId}`);
      this.scrollToTop();
    } else {
      this.log(`Section ${sectionId} not found!`, null, 'error');
    }
  },

  handleInitialRoute() {
    const section = this.getSectionFromHref(window.location.hash) || 'home';
    this.log(`Initial route detected: ${section}`);
    this.showSection(section);
  },

  getSectionFromHref(href) {
    return href.replace(/^#\/?/, '') || 'home';
  },

  initCounters() {
    this.log('Initializing counters');
    this.animateCounter('participants-counter', 12500);
    this.animateCounter('tokens-counter', 2500000);
  },

  animateCounter(id, target) {
    const element = document.getElementById(id);
    if (!element) {
      this.log(`Counter element ${id} not found!`, null, 'error');
      return;
    }
    
    this.log(`Animating counter ${id} to ${target}`);
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
    this.log('Tracking conversion');
    if (typeof gtag !== 'undefined') {
      gtag('event', 'conversion', {
        'send_to': 'AW-123456789/AbCdEfGhIjKlMnOpQrStUv'
      });
    }
  }
};

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
  MetaFrogApp.init();
});

window.addEventListener('load', () => {
  if (!MetaFrogApp.hasInitialLoad) {
    MetaFrogApp.scrollToTop();
  }
});

window.addEventListener('error', (e) => {
  console.error('Global error:', e.error);
  if (typeof MetaFrogApp !== 'undefined') {
    MetaFrogApp.showAlert('An unexpected error occurred', 'error');
  }
});
