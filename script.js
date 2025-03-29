/**
 * MetaFrog - Complete Airdrop Script
 * Manages the 3-step airdrop process exactly as specified:
 * 
 * Initial state:
 * - Step 1: ACTIVE (purple, animated)
 * - Step 2: PENDING (gray)
 * - Step 3: PENDING (gray)
 * 
 * After form submission:
 * - Step 1: COMPLETED (green)
 * - Step 2: ACTIVE (purple, animated)
 * - Step 3: PENDING (gray)
 */

// Main application controller
const MetaFrogApp = {
  // Initialize the application
  init() {
    this.setupNavigation();
    this.initializeAirdrop();
    this.setupCopyReferral();
  },

  // Setup navigation between sections
  setupNavigation() {
    document.addEventListener('click', (e) => {
      const navLink = e.target.closest('nav a');
      if (navLink) {
        e.preventDefault();
        const section = navLink.getAttribute('href').replace('/', '') || 'home';
        this.showSection(section);
      }
    });

    // Handle initial page load
    const path = window.location.pathname.replace('/', '') || 'home';
    this.showSection(path);
  },

  // Show specific section
  showSection(section) {
    document.querySelectorAll('.section').forEach(el => el.classList.remove('active'));
    const activeSection = document.getElementById(section);
    if (activeSection) {
      activeSection.classList.add('active');
      window.scrollTo(0, 0);
      
      // Special handling for airdrop section
      if (section === 'airdrop') {
        this.initializeAirdrop();
      }
    }
  },

  // Initialize airdrop progress
  initializeAirdrop() {
    // Reset all steps
    this.resetAirdropSteps();

    // Set initial state
    this.setStepState(1, 'active');
    this.setStepState(2, 'pending');
    this.setStepState(3, 'pending');

    // Check if form was already submitted
    if (localStorage.getItem('airdropFormSubmitted')) {
      this.advanceToStep(2);
    }

    // Setup form submission
    this.setupAirdropForm();
  },

  // Setup airdrop form submission
  setupAirdropForm() {
    const form = document.querySelector('#airdrop .airdrop-form');
    if (!form) return;

    form.addEventListener('submit', (e) => {
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
      
      // Advance to step 2
      this.advanceToStep(2);
      
      alert('Registration successful! You can now complete the tasks.');
    });
  },

  // Advance to specific step
  advanceToStep(stepNumber) {
    switch(stepNumber) {
      case 1:
        this.setStepState(1, 'active');
        this.setStepState(2, 'pending');
        this.setStepState(3, 'pending');
        break;
      case 2:
        this.setStepState(1, 'completed');
        this.setStepState(2, 'active');
        this.setStepState(3, 'pending');
        break;
      case 3:
        this.setStepState(1, 'completed');
        this.setStepState(2, 'completed');
        this.setStepState(3, 'active');
        break;
    }
  },

  // Set visual state of a step
  setStepState(stepNumber, state) {
    const step = document.getElementById(`step-${stepNumber}`);
    if (!step) return;

    // Reset classes
    step.classList.remove('current-step', 'completed-step', 'pending-step');

    // Get status element
    const status = step.querySelector('.step-status');
    if (!status) return;

    // Apply new state
    switch(state) {
      case 'active':
        step.classList.add('current-step');
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
  },

  // Reset all airdrop steps
  resetAirdropSteps() {
    document.querySelectorAll('.step-card').forEach(step => {
      step.classList.remove('current-step', 'completed-step', 'pending-step');
      const status = step.querySelector('.step-status');
      if (status) {
        status.textContent = 'PENDING';
        status.style.color = '#777';
      }
    });
  },

  // Setup copy referral button
  setupCopyReferral() {
    const button = document.querySelector('.copy-referral-btn');
    if (!button) return;

    button.addEventListener('click', async () => {
      const referralLink = "https://metafrog.xyz/airdrop?ref=user123";
      
      try {
        await navigator.clipboard.writeText(referralLink);
        const originalHTML = button.innerHTML;
        button.innerHTML = '<i class="fas fa-check"></i> Copied!';
        
        setTimeout(() => {
          button.innerHTML = originalHTML;
        }, 2000);
      } catch (err) {
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
      }
    });
  }
};

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  MetaFrogApp.init();
});
