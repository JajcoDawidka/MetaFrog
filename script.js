/**
 * MetaFrog - Complete Website Script
 * Version 2.6 - Fixed Airdrop Steps Status Logic
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
    init() {
      document.documentElement.style.scrollBehavior = 'smooth';
      this.scrollToTop();
      
      this.initializeFirebase();
      this.setupEventListeners();
      this.handleInitialRoute();
      this.initCounters();
      this.checkVerificationStatus();
      
      // Initialize steps with correct colors
      this.initializeAirdropSteps();
    },
  
    initializeAirdropSteps() {
      const steps = document.querySelectorAll('.step-card');
      
      // Check if user already registered
      const wallet = document.getElementById('wallet')?.value.trim();
      
      if (!wallet) {
        // New user - Step 1 active (purple), others pending (gray)
        steps.forEach((step, index) => {
          step.classList.remove('completed-step', 'active-step', 'pending-step');
          step.classList.add(index === 0 ? 'active-step' : 'pending-step');
          
          // Update status text
          const statusElement = step.querySelector('.step-status');
          if (statusElement) {
            statusElement.textContent = index === 0 ? 'ACTIVE' : 'PENDING';
          }
        });
      }
    },
  
    scrollToTop() {
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
        
        // Update steps after successful registration
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
        // Reset all status classes
        step.classList.remove('completed-step', 'active-step', 'pending-step');
        
        // Add new status class
        step.classList.add(`${status}-step`);
        
        // Update status text
        const statusElement = step.querySelector('.step-status');
        if (statusElement) {
          statusElement.textContent = status.toUpperCase();
        }
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
          
          // Update verification status
          for (const task in data.verificationStatus) {
            if (data.verificationStatus[task]) {
              this.updateVerificationUI(task);
            }
          }
          
          // If registered, update steps
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
        setTimeout(() => this.scrollToTop(), 10);
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
  
  document.addEventListener('DOMContentLoaded', () => MetaFrogApp.init());
  window.addEventListener('error', (e) => console.error('Error:', e.error));
