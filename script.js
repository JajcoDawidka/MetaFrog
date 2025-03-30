document.addEventListener("DOMContentLoaded", function () {
    // Przypisanie elementów kroków
    const step1 = document.getElementById("step-1");
    const step2 = document.getElementById("step-2");
    const step3 = document.querySelector(".step-card .step-status");

    // Funkcja do ustawienia aktywnego, ukończonego lub oczekującego statusu etapów
    function updateSteps(step) {
        if (step === 1) {
            // Krok 1: Aktywny -> Zakończony
            step1.classList.remove('active-step');
            step1.classList.add('completed-step');
            step1.querySelector('.step-status').textContent = 'COMPLETED';

            // Krok 2: Zaczyna się aktywny
            step2.classList.remove('pending-step');
            step2.classList.add('active-step');
            step2.querySelector('.step-status').textContent = 'ACTIVE';
        } else if (step === 2) {
            // Krok 2: Aktywny -> Zakończony
            step2.classList.remove('active-step');
            step2.classList.add('completed-step');
            step2.querySelector('.step-status').textContent = 'COMPLETED';

            // Krok 3: Zaczyna się oczekujący
            step3.classList.remove('pending-step');
            step3.classList.add('active-step');
            step3.textContent = 'PENDING';
        }
    }

    // Funkcja do obsługi formularza
    const form = document.querySelector(".airdrop-form");
    form.addEventListener("submit", function (e) {
        e.preventDefault(); // Zatrzymaj domyślne działanie formularza (wysyłanie danych)

        // Pobranie danych z formularza
        const wallet = document.getElementById("wallet").value;
        const xUsername = document.getElementById("xUsername").value;
        const telegram = document.getElementById("telegram").value;
        const tiktok = document.getElementById("tiktok").value;

        // Sprawdzenie, czy wszystkie wymagane pola zostały wypełnione
        if (wallet && xUsername && telegram) {
            // Jeżeli dane są poprawne, zaktualizuj status
            updateSteps(1); // Przechodzimy do etapu 2

            // Zmieniamy status na "PENDING" na etapie 3
            setTimeout(function() {
                updateSteps(2); // Przechodzimy do etapu 3
            }, 2000); // Symulujemy 2 sekundy opóźnienia, które mogą być czasem oczekiwania na weryfikację

            // Wyświetlamy komunikat o sukcesie
            alert("Form submitted successfully! Airdrop registration is complete.");
        } else {
            // Jeżeli jakieś pole jest puste, wyświetlamy komunikat
            alert("Please fill out all required fields.");
        }
    });

    // Obsługa przycisku kopiowania linku referencyjnego
    const copyReferralLinkButton = document.querySelector('.task-link');
    copyReferralLinkButton.addEventListener('click', function (e) {
        e.preventDefault();

        const referralLink = "https://example.com/referral-link"; // Twój link referencyjny
        navigator.clipboard.writeText(referralLink)
            .then(() => {
                alert("Referral link copied to clipboard!");
            })
            .catch(err => {
                console.error('Error copying link: ', err);
            });
    });

    // Funkcja do wykonywania zadań airdrop (np. kliknięcie w linki)
    const taskLinks = document.querySelectorAll('.task-link');
    taskLinks.forEach(link => {
        link.addEventListener('click', function () {
            const taskStatus = this.closest('.task-card');
            taskStatus.classList.remove('required-task');
            taskStatus.classList.add('completed-task');
            this.querySelector('.task-reward').textContent = 'Reward: Completed!';
            alert("Task completed successfully!");
        });
    });
});

// Funkcja do zaktualizowania statusu zadania DexScreener
function updateDexScreenerStatus() {
    const dexscreenerLink = document.querySelector('.dexscreener-link');
    const statusElement = dexscreenerLink.querySelector('.dexscreener-verification');

    // Po kliknięciu w link DexScreener zaktualizujemy status na "Completed"
    dexscreenerLink.addEventListener('click', function () {
        setTimeout(function () {
            statusElement.textContent = 'Task Completed';
        }, 2000); // Symulacja weryfikacji przez 2 sekundy
    });
}

updateDexScreenerStatus();
