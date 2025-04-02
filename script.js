/**
 * MetaFrog - Secure Production Version
 * Full Firebase Integration with Security Rules
 */

// Firebase configuration
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
      await this.loadFirebase();
      this.setupNavigation();
      this.setupAirdropForm();
      this.initializeSteps();
      this.showSection(window.location.hash.substring(1) || 'home');
      this.setupTaskLinks();
    } catch (error) {
      console.error('Initialization error:', error);
      this.showEmergencyMode();
    }
  },

  async loadFirebase() {
    if (typeof firebase === 'undefined') {
      await this.loadScript('https://www.gstatic.com/firebasejs/9.6.0/firebase-app-compat.js');
      await this.loadScript('https://www.gstatic.com/firebasejs/9.6.0/firebase-firestore-compat.js');
      await this.loadScript('https://www.gstatic.com/firebasejs/9.6.0/firebase-database-compat.js');
    }

    const app = firebase.initializeApp(firebaseConfig);
    this.db = app.firestore();
    this.realtimeDb = app.database();
  },

  setupNavigation() {
    document.querySelectorAll('nav a').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const sectionId = e.target.getAttribute('href').substring(1);
        this.showSection(sectionId);
      });
    });
  },

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
      history.pushState(null, null, `#${sectionId}`);
    }
  },

  setupAirdropForm() {
    const form = document.querySelector('.airdrop-form');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleFormSubmit(e.target);
      });
    }
  },

  async handleFormSubmit(form) {
    if (this.isProcessing) return;
    
    const submitBtn = form.querySelector('button[type="submit"]');
    this.isProcessing = true;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> Processing...';

    try {
      const formData = this.getFormData(form);
      const success = await this.saveToFirebase(formData);
      if (success) {
        this.updateSteps();
        this.updateUIAfterSubmission(formData.wallet);
        form.querySelectorAll('input').forEach(input => input.disabled = true);
      }
    } catch (error) {
      this.showError(error);
    } finally {
      this.isProcessing = false;
    }
  },

  getFormData(form) {
    const data = {
      wallet: form.wallet.value.trim(),
      xUsername: this.formatUsername(form.xUsername.value.trim()),
      telegram: this.formatUsername(form.telegram.value.trim()),
      tiktok: form.tiktok.value.trim() ? this.formatUsername(form.tiktok.value.trim()) : 'N/A',
      status: 'pending',
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      ip: '', // Will be set server-side
      userAgent: navigator.userAgent
    };
    
    if (!data.wallet || !data.xUsername || !data.telegram) {
      throw new Error('Please fill all required fields');
    }

    if (!this.isValidSolanaAddress(data.wallet)) {
      throw new Error('Invalid Solana wallet address');
    }

    return data;
  },

  formatUsername(username) {
    return username.startsWith('@') ? username : `@${username}`;
  },

  isValidSolanaAddress(address) {
    return address.length >= 32 && address.length <= 44 && /^[A-HJ-NP-Za-km-z1-9]*$/.test(address);
  },

  async saveToFirebase(data) {
    try {
      // First save to Firestore
      await this.db.collection('airdropParticipants').doc(data.wallet).set(data);
      
      // Then save to Realtime Database
      await this.realtimeDb.ref(`airdropSubmissions/${data.wallet.replace(/\./g, '_')}`).set({
        ...data,
        timestamp: firebase.database.ServerValue.TIMESTAMP
      });
      
      return true;
    } catch (error) {
      console.error("Firebase error:", error);
      if (error.code === 'permission-denied') {
        this.showError(new Error('Server error. Please try again later.'));
      } else {
        this.showError(new Error('Network error. Please check your connection.'));
      }
      return false;
    }
  },

  updateUIAfterSubmission(wallet) {
    localStorage.setItem('mfrog_registered', 'true');
    localStorage.setItem('mfrog_wallet', wallet);
    this.showAlert('✅ Registration successful! Your submission is being verified.');
  },

  initializeSteps() {
    const hasSubmitted = localStorage.getItem('mfrog_registered');
    const stepsContainer = document.querySelector('.airdrop-steps');
    
    if (!hasSubmitted) {
      // First visit - step 1 active (purple), others pending
      stepsContainer.innerHTML = `
        <div class="step-card active-step">
          <div class="step-number">1</div>
          <h3>Register for Airdrop</h3>
          <p>Enter your SOL wallet address, provide your X (Twitter), Telegram, and TikTok usernames</p>
          <div class="step-status">ACTIVE</div>
        </div>
        
        <div class="step-connector"></div>
        
        <div class="step-card pending-step">
          <div class="step-number">2</div>
          <h3>Complete Tasks</h3>
          <p>Finish the required actions to qualify for the airdrop</p>
          <div class="step-status">PENDING</div>
        </div>
        
        <div class="step-connector"></div>
        
        <div class="step-card pending-step">
          <div class="step-number">3</div>
          <h3>Wait for Airdrop Completion</h3>
          <p>Once the tasks are completed and verified, you'll need to wait for the airdrop to finish</p>
          <div class="step-status">PENDING</div>
        </div>
      `;
    } else {
      // After submission - step 1 completed, step 2 active, step 3 pending
      this.updateSteps();
    }
  },

  updateSteps() {
    const stepsContainer = document.querySelector('.airdrop-steps');
    stepsContainer.innerHTML = `
      <div class="step-card completed-step">
        <div class="step-number">1</div>
        <h3>Register for Airdrop</h3>
        <p>Enter your SOL wallet address, provide your X (Twitter), Telegram, and TikTok usernames</p>
        <div class="step-status">COMPLETED</div>
      </div>
      
      <div class="step-connector"></div>
      
      <div class="step-card active-step">
        <div class="step-number">2</div>
        <h3>Complete Tasks</h3>
        <p>Finish the required actions to qualify for the airdrop</p>
        <div class="step-status">ACTIVE</div>
      </div>
      
      <div class="step-connector"></div>
      
      <div class="step-card pending-step">
        <div class="step-number">3</div>
        <h3>Wait for Airdrop Completion</h3>
        <p>Once the tasks are completed and verified, you'll need to wait for the airdrop to finish</p>
        <div class="step-status">PENDING</div>
      </div>
    `;
  },

  setupTaskLinks() {
    // Add click handlers for task links
    document.querySelectorAll('.task-link').forEach(link => {
      if (!link.classList.contains('dexscreener-link')) {
        link.addEventListener('click', (e) => {
          if (!localStorage.getItem('mfrog_registered')) {
            e.preventDefault();
            this.showAlert('Please register first by submitting your wallet address', 'error');
          }
        });
      }
    });

    // Special handler for DexScreener link
    const dexscreenerLink = document.querySelector('.dexscreener-link');
    if (dexscreenerLink) {
      dexscreenerLink.addEventListener('click', (e) => {
        if (!localStorage.getItem('mfrog_registered')) {
          e.preventDefault();
          this.showAlert('Please register first by submitting your wallet address', 'error');
          return;
        }
        
        e.preventDefault();
        window.open(dexscreenerLink.href, '_blank');
        this.showAlert('DexScreener task completed!', 'info');
        const verification = document.querySelector('.dexscreener-verification');
        verification.textContent = '✓ Verified';
        verification.style.color = '#4CAF50';
      });
    }
  },

  loadScript(url) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  },

  showAlert(message, type = 'success') {
    // Remove existing alerts
    document.querySelectorAll('.alert').forEach(alert => alert.remove());
    
    const alert = document.createElement('div');
    alert.className = `alert ${type}`;
    alert.innerHTML = `
      <span class="alert-icon">${type === 'success' ? '✓' : type === 'error' ? '✕' : '⚠️'}</span>
      ${message}
    `;
    document.body.appendChild(alert);
    
    setTimeout(() => {
      alert.classList.add('fade-out');
      setTimeout(() => alert.remove(), 300);
    }, 3000);
  },

  showError(error) {
    console.error('Error:', error);
    this.showAlert(`❌ ${error.message}`, 'error');
  },

  showEmergencyMode() {
    const submitBtn = document.querySelector('.airdrop-form button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Service unavailable';
    }
    this.showAlert('⚠️ System is in maintenance mode', 'error');
  },

  copyReferralLink() {
    if (!localStorage.getItem('mfrog_registered')) {
      this.showAlert('Please register first by submitting your wallet address', 'error');
      return;
    }
    
    const referralLink = `${window.location.origin}${window.location.pathname}?ref=${localStorage.getItem('mfrog_wallet')}`;
    navigator.clipboard.writeText(referralLink)
      .then(() => this.showAlert('Referral link copied to clipboard!', 'info'))
      .catch(() => this.showAlert('Failed to copy referral link', 'error'));
  }
};

// Make functions available globally
window.copyReferralLink = MetaFrogApp.copyReferralLink.bind(MetaFrogApp);

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => MetaFrogApp.init());
window.addEventListener('popstate', () => {
  MetaFrogApp.showSection(window.location.hash.substring(1) || 'home');
});
