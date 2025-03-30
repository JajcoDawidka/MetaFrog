// Firebase configuration - REPLACE WITH YOUR OWN!
const firebaseConfig = {
    apiKey: "AIzaSyABCDEFGHIJKLMNOPQRSTUVWXYZ12345678",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "1234567890",
    appId: "1:1234567890:web:abcdef1234567890"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Navigation handling
function setupNavigation() {
    document.querySelectorAll('nav a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const target = e.target.getAttribute('href');
            document.querySelectorAll('.section').forEach(section => {
                section.classList.remove('active');
            });
            document.querySelector(target).classList.add('active');
            
            // Special case for airdrop section
            if (target === '#airdrop') {
                updateParticipantCount();
            }
        });
    });
}

// Airdrop form handling
function setupAirdropForm() {
    const form = document.querySelector('.airdrop-form');
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const wallet = document.getElementById('wallet').value.trim();
        const xUsername = document.getElementById('xUsername').value.trim();
        const telegram = document.getElementById('telegram').value.trim();

        // Basic validation
        if (!wallet || wallet.length < 32 || !wallet.startsWith('E')) {
            alert('Please enter a valid SOL wallet address');
            return;
        }

        if (!xUsername.startsWith('@')) {
            alert('Twitter username must start with @');
            return;
        }

        try {
            // Check for existing registration
            const snapshot = await db.collection('participants')
                .where('wallet', '==', wallet)
                .get();
            
            if (!snapshot.empty) {
                alert('⚠️ This wallet is already registered!');
                return;
            }

            // Add to Firestore
            await db.collection('participants').add({
                wallet,
                xUsername,
                telegram,
                ip: await getClientIP(),
                registeredAt: firebase.firestore.FieldValue.serverTimestamp(),
                status: 'pending'
            });

            // Success
            alert('🎉 Success! You are now registered for the airdrop.');
            form.reset();
            updateParticipantCount();
            
        } catch (error) {
            console.error("Registration error:", error);
            alert('❌ Error occurred. Please try again later.');
        }
    });
}

// Get client IP (for basic anti-spam)
async function getClientIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch {
        return 'unknown';
    }
}

// Update participant counter
async function updateParticipantCount() {
    try {
        const count = await db.collection('participants').count().get();
        const countElement = document.getElementById('participant-count');
        if (countElement) {
            countElement.textContent = 
                `${count.data().count.toLocaleString()} participants joined!`;
        }
    } catch (error) {
        console.error("Count update error:", error);
    }
}

// Initialize everything when DOM loads
document.addEventListener('DOMContentLoaded', () => {
    setupNavigation();
    setupAirdropForm();
    updateParticipantCount();
    
    // Update counter every 30 seconds
    setInterval(updateParticipantCount, 30000);
});
