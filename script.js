/**
 * MetaFrog - Complete Website Script
 * Version 4.2 - Fixed Form Submission
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
  db: null,

  init() {
    // Initialize smooth scrolling
    document.documentElement.style.scrollBehavior = 'smooth';
    
    // Initialize Firebase
    try {
      firebase.initializeApp(firebaseConfig);
      this.db = firebase.firestore();
      console.log('Firebase initialized successfully');
    } catch (error) {
      console.error('Firebase initialization error:', error);
      this.showAlert('⚠️ Connection error - using fallback mode', 'warning');
    }

    this.setupEventListeners();
    this.handleInitialRoute();
    this.setupFormValidation();
    this.setupUsernameFormatting();
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
    const form = document.querySelector('.airdrop-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleAirdropForm(e);
      });
    }

    // Handle browser back/forward
    window.addEventListener('popstate', () => {
      this.handleInitialRoute();
    });

    // Copy referral link button
    const copyBtn = document.querySelector('.task-link[onclick*="copyReferralLink"]');
    if (copyBtn) {
      copyBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.copyReferralLink();
      });
    }
  },

  setupFormValidation() {
    const walletInput = document.getElementById('wallet');
    if (walletInput) {
      walletInput.addEventListener('blur', () => {
        if (walletInput.value && !this.isValidSolanaAddress(walletInput.value)) {
          walletInput.style.borderColor = 'red';
          this.showAlert('Invalid Solana wallet address', 'error');
        } else {
          walletInput.style.borderColor = '';
        }
      });
    }
  },

  setupUsernameFormatting() {
    ['xUsername', 'telegram', 'tiktok'].forEach(id => {
      const input = document.getElementById(id);
      if (input) {
        input.addEventListener('blur', () => {
          if (input.value && !input.value.startsWith('@')) {
            input.value = `@${input.value}`;
          }
        });
      }
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

    try {
      const wallet = document.getElementById('wallet').value.trim();
      const xUsername = document.getElementById('xUsername').value.trim();
      const telegram = document.getElementById('telegram').value.trim();
      const tiktok = document.getElementById('tiktok').value.trim();

      // Validation
      if (!wallet || !xUsername || !telegram) {
        throw new Error('Please fill all required fields');
      }

      if (!this.isValidSolanaAddress(wallet)) {
        throw new Error('Invalid Solana wallet address');
      }

      const submissionData = {
        wallet,
        xUsername: xUsername.startsWith('@') ? xUsername : `@${xUsername}`,
        telegram: telegram.startsWith('@') ? telegram : `@${telegram}`,
        tiktok: tiktok ? (tiktok.startsWith('@') ? tiktok : `@${tiktok}`) : 'N/A',
        timestamp: new Date().toISOString(),
        completedTasks: [],
        status: 'registered',
        verificationStatus: {
          twitter: false,
          telegram: false,
          tiktok: false,
          dexscreener: false
        }
      };

      // Debug mode - simulate submission
      if (this.debugMode) {
        console.log('Debug mode - submission data:', submissionData);
        await new Promise(resolve => setTimeout(resolve, 1500));
      } 
      // Production mode - save to Firebase
      else if (this.db) {
        await this.db.collection('airdropParticipants').doc(wallet).set(submissionData);
      } else {
        throw new Error('Database connection error');
      }

      // Update UI after success
      this.updateStepStatus(1, 'completed');
      this.updateStepStatus(2, 'active');
      this.updateStepStatus(3, 'pending');
      this.showAlert('✅ Registration successful!', 'success');
      localStorage.setItem('mfrog_registered', 'true');
      
    } catch (error) {
      console.error('Submission error:', error);
      this.showAlert(`❌ ${error.message}`, 'error');
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
    // Remove existing alerts first
    document.querySelectorAll('.mfrog-alert').forEach(alert => alert.remove());
    
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
      .then(() => this.showAlert('Referral link copied to clipboard!', 'success'))
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

  // Admin function to view submissions
  async viewSubmissions() {
    try {
      if (!this.db) {
        throw new Error('Firebase not initialized');
      }
      
      const snapshot = await this.db.collection('airdropParticipants').get();
      const submissions = [];
      snapshot.forEach(doc => {
        submissions.push(doc.data());
      });
      
      console.table(submissions);
      return submissions;
      
    } catch (error) {
      console.error('Error fetching submissions:', error);
      this.showAlert(`❌ ${error.message}`, 'error');
      return [];
    }
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
  
  .mfrog-alert.warning {
    background: #ff9800;
    border-left: 5px solid #e65100;
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

  /* Completed step styling */
  .completed-step {
    border-color: #4CAF50 !important;
    background: linear-gradient(135deg, #1a1a1a, #0a2e0a) !important;
  }

  .completed-step .step-number {
    background: #4CAF50 !important;
    border-color: #4CAF50 !important;
  }

  .completed-step h3 {
    color: #4CAF50 !important;
  }

  .completed-step .step-status {
    background: rgba(76, 175, 80, 0.2) !important;
    color: #4CAF50 !important;
  }
`;
document.head.appendChild(style);
