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

// Initialize Firebase apps
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const rtdb = firebase.database();

document.addEventListener('DOMContentLoaded', function() {
    initializeSteps();
    setupNavigation();
    setupAirdropForm();
    checkForReferral();
});

function initializeSteps() {
    const userKey = generateUserKey();
    const hasSubmitted = localStorage.getItem('mfrogAirdropSubmitted') === 'true';
    
    if (hasSubmitted) {
        updateStepsUI(1, 'completed', 2, 'active', 3, 'pending');
        
        // Check Firestore for additional status updates
        checkUserStatus(userKey);
    } else {
        updateStepsUI(1, 'active', 2, 'pending', 3, 'pending');
    }
}

function setupNavigation() {
    const sections = document.querySelectorAll('.section');
    const navLinks = document.querySelectorAll('nav a');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            
            sections.forEach(section => section.classList.remove('active'));
            document.getElementById(targetId).classList.add('active');
            
            navLinks.forEach(navLink => navLink.classList.remove('active'));
            this.classList.add('active');
        });
    });
}

function setupAirdropForm() {
    const airdropForm = document.getElementById('airdropForm');
    if (airdropForm) {
        airdropForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = getFormData();
            if (!validateFormData(formData)) return;

            try {
                const userKey = generateUserKey();
                await saveUserData(userKey, formData);
                
                updateStepsUI(1, 'completed', 2, 'active', 3, 'pending');
                localStorage.setItem('mfrogAirdropSubmitted', 'true');
                alert('Registration successful! Complete tasks to qualify.');
            } catch (error) {
                console.error("Error:", error);
                alert('Submission error. Please try again.');
            }
        });
    }
}

function getFormData() {
    return {
        wallet: document.getElementById('wallet').value.trim(),
        xUsername: document.getElementById('xUsername').value.trim(),
        telegram: document.getElementById('telegram').value.trim(),
        tiktok: document.getElementById('tiktok').value.trim() || 'Not provided',
        timestamp: new Date().toISOString(),
        status: 'registered',
        referral: localStorage.getItem('mfrogReferral') || null,
        ip: '' // Will be set by cloud function
    };
}

function validateFormData(data) {
    if (!data.wallet || data.wallet.length < 32 || data.wallet.length > 44) {
        alert('Please enter a valid Solana wallet address (32-44 characters)');
        return false;
    }
    
    if (!data.xUsername || !data.telegram) {
        alert('Please fill in all required fields');
        return false;
    }
    
    if (!data.xUsername.startsWith('@') || !data.telegram.startsWith('@') || 
        (data.tiktok !== 'Not provided' && !data.tiktok.startsWith('@'))) {
        alert('Please include @ in your usernames');
        return false;
    }
    
    return true;
}

async function saveUserData(userKey, data) {
    // Save to both Firestore and Realtime Database for redundancy
    const firestorePromise = db.collection("airdrop_participants").doc(userKey).set(data);
    const rtdbPromise = rtdb.ref(`airdrop_participants/${userKey}`).set(data);
    
    await Promise.all([firestorePromise, rtdbPromise]);
}

function updateStepsUI(step1Num, step1Status, step2Num, step2Status, step3Num, step3Status) {
    const steps = [
        { num: step1Num, status: step1Status },
        { num: step2Num, status: step2Status },
        { num: step3Num, status: step3Status }
    ];
    
    steps.forEach(step => {
        const element = document.getElementById(`step${step.num}`);
        const statusElement = document.getElementById(`status${step.num}`);
        
        // Remove all status classes
        element.classList.remove('active-step', 'completed-step', 'pending-step');
        
        // Add the correct class
        element.classList.add(`${step.status}-step`);
        statusElement.textContent = step.status.toUpperCase();
    });
}

function generateUserKey() {
    // Generate a unique key based on wallet address or random string
    const wallet = document.getElementById('wallet')?.value.trim();
    return wallet || 'user-' + Math.random().toString(36).substr(2, 9);
}

async function checkUserStatus(userKey) {
    try {
        const doc = await db.collection("airdrop_participants").doc(userKey).get();
        if (doc.exists) {
            const data = doc.data();
            if (data.status === 'completed' || data.status === 'verified') {
                updateStepsUI(1, 'completed', 2, 'completed', 3, 'active');
            }
        }
    } catch (error) {
        console.error("Error checking user status:", error);
    }
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
        .then(() => alert('Referral link copied! Share it with friends!'))
        .catch(err => alert('Could not copy link. Please try again.'));
}

function generateReferralId() {
    const id = 'mfrog-' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('mfrogReferralId', id);
    return id;
}
