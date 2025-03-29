/**
 * MetaFrog - Main JavaScript File
 * Improved version with better architecture and error handling
 */

// Main application controller
const MetaFrogApp = {
    // Initialize the application
    init() {
      this.checkLocalStorage();
      this.setupEventListeners();
      this.handleInitialRoute();
      this.checkVerificationStatus();
      this.checkAirdropProgress();
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
  
    // Handle initial route when page loads or on popstate
    handleInitialRoute() {
      const path = window.location.pathname.replace(/\/$/, '');
      const section = path === '' ? 'home' : path.substring(1);
      const validSections = ['home', 'games', 'airdrop', 'staking', 'about'];
      
      if (validSections.includes(section)) {
        this.showSection(section);
      } else {
        this.showSection('home');
      }
    },
  
    // Show specific section and update navigation
    showSection(section) {
      // Hide all sections
      document.querySelectorAll('.section').forEach(el => {
        el.classList.remove('active');
      });
  
      // Show requested section
      const sectionEl = document.getElementById(section);
      if (sectionEl) {
        sectionEl.classList.add('active');
        window.scrollTo(0, 0);
      }
  
      // Update navigation style
      this.updateNavStyle(section);
  
      // Special handling for airdrop section
      if (section === 'airdrop') {
        this.checkAirdropProgress();
      }
    },
  
    // Update navigation active state
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
    },
  
    // Get section name from href
    getSectionFromHref(href) {
      return href === '/' ? 'home' : href.replace(/^\//, '');
    },
  
    // Copy referral link to clipboard
    async copyReferralLink() {
      const referralLink = "https://metafrog.xyz/airdrop?ref=user123";
      const copyBtn = document.querySelector('.copy-referral-btn');
      
      if (!copyBtn) return;
  
      try {
        await navigator.clipboard.writeText(referralLink);
        const originalHTML = copyBtn.innerHTML;
        copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
        
        setTimeout(() => {
          copyBtn.innerHTML = originalHTML;
        }, 2000);
      } catch (err) {
        console.error("Failed to copy:", err);
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = referralLink;
        document.body.appendChild(textArea);
        textArea.select();
        
        try {
          document.execCommand('copy');
          copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
          setTimeout(() => {
            copyBtn.innerHTML = originalHTML;
          }, 2000);
        } catch (copyErr) {
          console.error("Fallback copy failed:", copyErr);
        } finally {
          document.body.removeChild(textArea);
        }
      }
    },
  
    // Handle airdrop form submission
    handleAirdropForm(e) {
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
  
      // Advance to step 2 (Complete Tasks)
      this.advanceToStep(2);
  
      // Save form data
      if (this.storageAvailable) {
        localStorage.setItem('airdropFormSubmitted', 'true');
        localStorage.setItem('airdropFormData', JSON.stringify({
          wallet,
          xUsername,
          telegram,
          tiktok
        }));
      }
  
      // Show success message
      alert('Registration successful! You can now complete the tasks.');
    },
  
    // Advance to specific airdrop step
    advanceToStep(stepNumber) {
      const steps = document.querySelectorAll('.step-card');
      if (!steps.length) return;
  
      // Update all steps
      steps.forEach((card, index) => {
        const step = index + 1;
        const statusElement = card.querySelector('.step-status');
        
        if (step < stepNumber) {
          // Completed steps
          card.classList.remove('current-step', 'pending-step');
          card.classList.add('completed-step');
          if (statusElement) {
            statusElement.textContent = "COMPLETED";
            statusElement.style.color = "#4CAF50";
          }
        } else if (step === stepNumber) {
          // Current step
          card.classList.remove('completed-step', 'pending-step');
          card.classList.add('current-step');
          if (statusElement) {
            statusElement.textContent = "ACTIVE";
            statusElement.style.color = "#8a2be2";
          }
        } else {
          // Pending steps
          card.classList.remove('current-step', 'completed-step');
          card.classList.add('pending-step');
          if (statusElement) {
            statusElement.textContent = "PENDING";
            statusElement.style.color = "#777";
          }
        }
      });
  
      // Update connectors
      this.updateStepConnectors(stepNumber);
  
      // Save current step
      if (this.storageAvailable) {
        localStorage.setItem('currentAirdropStep', stepNumber);
      }
    },
  
    // Update visual connectors between steps
    updateStepConnectors(currentStep) {
      const arrows = document.querySelectorAll('.arrow');
      arrows.forEach((arrow, index) => {
        if (index < currentStep - 1) {
          // Completed connections
          arrow.style.background = 'linear-gradient(135deg, #8a2be2, #4b0082)';
        } else {
          // Pending connections
          arrow.style.background = '#333';
        }
      });
    },
  
    // Verify DexScreener task
    verifyDexScreener(event) {
      const url = event.currentTarget.href;
      window.open(url, '_blank');
  
      if (this.storageAvailable) {
        localStorage.setItem('dexScreenerVisited', 'true');
      }
  
      const taskContent = event.currentTarget.closest('.task-content');
      const statusElement = taskContent?.querySelector('.verification-status');
      
      if (statusElement) {
        statusElement.style.display = 'inline';
        statusElement.textContent = "✓ Verification pending (refresh after visit)";
        statusElement.style.color = "#FFC107";
        
        setTimeout(() => {
          statusElement.textContent = "✓ Verified!";
          statusElement.style.color = "#4CAF50";
        }, 3000);
      }
    },
  
    // Check verification status from localStorage
    checkVerificationStatus() {
      if (this.storageAvailable && localStorage.getItem('dexScreenerVisited')) {
        document.querySelectorAll('.verification-status').forEach(el => {
          el.style.display = 'inline';
          el.textContent = "✓ Verified";
          el.style.color = "#4CAF50";
        });
      }
    },
  
    // Check airdrop progress from localStorage
    checkAirdropProgress() {
      if (this.storageAvailable) {
        // Check form submission
        if (localStorage.getItem('airdropFormSubmitted')) {
          this.advanceToStep(2);
        }
        
        // Check current step
        const savedStep = localStorage.getItem('currentAirdropStep');
        if (savedStep) {
          this.advanceToStep(parseInt(savedStep));
        }
      }
    },
  
    // Animate counter (example)
    animateCounter(elementId, target) {
      const element = document.getElementById(elementId);
      if (!element) return;
  
      let current = 0;
      const increment = target / 100;
      const duration = 2000; // 2 seconds
      const steps = 50;
      const stepTime = duration / steps;
  
      const timer = setInterval(() => {
        current += increment;
        element.textContent = Math.floor(current).toLocaleString();
  
        if (current >= target) {
          element.textContent = target.toLocaleString();
          clearInterval(timer);
        }
      }, stepTime);
    }
  };
  
  // Initialize the app when DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    MetaFrogApp.init();
    
    // Example counters - you can remove or modify these
    MetaFrogApp.animateCounter('participants-counter', 12500);
    MetaFrogApp.animateCounter('tokens-counter', 2500000);
  });
  
  // Handle errors globally
  window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    // You could add error tracking here
  });
