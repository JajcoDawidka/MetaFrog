/**
 * MetaFrog - Complete Website Script
 * Version 4.0 - Final Fixes
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
  debugMode: false, // Set to true for testing
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
    
    // Force scroll to top on initial load
    this.scrollToTop(true);
  },

  // Improved scrolling system
  scrollToTop(force = false) {
    if (force || window.pageYOffset > 0) {
      window.scrollTo({
        top: 0,
        behavior: force ? 'auto' : 'smooth'
      });
      
      // Double check after delay
      setTimeout(() => {
        if (window.pageYOffset > 0) {
          window.scrollTo({ top: 0, behavior: 'auto' });
        }
      }, 100);
    }
  },

  setupEventListeners() {
    // Navigation handling
    document.addEventListener('click', (e) => {
      const navLink = e.target.closest('nav a');
      if (navLink) {
        e.preventDefault();
        const sectionId = navLink.getAttribute('href').substring(1);
        this.showSection(sectionId);
        this.scrollToTop();
      }

      // Form submission
      if (e.target.closest('.airdrop-form button[type="submit"]')) {
        e.preventDefault();
        this.handleAirdropForm(e);
      }
    });

    // Handle browser back/forward
    window.addEventListener('popstate', () => {
      this.handleInitialRoute();
      this.scrollToTop();
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

    // Prepare data
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
      // Save to Firestore
      await this.db.collection('airdropParticipants').doc(wallet).set(submissionData);
      
      // Update UI
      this.updateStepStatus(1, 'completed');
      this.updateStepStatus(2, 'active');
      this.updateStepStatus(3, 'pending');
      
      // Show success notification
      this.showAlert(
        '✅ Registration successful!<br>You can now complete the tasks.',
        'success'
      );
      
      // Save to localStorage to persist through refresh
      localStorage.setItem('mfrog_registered', 'true');
      
    } catch (error) {
      console.error('Submission error:', error);
      this.showAlert(
        '❌ Submission failed<br>Please try again later',
        'error'
      );
    } finally {
      this.isProcessing = false;
      this.toggleSubmitButton(false);
    }
  },

  // Beautiful alert notifications
  showAlert(message, type = 'error') {
    // Remove existing alerts
    document.querySelectorAll('.mfrog-alert').forEach(el => el.remove());
    
    const alert = document.createElement('div');
    alert.className = `mfrog-alert ${type}`;
    alert.innerHTML = `
      <div class="mfrog-alert-content">
        ${message}
      </div>
    `;
    
    document.body.appendChild(alert);
    
    // Auto-remove after delay
    setTimeout(() => {
      alert.classList.add('fade-out');
      setTimeout(() => alert.remove(), 500);
    }, 5000);
  },

  // Check if user already registered
  checkVerificationStatus() {
    const wallet = document.getElementById('wallet')?.value.trim();
    if (!wallet) return;

    // Check localStorage first
    if (localStorage.getItem('mfrog_registered')) {
      this.updateStepStatus(1, 'completed');
      this.updateStepStatus(2, 'active');
      this.updateStepStatus(3, 'pending');
      return;
    }

    // Check Firestore
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

  // Accessing user data in Firebase:
  // 1. Go to Firebase Console: https://console.firebase.google.com/
  // 2. Select your project "metafrog-airdrop"
  // 3. Go to "Firestore Database" section
  // 4. All submissions are in "airdropParticipants" collection
  // 5. You can export data or view directly in console

  // ... (rest of your existing functions remain exactly the same) ...
  // [Include all other functions from previous versions here]
  // Make sure to include: initializeAirdropSteps, updateStepStatus, 
  // toggleSubmitButton, copyReferralLink, isValidSolanaAddress, etc.
  // They should remain identical to your working versions

};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  MetaFrogApp.init();
});

// Additional CSS for beautiful alerts
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
