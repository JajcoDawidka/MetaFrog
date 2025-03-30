// ======================
// 🔥 FIREBASE INITIALIZATION
// ======================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyAR6Ha8baMX5EPsPVayTno0e0QBRqZrmco",
  authDomain: "metafrog-airdrop.firebaseapp.com",
  databaseURL: "https://metafrog-airdrop-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "metafrog-airdrop",
  storageBucket: "metafrog-airdrop.firebasestorage.app",
  messagingSenderId: "546707737127",
  appId: "1:546707737127:web:67956ae63ffef3ebeddc02",
  measurementId: "G-2Z78VYL739"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// ======================
// 🏠 SECTION NAVIGATION
// ======================
document.addEventListener('DOMContentLoaded', function() {
    // Initialize default active tab
    setActiveTab('home');
    showSection('home');

    // Setup navigation click handlers
    document.querySelectorAll('nav ul li a').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const sectionId = this.getAttribute('href').replace('/', '');
            setActiveTab(sectionId);
            showSection(sectionId);
        });
    });

    // Initialize airdrop functionality
    initAirdrop();
});

function setActiveTab(sectionId) {
    document.querySelectorAll('nav ul li a').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href').includes(sectionId)) {
            link.classList.add('active');
        }
    });
}

function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });

    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// ======================
// 🎁 AIRDROP FUNCTIONALITY
// ======================
function initAirdrop() {
    const airdropSection = document.getElementById('airdrop');
    if (!airdropSection) return;

    // Check if form was previously submitted
    const formSubmitted = localStorage.getItem('airdropFormSubmitted');
    const savedFormData = localStorage.getItem('airdropFormData');

    // Initialize steps
    updateAirdropSteps(formSubmitted ? 2 : 1);

    // Setup form submission
    const airdropForm = airdropSection.querySelector('form');
    if (airdropForm) {
        if (savedFormData) {
            fillFormWithSavedData(JSON.parse(savedFormData));
        }

        airdropForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = {
                wallet: this.wallet.value.trim(),
                xUsername: this.xUsername.value.trim(),
                telegram: this.telegram.value.trim(),
                tiktok: this.tiktok.value.trim(),
                timestamp: new Date().toISOString(),
                ip: await fetch('https://api.ipify.org?format=json').then(res => res.json()).then(data => data.ip)
            };

            if (!validateAirdropForm(formData)) return;

            try {
                await saveToFirebase(formData);
                localStorage.setItem('airdropFormSubmitted', 'true');
                localStorage.setItem('airdropFormData', JSON.stringify(formData));
                updateAirdropSteps(2);
                alert('Form submitted successfully! Complete the tasks in Step 2.');
            } catch (error) {
                console.error('Submission error:', error);
                alert('Error submitting form. Please try again.');
            }
        });
    }

    // Setup task links
    setupTaskLinks();
}

function updateAirdropSteps(activeStep) {
    const steps = document.querySelectorAll('.step-card');
    steps.forEach((step, index) => {
        step.className = 'step-card';
        const statusElement = step.querySelector('.step-status');
        
        if (index + 1 < activeStep) {
            step.classList.add('completed-step');
            if (statusElement) statusElement.textContent = 'COMPLETED';
        } else if (index + 1 === activeStep) {
            step.classList.add('active-step');
            if (statusElement) statusElement.textContent = 'ACTIVE';
        } else {
            step.classList.add('pending-step');
            if (statusElement) statusElement.textContent = 'PENDING';
        }
    });
}

function fillFormWithSavedData(formData) {
    const form = document.querySelector('.airdrop-form');
    if (!form) return;

    form.wallet.value = formData.wallet || '';
    form.xUsername.value = formData.xUsername || '';
    form.telegram.value = formData.telegram || '';
    form.tiktok.value = formData.tiktok || '';

    // Disable fields after submission
    if (localStorage.getItem('airdropFormSubmitted')) {
        form.querySelectorAll('input').forEach(input => {
            input.readOnly = true;
        });
    }
}

function validateAirdropForm(formData) {
    if (!formData.wallet || !formData.xUsername || !formData.telegram) {
        alert('Please fill all required fields!');
        return false;
    }

    if (!isValidSolanaAddress(formData.wallet)) {
        alert('Please enter a valid Solana wallet address!');
        return false;
    }

    return true;
}

async function saveToFirebase(formData) {
    const userId = formData.wallet.replace(/[^a-zA-Z0-9]/g, '_');
    const userRef = ref(database, `airdrop_submissions/${userId}`);
    await set(userRef, formData);
}

function setupTaskLinks() {
    document.querySelectorAll('.task-link').forEach(link => {
        if (link.classList.contains('dexscreener-link')) {
            link.addEventListener('click', function() {
                setTimeout(() => {
                    this.querySelector('.verification-status').classList.add('task-verified');
                }, 2000);
            });
        }
    });
}

function isValidSolanaAddress(address) {
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
}

// ======================
// 📋 UTILITY FUNCTIONS
// ======================
function copyReferralLink() {
    const wallet = localStorage.getItem('airdropFormData') 
        ? JSON.parse(localStorage.getItem('airdropFormData')).wallet 
        : 'join';
    const referralLink = `${window.location.origin}?ref=${wallet}`;

    navigator.clipboard.writeText(referralLink)
        .then(() => alert(`Referral link copied: ${referralLink}`))
        .catch(() => prompt('Copy this link manually:', referralLink));
}

// Make copyReferralLink available globally
window.copyReferralLink = copyReferralLink;
