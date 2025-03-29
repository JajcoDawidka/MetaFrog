/**
 * MetaFrog - Complete Website Functionality
 * Includes:
 * - Section navigation
 * - Airdrop progress system
 * - Form validation
 * - Task verification
 * - Referral system
 */
// W funkcji init() dodaj:
handleInitialSection();

function handleInitialSection() {
  const path = window.location.pathname.replace('/', '') || 'home';
  const validSections = ['home', 'games', 'airdrop', 'staking', 'about'];
  
  if (!validSections.includes(path)) {
    window.location.href = '/'; // Przekieruj na home jeśli zła ścieżka
    return;
  }
  showSection(path);
}

class MetaFrogApp {
  constructor() {
    this.init();
  }

  init() {
    this.setupNavigation();
    this.initAirdrop();
    this.setupEventListeners();
    this.handleInitialSection();
  }

  // ======================
  // NAVIGATION MANAGEMENT
  // ======================
  setupNavigation() {
    document.querySelectorAll('nav a').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const section = link.getAttribute('href').replace('/', '') || 'home';
        this.showSection(section);
        history.pushState(null, null, `/${section === 'home' ? '' : section}`);
      });
    });

    window.addEventListener('popstate', () => this.handleInitialSection());
  }

  handleInitialSection() {
    const path = window.location.pathname.replace('/', '') || 'home';
    this.showSection(path);
  }

  showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
      section.classList.remove('active');
    });

    // Show requested section
    const section = document.getElementById(sectionId);
    if (section) {
      section.classList.add('active');
      window.scrollTo(0, 0);
    }

    // Update nav styling
    this.updateNavStyle(sectionId);

    // Special handling for airdrop section
    if (sectionId === 'airdrop') {
      this.initAirdrop();
    }
  }

  updateNavStyle(activeSection) {
    document.querySelectorAll('nav a').forEach(link => {
      link.style.backgroundColor = '';
      link.style.color = '';
    });

    const activeLink = document.querySelector(
      `nav a[href="/${activeSection === 'home' ? '' : activeSection}"]`
    );
    
    if (activeLink) {
      activeLink.style.backgroundColor = '#8a2be2';
      activeLink.style.color = '#111';
    }
  }

  // ==================
  // AIRDROP MANAGEMENT
  // ==================
  initAirdrop() {
    this.resetAirdropSteps();
    
    // Check localStorage for existing submission
    if (localStorage.getItem('airdropFormSubmitted')) {
      this.setStepState(1, 'completed');
      this.setStepState(2, 'active');
    } else {
      this.setStepState(1, 'active');
    }

    // Initialize form
    const form = document.querySelector('.airdrop-form');
    if (form) {
      form.addEventListener('submit', (e) => this.handleAirdropForm(e));
    }

    // Setup task verification
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

    // Reset classes
    step.classList.remove('completed-step', 'active-step', 'pending-step');

    // Get status element
    const status = step.querySelector('.step-status');
    if (!status) return;

    // Apply new state
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

  handleAirdropForm(e) {
    e.preventDefault();

    // Validate required fields
    const wallet = document.getElementById('wallet').value.trim();
    const xUsername = document.getElementById('xUsername').value.trim();
    const telegram = document.getElementById('telegram').value.trim();

    if (!wallet || !xUsername || !telegram) {
      alert('Please fill all required fields');
      return;
    }

    // Save submission
    localStorage.setItem('airdropFormSubmitted', 'true');
    localStorage.setItem('airdropFormData', JSON.stringify({
      wallet,
      xUsername,
      telegram,
      tiktok: document.getElementById('tiktok').value.trim()
    }));
    
    // Update steps
    this.setStepState(1, 'completed');
    this.setStepState(2, 'active');
    
    alert('Registration successful! You can now complete the tasks.');
  }

  setupTaskVerification() {
    // Check existing verifications
    if (localStorage.getItem('dexScreenerVisited')) {
      this.markTaskVerified('dexscreener');
    }

    // Setup click handlers
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

  // =====================
  // COPY REFERRAL FUNCTION
  // =====================
  setupEventListeners() {
    const referralButton = document.querySelector('.task-link button');
    if (referralButton) {
      referralButton.addEventListener('click', (e) => {
        e.preventDefault();
        this.copyReferralLink();
      });
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

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new MetaFrogApp();
  
  // Global functions for HTML onclick handlers
  window.showHome = () => app.showSection('home');
  window.showGames = () => app.showSection('games');
  window.showAirdrop = () => app.showSection('airdrop');
  window.showStaking = () => app.showSection('staking');
  window.showAbout = () => app.showSection('about');
  window.copyReferralLink = () => app.copyReferralLink();
});
