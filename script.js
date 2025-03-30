/**
 * MetaFrog - Final Working Version with Firebase
 * Now with admin panel support
 */

class MetaFrogApp {
  constructor() {
    // Initialize Firebase
    this.firebaseConfig = {
      apiKey: "YOUR_API_KEY",
      authDomain: "YOUR_PROJECT.firebaseapp.com",
      databaseURL: "https://YOUR_PROJECT.firebaseio.com",
      projectId: "YOUR_PROJECT",
      storageBucket: "",
      messagingSenderId: "YOUR_SENDER_ID",
      appId: "YOUR_APP_ID"
    };

    firebase.initializeApp(this.firebaseConfig);
    this.database = firebase.database();

    this.validSections = ['home', 'games', 'airdrop', 'staking', 'about'];
    this.init();
  }

  init() {
    this.setupNavigation();
    this.handleInitialSection();
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
        const section = this.getSectionFromHref(link.getAttribute('href'));
        this.navigateTo(section);
      });
    });
  }

  handleInitialSection() {
    const path = this.getCleanPath(window.location.pathname);
    this.showSection(path);
  }

  navigateTo(section) {
    const cleanSection = this.getCleanPath(section);
    if (!this.isValidPath(cleanSection)) return;
    
    this.showSection(cleanSection);
    window.history.pushState({}, '', `/${cleanSection === 'home' ? '' : cleanSection}`);
  }

  showSection(section) {
    document.querySelectorAll('.section').forEach(sec => {
      sec.classList.remove('active');
    });

    const sectionEl = document.getElementById(section);
    if (sectionEl) {
      sectionEl.classList.add('active');
      window.scrollTo(0, 0);
    }

    this.updateNavStyle(section);

    if (section === 'airdrop') {
      this.initAirdrop();
    }
  }

  // Helper methods
  getCleanPath(path) {
    const clean = path.replace(/^\//, '').split('/')[0] || 'home';
    return this.isValidPath(clean) ? clean : 'home';
  }

  isValidPath(path) {
    return this.validSections.includes(path);
  }

  getSectionFromHref(href) {
    return href === '/' ? 'home' : href.replace(/^\//, '').split('?')[0];
  }

  updateNavStyle(activeSection) {
    document.querySelectorAll('nav a').forEach(link => {
      const linkSection = this.getSectionFromHref(link.getAttribute('href'));
      if (linkSection === activeSection) {
        link.style.backgroundColor = '#8a2be2';
        link.style.color = '#111';
      } else {
        link.style.backgroundColor = '';
        link.style.color = '';
      }
    });
  }

  // ======================
  // FIREBASE INTEGRATION
  // ======================
  async saveAirdropData(wallet, xUsername, telegram, tiktok) {
    try {
      const newEntry = {
        wallet,
        xUsername,
        telegram,
        tiktok: tiktok || "",
        date: new Date().toISOString(),
        verified: false,
        tasks: {
          twitter: false,
          telegram: false,
          tiktok: false
        }
      };

      await this.database.ref('airdrops/').push(newEntry);
      return true;
    } catch (error) {
      console.error("Firebase save error:", error);
      return false;
    }
  }

  // ==================
  // AIRDROP MANAGEMENT
  // ==================
  initAirdrop() {
    this.resetAirdropSteps();
    
    if (localStorage.getItem('airdropFormSubmitted')) {
      this.setStepState(1, 'completed');
      this.setStepState(2, 'active');
    } else {
      this.setStepState(1, 'active');
    }

    const form = document.querySelector('.airdrop-form');
    if (form) {
      form.addEventListener('submit', (e) => this.handleAirdropForm(e));
    }

    this.setupTaskVerification();
  }

  resetAirdropSteps() {
    document.querySelectorAll('.step-card').forEach(step => {
      step.classList.remove('completed-step', 'active-step', 'pending-step');
      const status = step.querySelector('.step-status');
      if (status) {
        status.textContent = 'PENDING';
        status.style.color = '#777';
      }
    });
  }

  setStepState(stepNumber, state) {
    const step = document.querySelector(`.step-card:nth-child(${stepNumber})`);
    if (!step) return;

    step.classList.remove('completed-step', 'active-step', 'pending-step');
    const status = step.querySelector('.step-status');
    if (!status) return;

    switch(state) {
      case 'active':
        step.classList.add('active-step');
        status.textContent = 'ACTIVE';
        status.style.color = '#8a2be2';
        break;
      case 'completed':
        step.classList.add('completed-step');
        status.textContent = 'COMPLETED';
        status.style.color = '#4CAF50';
        break;
      case 'pending':
        step.classList.add('pending-step');
        status.textContent = 'PENDING';
        status.style.color = '#777';
        break;
    }
  }

  async handleAirdropForm(e) {
    e.preventDefault();

    const wallet = document.getElementById('wallet').value.trim();
    const xUsername = document.getElementById('xUsername').value.trim();
    const telegram = document.getElementById('telegram').value.trim();
    const tiktok = document.getElementById('tiktok').value.trim();

    if (!wallet || !xUsername || !telegram) {
      alert('Please fill all required fields');
      return;
    }

    const success = await this.saveAirdropData(wallet, xUsername, telegram, tiktok);
    
    if (success) {
      localStorage.setItem('airdropFormSubmitted', 'true');
      localStorage.setItem('airdropFormData', JSON.stringify({
        wallet,
        xUsername,
        telegram,
        tiktok
      }));
      
      this.setStepState(1, 'completed');
      this.setStepState(2, 'active');
      
      alert('Registration successful! You can now complete the tasks.');
    } else {
      alert('Error saving data. Please try again.');
    }
  }

  setupTaskVerification() {
    if (localStorage.getItem('dexScreenerVisited')) {
      this.markTaskVerified('dexscreener');
    }

    document.querySelectorAll('.task-link').forEach(link => {
      link.addEventListener('click', (e) => {
        if (link.classList.contains('dexscreener-link')) {
          localStorage.setItem('dexScreenerVisited', 'true');
          this.markTaskVerified('dexscreener');
        }
      });
    });
  }

  markTaskVerified(taskType) {
    const taskElement = document.querySelector(`.${taskType}-link`).closest('.task-card');
    if (taskElement) {
      const status = taskElement.querySelector('.verification-status');
      if (status) {
        status.textContent = "✓ Verified";
        status.style.color = "#4CAF50";
      }
    }
  }

  copyReferralLink() {
    const referralLink = "https://metafrog.xyz/airdrop?ref=user123";
    const button = document.querySelector('.task-link button');
    
    if (!button) return;

    navigator.clipboard.writeText(referralLink)
      .then(() => {
        const originalHTML = button.innerHTML;
        button.innerHTML = '<i class="fas fa-check"></i> Copied!';
        
        setTimeout(() => {
          button.innerHTML = originalHTML;
        }, 2000);
      })
      .catch(err => {
        console.error('Copy failed:', err);
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = referralLink;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        
        const originalHTML = button.innerHTML;
        button.innerHTML = '<i class="fas fa-check"></i> Copied!';
        setTimeout(() => {
          button.innerHTML = originalHTML;
        }, 2000);
      });
  }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
  window.app = new MetaFrogApp();
  
  // Handle browser back/forward
  window.addEventListener('popstate', () => {
    window.app.handleInitialSection();
  });

  // Global functions for HTML onclick handlers
  window.showHome = () => window.app.navigateTo('home');
  window.showGames = () => window.app.navigateTo('games');
  window.showAirdrop = () => window.app.navigateTo('airdrop');
  window.showStaking = () => window.app.navigateTo('staking');
  window.showAbout = () => window.app.navigateTo('about');
  window.copyReferralLink = () => window.app.copyReferralLink();
});
