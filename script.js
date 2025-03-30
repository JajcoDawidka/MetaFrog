// Import Firebase (wersja modularna)
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getDatabase, ref, push, onValue, update } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

// Konfiguracja Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAR6Ha8baMX5EPsPVayTno0e0QBRqZrmco",
  authDomain: "metafrog-airdrop.firebaseapp.com",
  databaseURL: "https://metafrog-airdrop-default-rtdb.firebaseio.com",
  projectId: "metafrog-airdrop",
  storageBucket: "metafrog-airdrop.firebasestorage.app",
  messagingSenderId: "546707737127",
  appId: "1:546707737127:web:67956ae63ffef3ebeddc02",
  measurementId: "G-2Z78VYL739"
};

// Inicjalizacja Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);

// Logowanie anonimowe
signInAnonymously(auth).catch(error => {
  console.error("Błąd logowania:", error);
});

class MetaFrogApp {
  constructor() {
    this.validSections = ['home', 'games', 'airdrop', 'staking', 'about'];
    this.init();
  }

  init() {
    this.setupNavigation();
    this.handleInitialSection();
    this.setupEventListeners();
  }

  // ======================
  // NAVIGATION MANAGEMENT
  // ======================
  setupNavigation() {
    document.querySelectorAll('nav a').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const href = link.getAttribute('href');
        const section = href === '/' ? 'home' : href.replace(/^\//, '');
        this.navigateTo(section);
      });
    });
  }

  handleInitialSection() {
    const path = window.location.pathname;
    const section = path === '/' ? 'home' : path.replace(/^\//, '').split('/')[0];
    this.showSection(this.isValidPath(section) ? section : 'home');
  }

  navigateTo(section) {
    if (!this.isValidPath(section)) {
      window.history.replaceState({}, '', '/');
      this.showSection('home');
      return;
    }
    
    this.showSection(section);
    window.history.pushState({}, '', `/${section === 'home' ? '' : section}`);
  }

  showSection(section) {
    // Ukryj wszystkie sekcje
    document.querySelectorAll('.section').forEach(sec => {
      sec.classList.remove('active');
    });

    // Pokaż wybraną sekcję
    const sectionEl = document.getElementById(section);
    if (sectionEl) {
      sectionEl.classList.add('active');
      window.scrollTo(0, 0);
    }

    // Aktualizuj styl nawigacji
    this.updateNavStyle(section);
    
    // Inicjalizacja airdrop jeśli jest na stronie
    if (section === 'airdrop') {
      this.initAirdrop();
    }
  }

  updateNavStyle(activeSection) {
    document.querySelectorAll('nav a').forEach(link => {
      const href = link.getAttribute('href');
      const linkSection = href === '/' ? 'home' : href.replace(/^\//, '');
      
      if (linkSection === activeSection) {
        link.style.backgroundColor = '#8a2be2';
        link.style.color = '#111';
      } else {
        link.style.backgroundColor = '';
        link.style.color = '';
      }
    });
  }

  isValidPath(path) {
    return this.validSections.includes(path);
  }

  setupEventListeners() {
    window.addEventListener('popstate', () => {
      this.handleInitialSection();
    });
  }

  // ======================
  // AIRDROP IMPLEMENTATION
  // ======================
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

    const status = step.querySelector('.step-status');
    if (!status) return;

    step.classList.remove('completed-step', 'active-step', 'pending-step');
    status.textContent = state.toUpperCase();

    switch(state) {
      case 'active':
        step.classList.add('active-step');
        status.style.color = '#8a2be2';
        break;
      case 'completed':
        step.classList.add('completed-step');
        status.style.color = '#4CAF50';
        break;
      case 'pending':
        step.classList.add('pending-step');
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

    try {
      await push(ref(database, 'airdrops'), {
        wallet,
        xUsername,
        telegram,
        tiktok: tiktok || "",
        date: new Date().toISOString(),
        verified: false
      });

      localStorage.setItem('airdropFormSubmitted', 'true');
      this.setStepState(1, 'completed');
      this.setStepState(2, 'active');
      alert('Registration successful!');
    } catch (error) {
      console.error("Error saving data:", error);
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
  
  // Global functions
  window.copyReferralLink = () => window.app.copyReferralLink();
});

// Admin Panel
if (window.location.pathname.includes('admin.html')) {
  onValue(ref(database, 'airdrops'), (snapshot) => {
    const data = snapshot.val();
    let html = "";
    
    if (data) {
      for (let key in data) {
        const entry = data[key];
        html += `
          <tr>
            <td>${entry.wallet}</td>
            <td>${entry.xUsername}</td>
            <td>${entry.telegram}</td>
            <td>${entry.tiktok || "-"}</td>
            <td>${new Date(entry.date).toLocaleString()}</td>
            <td>
              <button onclick="verifyEntry('${key}')">
                ${entry.verified ? '✓' : 'Verify'}
              </button>
            </td>
          </tr>
        `;
      }
    } else {
      html = "<tr><td colspan='6'>No data</td></tr>";
    }
    
    document.getElementById("airdropList").innerHTML = html;
  });

  window.verifyEntry = (key) => {
    if (confirm("Verify this entry?")) {
      update(ref(database, `airdrops/${key}`), { verified: true })
        .then(() => alert("Verified!"))
        .catch(error => alert("Error: " + error.message));
    }
  };
}
