/**
 * MetaFrog - Complete Website Script
 * Version 4.1 - Fixed Navigation
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
  debugMode: false,
  isProcessing: false,

  init() {
    // Initialize smooth scrolling
    document.documentElement.style.scrollBehavior = 'smooth';
    
    // Initialize Firebase
    try {
      firebase.initializeApp(firebaseConfig);
      this.db = firebase.firestore();
      console.log('Firebase initialized');
    } catch (error) {
      console.error('Firebase error:', error);
    }

    this.setupEventListeners();
    this.handleInitialRoute();
    this.initCounters();
    this.checkVerificationStatus();
    this.initializeAirdropSteps();
    this.scrollToTop(true);
  },

  scrollToTop(force = false) {
    if (force || window.pageYOffset > 0) {
      window.scrollTo({
        top: 0,
        behavior: force ? 'auto' : 'smooth'
      });
      
      setTimeout(() => {
        if (window.pageYOffset > 0) {
          window.scrollTo({ top: 0, behavior: 'auto' });
        }
      }, 100);
    }
  },

  setupEventListeners() {
    // Improved navigation handling
    document.querySelectorAll('nav a').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const sectionId = e.target.getAttribute('href').substring(1);
        this.showSection(sectionId);
        this.scrollToTop();
      });
    });

    // Form submission
    document.querySelector('.airdrop-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleAirdropForm(e);
    });

    // Handle browser back/forward
    window.addEventListener('popstate', () => {
      this.handleInitialRoute();
    });
  },

  showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
      section.classList.remove('active');
    });

    // Show selected section
    const section = document.getElementById(sectionId);
    if (section) {
      section.classList.add('active');
      
      // Update URL without page reload
      if (window.location.hash !== `#${sectionId}`) {
        history.pushState(null, null, `#${sectionId}`);
      }
    }
  },

  handleInitialRoute() {
    const sectionId = window.location.hash.substring(1) || 'home';
    this.showSection(sectionId);
    this.scrollToTop();
  },

  async handleAirdropForm(e) {
    if (this.isProcessing) return;
    this.isProcessing = true;
    this.toggleSubmitButton(true);

    const wallet = document.getElementById('wallet').value.trim();
    const xUsername = document.getElementById('xUsername').value.trim();
    const telegram = document.getElementById('telegram').value.trim();
    const tiktok = document.getElementById('tiktok').value.trim();

    // Validation
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
      this.showAlert('✅ Registration successful!', 'success');
      localStorage.setItem('mfrog_registered', 'true');
      
    } catch (error) {
      console.error('Submission error:', error);
      this.showAlert('❌ Submission failed', 'error');
    } finally {
      this.isProcessing = false;
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

  showAlert(message, type = 'error') {
    const alert = document.createElement('div');
    alert.className = `mfrog-alert ${type}`;
    alert.innerHTML = `
      <div class="mfrog-alert-content">
        ${message}
      </div>
    `;
    document.body.appendChild(alert);
    
    setTimeout(() => {
      alert.classList.add('fade-out');
      setTimeout(() => alert.remove(), 500);
    }, 5000);
  },

  checkVerificationStatus() {
    const wallet = document.getElementById('wallet')?.value.trim();
    if (!wallet) return;

    if (localStorage.getItem('mfrog_registered')) {
      this.updateStepStatus(1, 'completed');
      this.updateStepStatus(2, 'active');
      this.updateStepStatus(3, 'pending');
      return;
    }

    if (this.db) {
      this.db.collection('airdropParticipants').doc(wallet).get()
        .then(doc => {
          if (doc.exists && doc.data().status === 'registered') {
            this.updateStepStatus(1, 'completed');
            this.updateStepStatus(2, 'active');
            this.updateStepStatus(3, 'pending');
            localStorage.setItem('mfrog_registered', 'true');
          }
        })
        .catch(error => console.error('Status check error:', error));
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
  }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  MetaFrogApp.init();
});

// Add alert styles
const style = document.createElement('style');
style.textContent = `
  .mfrog-alert {
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 25px;
    border-radius: 8px;
    color: white;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 10000;
    transform: translateX(200%);
    animation: slideIn 0.5s forwards;
    max-width: 350px;
  }
  
  .mfrog-alert.success {
    background: #4CAF50;
    border-left: 5px solid #2E7D32;
  }
  
  .mfrog-alert.error {
    background: #f44336;
    border-left: 5px solid #c62828;
  }
  
  .mfrog-alert-content {
    line-height: 1.5;
  }
  
  .mfrog-alert.fade-out {
    animation: fadeOut 0.5s forwards;
  }
  
  @keyframes slideIn {
    to { transform: translateX(0); }
  }
  
  @keyframes fadeOut {
    to { opacity: 0; transform: translateX(200%); }
  }
`;
document.head.appendChild(style);
