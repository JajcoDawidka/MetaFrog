// Funkcja zmieniająca aktywną sekcję na podstawie id
function showHome() {
    setActiveSection('home');
}

function showGames() {
    setActiveSection('games');
}

function showStaking() {
    setActiveSection('staking');
}

function showAbout() {
    setActiveSection('about');
}

// Funkcja ustawia aktywną sekcję (dodaje klasę 'active' do odpowiedniej sekcji)
function setActiveSection(sectionId) {
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => {
        section.classList.remove('active');
    });

    const activeSection = document.getElementById(sectionId);
    activeSection.classList.add('active');
}

// Wykres Tokenomics z użyciem Chart.js
window.onload = function () {
    var ctx = document.getElementById('tokenomicsChart').getContext('2d');
    var tokenomicsChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Liquidity Pool', 'Future Airdrops', 'Marketing & CEX', 'Dev Team', 'Reserve'],
            datasets: [{
                label: 'Tokenomics Distribution',
                data: [68.3, 10, 10, 7, 4.7], // Procenty
                backgroundColor: ['#8a2be2', '#f39c12', '#e74c3c', '#2ecc71', '#3498db'],
                borderColor: '#111',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    callbacks: {
                        label: function (tooltipItem) {
                            return tooltipItem.label + ': ' + tooltipItem.raw + '%';
                        }
                    }
                }
            }
        }
    });
};

// Przykładowe dane do wyświetlenia w tokenomics
const tokenomicsData = [
    { label: "Total Supply", value: "1,000,000,000 $MFROG" },
    { label: "Liquidity Pool", value: "68.3%" },
    { label: "Future Airdrops", value: "10%" },
    { label: "Marketing & CEX", value: "10%" },
    { label: "Dev Team", value: "7%" },
    { label: "Reserve", value: "4.7%" }
];

// Wypełnianie danych tokenomics na stronie
function populateTokenomicsData() {
    const tokenomicsContainer = document.querySelector('.tokenomics-grid');
    tokenomicsContainer.innerHTML = ''; // Usuwanie istniejących elementów

    tokenomicsData.forEach(data => {
        const tokenBox = document.createElement('div');
        tokenBox.classList.add('token-box');

        const tokenTitle = document.createElement('h2');
        tokenTitle.textContent = data.label;
        const tokenValue = document.createElement('p');
        tokenValue.textContent = data.value;

        tokenBox.appendChild(tokenTitle);
        tokenBox.appendChild(tokenValue);
        tokenomicsContainer.appendChild(tokenBox);
    });
}

// Wywołanie funkcji po załadowaniu strony
populateTokenomicsData();
