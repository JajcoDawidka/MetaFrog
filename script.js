/**
 * MetaFrog - Main JavaScript File with Firebase Integration
 * Improved version with better architecture and error handling
 */

// Firebase configuration (replace with your actual config)
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Main application controller
const MetaFrogApp = {
  // Initialize the application
  init() {
    this.initializeFirebase();
    this.checkLocalStorage();
    this.setupEventListeners();
    this.handleInitialRoute();
    this.checkVerificationStatus();
    this.checkAirdropProgress();
  },

  // Initialize Firebase
  initializeFirebase() {
    try {
      // Initialize Firebase
      firebase.initializeApp(firebaseConfig);
      this.db = firebase.firestore();
      console.log("Firebase initialized successfully");
    } catch (e) {
      console.error("Firebase initialization error:", e);
    }
  },

  // Check if localStorage is available
  checkLocalStorage() {
    try {
      const test = '__test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      this.storageAvailable = true;
    } catch (e) {
      this.storageAvailable = false;
      console.warn('LocalStorage is not available. Some features may be limited.');
    }
  },

  // Setup all event listeners using event delegation
  setupEventListeners() {
    // Navigation links
    document.addEventListener('click', (e) => {
      const navLink = e.target.closest('nav a');
      if (navLink) {
        e.preventDefault();
        const section = this.getSectionFromHref(navLink.getAttribute('href'));
        this.showSection(section);
      }

      // Copy referral link
      if (e.target.closest('.copy-referral-btn')) {
        this.copyReferralLink();
      }

      // DexScreener verification
      if (e.target.closest('.dexscreener-link')) {
        e.preventDefault();
        this.verifyDexScreener(e);
      }
    });

    // Form submission
    const airdropForm = document.querySelector('.airdrop-form');
    if (airdropForm) {
      airdropForm.addEventListener('submit', (e) => this.handleAirdropForm(e));
    }

    // Browser back/forward navigation
    window.addEventListener('popstate', () => this.handleInitialRoute());
  },

  // Handle airdrop form submission
  async handleAirdropForm(e) {
    e.preventDefault();
    
    const wallet = document.getElementById('wallet').value.trim();
    const xUsername = document.getElementById('xUsername').value.trim();
    const telegram = document.getElementById('telegram').value.trim();
    const tiktok = document.getElementById('tiktok').value.trim();

    // Basic validation
    if (!wallet || !xUsername || !telegram) {
      alert('Please fill all required fields');
      return;
    }

    // Validate SOL wallet address format (basic check)
    if (!this.isValidSolanaAddress(wallet)) {
      alert('Please enter a valid Solana wallet address');
      return;
    }

    // Prepare submission data
    const submissionData = {
      wallet,
      xUsername,
      telegram,
      tiktok: tiktok || 'N/A',
      timestamp: new Date().toISOString(),
      ipAddress: '', // Will be filled by cloud function or frontend if possible
      userAgent: navigator.userAgent,
      completedTasks: [],
      status: 'registered',
      referralCode: this.getReferralCodeFromURL() || 'direct'
    };

    try {
      // Save to Firestore
      await this.db.collection('airdropSubmissions').add(submissionData);
      
      // Advance to step 2 (Complete Tasks)
      this.advanceToStep(2);

      // Save form data to localStorage
      if (this.storageAvailable) {
        localStorage.setItem('airdropFormSubmitted', 'true');
        localStorage.setItem('airdropFormData', JSON.stringify(submissionData));
      }

      // Show success message
      alert('Registration successful! You can now complete the tasks.');
      
      // Track conversion (optional)
      this.trackConversion();
      
    } catch (error) {
      console.error("Error saving to Firestore:", error);
      alert('There was an error submitting your form. Please try again.');
    }
  },

  // Basic Solana address validation
  isValidSolanaAddress(address) {
    // Basic check - Solana addresses are base58 encoded and 32-44 chars long
    return address.length >= 32 && address.length <= 44 && 
           /^[A-HJ-NP-Za-km-z1-9]*$/.test(address);
  },

  // Get referral code from URL if present
  getReferralCodeFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('ref');
  },

  // Track conversion (optional)
  trackConversion() {
    // You can implement Google Analytics, Facebook Pixel, etc. here
    console.log("Airdrop registration conversion tracked");
  },

  // ... (reszta Twoich istniejących metod pozostaje bez zmian)
  // Pozostaw wszystkie inne metody bez zmian (showSection, updateNavStyle, etc.)
  
};

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  MetaFrogApp.init();
  
  // Example counters - you can remove or modify these
  if (typeof MetaFrogApp.animateCounter === 'function') {
    MetaFrogApp.animateCounter('participants-counter', 12500);
    MetaFrogApp.animateCounter('tokens-counter', 2500000);
  }
});

// Handle errors globally
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  // You could add error tracking here
});
