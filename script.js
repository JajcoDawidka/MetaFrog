// Initialize Firebase
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

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

document.addEventListener('DOMContentLoaded', function() {
    // Initialize step statuses
    initializeSteps();
    
    // Navigation handling
    const sections = document.querySelectorAll('.section');
    const navLinks = document.querySelectorAll('nav a');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            
            // Hide all sections
            sections.forEach(section => {
                section.classList.remove('active');
            });
            
            // Show target section
            document.getElementById(targetId).classList.add('active');
            
            // Update active nav link
            navLinks.forEach(navLink => {
                navLink.classList.remove('active');
            });
            this.classList.add('active');
        });
    });

    // Airdrop form handling
    const airdropForm = document.getElementById('airdropForm');
    if (airdropForm) {
        airdropForm.addEventListener('submit', handleFormSubmit);
    }
    
    // Check for referral in URL
    checkForReferral();
});

function initializeSteps() {
    // Check if user already submitted form
    const hasSubmitted = localStorage.getItem('mfrogAirdropSubmitted') === 'true';
    
    if (hasSubmitted) {
        // User already submitted - show step 1 as completed, step 2 as active
        document.getElementById('step1').classList.remove('active-step');
        document.getElementById('step1').classList.add('completed-step');
        document.getElementById('status1').textContent = 'COMPLETED';
        
        document.getElementById('step2').classList.remove('pending-step');
        document.getElementById('step2').classList.add('active-step');
        document.getElementById('status2').textContent = 'ACTIVE';
        
        document.getElementById('step3').classList.remove('active-step');
        document.getElementById('step3').classList.add('pending-step');
        document.getElementById('status3').textContent = 'PENDING';
    } else {
        // New user - show step 1 as active, others as pending
        document.getElementById('step1').classList.remove('completed-step');
        document.getElementById('step1').classList.add('active-step');
        document.getElementById('status1').textContent = 'ACTIVE';
        
        document.getElementById('step2').classList.remove('active-step');
        document.getElementById('step2').classList.add('pending-step');
        document.getElementById('status2').textContent = 'PENDING';
        
        document.getElementById('step3').classList.remove('active-step');
        document.getElementById('step3').classList.add('pending-step');
        document.getElementById('status3').textContent = 'PENDING';
    }
}

function handleFormSubmit(e) {
    e.preventDefault();
    
    // Get form values
    const wallet = document.getElementById('wallet').value.trim();
    const xUsername = document.getElementById('xUsername').value.trim();
    const telegram = document.getElementById('telegram').value.trim();
    const tiktok = document.getElementById('tiktok').value.trim();
    
    // Validate wallet address (simple Solana address check)
    if (!wallet || wallet.length < 32 || wallet.length > 44) {
        alert('Please enter a valid Solana wallet address (32-44 characters)');
        return;
    }
    
    // Validate required fields
    if (!xUsername || !telegram) {
        alert('Please fill in all required fields');
        return;
    }
    
    // Validate usernames format
    if (!xUsername.startsWith('@') || !telegram.startsWith('@') || (tiktok && !tiktok.startsWith('@'))) {
        alert('Please include @ in your usernames');
        return;
    }
    
    // Create participant data object
    const participantData = {
        wallet: wallet,
        xUsername: xUsername,
        telegram: telegram,
        tiktok: tiktok || 'Not provided',
        timestamp: new Date().toISOString(),
        status: 'registered',
        step: 2,
        referral: localStorage.getItem('mfrogReferral') || null
    };
    
    // Save to Firestore
    db.collection("airdrop_participants").add(participantData)
        .then((docRef) => {
            console.log("Document written with ID: ", docRef.id);
            
            // Update UI to show step 1 as completed and step 2 as active
            document.getElementById('step1').classList.remove('active-step');
            document.getElementById('step1').classList.add('completed-step');
            document.getElementById('status1').textContent = 'COMPLETED';
            
            document.getElementById('step2').classList.remove('pending-step');
            document.getElementById('step2').classList.add('active-step');
            document.getElementById('status2').textContent = 'ACTIVE';
            
            // Store in local storage to remember submission
            localStorage.setItem('mfrogAirdropSubmitted', 'true');
            
            // Show success message
            alert('Registration successful! Please complete the tasks to qualify for the airdrop.');
        })
        .catch((error) => {
            console.error("Error adding document: ", error);
            alert('There was an error submitting your form. Please try again.');
        });
}

function checkForReferral() {
    const urlParams = new URLSearchParams(window.location.search);
    const refParam = urlParams.get('ref');
    if (refParam) {
        localStorage.setItem('mfrogReferral', refParam);
    }
}

function copyReferralLink() {
    const referralId = localStorage.getItem('mfrogReferralId') || generateReferralId();
    const referralLink = `${window.location.origin}${window.location.pathname}?ref=${referralId}`;
    
    navigator.clipboard.writeText(referralLink)
        .then(() => alert('Referral link copied to clipboard! Share it with friends to earn bonuses!'))
        .catch(err => {
            console.error('Could not copy text: ', err);
            alert('Could not copy referral link. Please try again.');
        });
}

function generateReferralId() {
    const id = 'mfrog-' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('mfrogReferralId', id);
    return id;
}
