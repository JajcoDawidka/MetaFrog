/**
 * MetaFrog - Complete Website Script
 * Version 2.9 - Fixed Initial Scroll + Airdrop Steps Logic
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
  hasInitialLoad: false,

  init() {
    document.documentElement.style.scrollBehavior = 'smooth';
    
    this.initializeFirebase();
    this.setupEventListeners();
    this.handleInitialRoute();
    this.initCounters();
    this.checkVerificationStatus();
    this.initializeAirdropSteps();
    
    // Special handling for initial load
    this.handleInitialScroll();
  },

  handleInitialScroll() {
    if (!this.hasInitialLoad) {
      this.hasInitialLoad = true;
      
      // Double scroll to top for initial load
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'auto' });
        
        // Second check after short delay
        setTimeout(() => {
          if (window.pageYOffset > 0) {
            window.scrollTo({ top: 0, behavior: 'auto' });
          }
        }, 100);
      }, 50);
    }
  },

  initializeAirdropSteps() {
    const steps = document.querySelectorAll('.step-card');
    const wallet = document.getElementById('wallet')?.value.trim();
    
    if (!wallet) {
      steps.forEach((step, index) => {
        this.updateStepElement(step, index === 0 ? 'active' : 'pending');
      });
    }
  },

  scrollToTop() {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
    
    // Fallback for stubborn browsers
    setTimeout(() => {
      if (window.pageYOffset > 0) {
        window.scrollTo({ top: 0, behavior: 'auto' });
      }
    }, 500);
  },

  initializeFirebase() {
    try {
      firebase.initializeApp(firebaseConfig);
      this.db = firebase.firestore();
    } catch (error) {
      console.error("Firebase error:", error);
      this.showAlert("Connection error. Please refresh.", "error");
    }
  },

  setupEventListeners() {
    document.addEventListener('click', (e) => {
      if (e.target.closest('nav a')) {
        e.preventDefault();
        const section = this.getSectionFromHref(e.target.closest('nav a').getAttribute('href'));
        this.showSection(section);
      }

      if (e.target.closest('.task-link') && e.target.closest('[onclick="copyReferralLink()"]')) {
        e.preventDefault();
        this.copyReferralLink();
      }

      if (e.target.closest('.dexscreener-link')) {
        e.preventDefault();
        this.verifyDexScreener(e);
      }
    });

    const airdropForm = document.querySelector('.airdrop-form');
    if (airdropForm) {
      airdropForm.addEventListener('submit', (e) => this.handleAirdropForm(e));
    }

    window.addEventListener('popstate', () => {
      this.handleInitialRoute();
      this.scrollToTop();
    });
  },

  async handleAirdropForm(e) {
    e.preventDefault();
    
    const wallet = document.getElementById('wallet').value.trim();
    const xUsername = document.getElementById('xUsername').value.trim();
    const telegram = document.getElementById('telegram').value.trim();
    const tiktok = document.getElementById('tiktok').value.trim();

    if (!wallet || !xUsername || !telegram) {
      this.showAlert('Please fill all required fields', 'error');
      return;
    }

    if (!this.isValidSolanaAddress(wallet)) {
      this.showAlert('Invalid Solana address', 'error');
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
      await this.db.collection('airdropParticipants').doc(wallet).set(submissionData);
      
      this.updateStepStatus(1, 'completed');
      this.updateStepStatus(2, 'active');
      this.updateStepStatus(3, 'pending');
      
      this.showAlert('Registration successful!', 'success');
    } catch (error) {
      console.error("Save error:", error);
      this.showAlert('Submission failed. Try again.', 'error');
    }
  },

  updateStepStatus(stepNumber, status) {
    const step = document.querySelector(`.step-card:nth-child(${stepNumber})`);
    if (step) {
      this.updateStepElement(step, status);
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
      this.showAlert('Enter wallet first', 'error');
      return;
    }

    try {
      await this.db.collection('airdropParticipants').doc(wallet).update({
        'verificationStatus.dexscreener': true,
        'completedTasks': firebase.firestore.FieldValue.arrayUnion('dexscreener')
      });
      
      this.updateVerificationUI('dexscreener');
      this.showAlert('Task verified!', 'success');
    } catch (error) {
      console.error("Verification error:", error);
      this.showAlert('Verification failed', 'error');
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
      console.error("Status check error:", error);
    }
  },

  copyReferralLink() {
    const link = `${window.location.origin}${window.location.pathname}?ref=${this.generateReferralCode()}`;
    navigator.clipboard.writeText(link)
      .then(() => this.showAlert('Link copied!', 'success'))
      .catch(err => {
        console.error('Copy error:', err);
        this.showAlert('Copy failed', 'error');
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

  showSection(sectionId) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    const section = document.getElementById(sectionId);
    if (section) {
      section.classList.add('active');
      history.pushState(null, null, `#${sectionId}`);
      this.scrollToTop();
    }
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
  }
};

// Initialize on full page load
window.addEventListener('load', () => {
  MetaFrogApp.init();
});

window.addEventListener('error', (e) => console.error('Error:', e.error));
