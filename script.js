/**
 * MetaFrog - Core Functionality
 * Includes:
 * - Airdrop progress system
 * - Form validation and Firebase integration
 * - Basic navigation
 */
class MetaFrogApp {
  constructor() {
    this.firebaseConfig = {
      apiKey: "AIzaSyAR6Ha8baMX5EPsPVayTno0e0QBRqZrmco",
      authDomain: "metafrog-airdrop.firebaseapp.com",
      projectId: "metafrog-airdrop",
      storageBucket: "metafrog-airdrop.appspot.com",
      messagingSenderId: "546707737127",
      appId: "1:546707737127:web:67956ae63ffef3ebeddc02"
    };
    
    this.init();
  }

  async init() {
    firebase.initializeApp(this.firebaseConfig);
    this.db = firebase.firestore();
    
    this.setupNavigation();
    this.initAirdrop();
    this.setupEventListeners();
  }

  // ======================
  // NAVIGATION MANAGEMENT
  // ======================
  setupNavigation() {
    document.querySelectorAll('nav a').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const sectionId = link.getAttribute('href').substring(1);
        this.showSection(sectionId);
      });
    });
  }

  showSection(sectionId) {
    document.querySelectorAll('.section').forEach(section => {
      section.classList.remove('active');
    });
    
    const section = document.getElementById(sectionId);
    if (section) section.classList.add('active');
  }

  // ==================
  // AIRDROP MANAGEMENT
  // ==================
  initAirdrop() {
    this.setupAirdropForm();
    this.checkSubmissionStatus();
  }

  setupAirdropForm() {
    const form = document.getElementById('airdropForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleAirdropSubmission();
    });
  }

  async handleAirdropSubmission() {
    const formData = {
      wallet: document.getElementById('wallet').value.trim(),
      xUsername: document.getElementById('xUsername').value.trim(),
      telegram: document.getElementById('telegram').value.trim(),
      tiktok: document.getElementById('tiktok').value.trim() || 'Not provided',
      timestamp: new Date().toISOString(),
      status: 'registered'
    };

    if (!this.validateForm(formData)) return;

    try {
      await this.db.collection("airdrop_submissions").add(formData);
      this.updateUIAfterSubmission();
      this.saveSubmissionToLocalStorage();
    } catch (error) {
      console.error("Submission error:", error);
      alert('Error submitting form. Please try again.');
    }
  }

  validateForm(data) {
    if (!data.wallet || data.wallet.length < 32 || data.wallet.length > 44) {
      alert('Invalid SOL wallet address (32-44 characters required)');
      return false;
    }

    if (!data.xUsername.startsWith('@') || !data.telegram.startsWith('@')) {
      alert('Usernames must start with @');
      return false;
    }

    return true;
  }

  updateUIAfterSubmission() {
    document.getElementById('step1').classList.remove('active-step');
    document.getElementById('step1').classList.add('completed-step');
    document.getElementById('status1').textContent = 'COMPLETED';
    
    document.getElementById('step2').classList.remove('pending-step');
    document.getElementById('step2').classList.add('active-step');
    document.getElementById('status2').textContent = 'ACTIVE';
    
    alert('Registration successful! Complete tasks to qualify.');
  }

  saveSubmissionToLocalStorage() {
    localStorage.setItem('mfrogAirdropSubmitted', 'true');
  }

  checkSubmissionStatus() {
    if (localStorage.getItem('mfrogAirdropSubmitted') === 'true') {
      this.updateUIAfterSubmission();
    } else {
      document.getElementById('step1').classList.add('active-step');
      document.getElementById('status1').textContent = 'ACTIVE';
    }
  }

  // =====================
  // TASK VERIFICATION
  // =====================
  setupEventListeners() {
    // DexScreener verification
    const dexscreenerLink = document.querySelector('.dexscreener-link');
    if (dexscreenerLink) {
      dexscreenerLink.addEventListener('click', () => {
        this.markTaskAsVerified('dexscreener');
      });
    }

    // Referral system
    const referralButton = document.querySelector('.task-link[onclick="copyReferralLink()"]');
    if (referralButton) {
      referralButton.addEventListener('click', (e) => {
        e.preventDefault();
        this.copyReferralLink();
      });
    }
  }

  markTaskAsVerified(taskType) {
    const statusElement = document.querySelector(`.${taskType}-verification`);
    if (statusElement) {
      statusElement.textContent = '✓ Verified';
      statusElement.style.color = '#4CAF50';
    }
  }

  copyReferralLink() {
    const referralId = localStorage.getItem('mfrogReferralId') || this.generateReferralId();
    const referralLink = `${window.location.href}?ref=${referralId}`;
    
    navigator.clipboard.writeText(referralLink)
      .then(() => alert('Referral link copied!'))
      .catch(() => {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = referralLink;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        alert('Referral link copied!');
      });
  }

  generateReferralId() {
    const id = 'mfrog-' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('mfrogReferralId', id);
    return id;
  }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
  new MetaFrogApp();
});
