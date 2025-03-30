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

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', function() {
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
        airdropForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get form values
            const wallet = document.getElementById('wallet').value.trim();
            const xUsername = document.getElementById('xUsername').value.trim();
            const telegram = document.getElementById('telegram').value.trim();
            const tiktok = document.getElementById('tiktok').value.trim();
            
            // Validate wallet address (simple Solana address check)
            if (!wallet || wallet.length < 32 || wallet.length > 44) {
                alert('Please enter a valid Solana wallet address');
                return;
            }
            
            // Validate required fields
            if (!xUsername || !telegram) {
                alert('Please fill in all required fields');
                return;
            }
            
            // Create participant data object
            const participantData = {
                wallet: wallet,
                xUsername: xUsername,
                telegram: telegram,
                tiktok: tiktok || 'Not provided',
                timestamp: new Date().toISOString(),
                ip: '', // Will be set on server side if needed
                status: 'registered',
                step: 2
            };
            
            // Save to Firestore
            db.collection("airdrop_participants").add(participantData)
                .then((docRef) => {
                    console.log("Document written with ID: ", docRef.id);
                    
                    // Update UI to show step 2 as active
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
        });
    }
    
    // Check if user already submitted form
    if (localStorage.getItem('mfrogAirdropSubmitted') === 'true') {
        document.getElementById('step1').classList.remove('active-step');
        document.getElementById('step1').classList.add('completed-step');
        document.getElementById('status1').textContent = 'COMPLETED';
        
        document.getElementById('step2').classList.remove('pending-step');
        document.getElementById('step2').classList.add('active-step');
        document.getElementById('status2').textContent = 'ACTIVE';
    }
    
    // Copy referral link function
    window.copyReferralLink = function() {
        const referralLink = window.location.href + '?ref=' + (localStorage.getItem('mfrogReferralId') || generateReferralId());
        navigator.clipboard.writeText(referralLink)
            .then(() => alert('Referral link copied to clipboard!'))
            .catch(err => console.error('Could not copy text: ', err));
    };
    
    function generateReferralId() {
        const id = 'mfrog-' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('mfrogReferralId', id);
        return id;
    }
    
    // Check for referral in URL
    const urlParams = new URLSearchParams(window.location.search);
    const refParam = urlParams.get('ref');
    if (refParam) {
        localStorage.setItem('mfrogReferral', refParam);
    }
});
