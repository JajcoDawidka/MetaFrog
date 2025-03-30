// Minimalna wersja kompatybilna z Vercel
document.addEventListener('DOMContentLoaded', () => {
  // Inicjalizacja nawigacji
  document.querySelectorAll('nav a').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const sectionId = e.target.getAttribute('href').substring(1);
      document.querySelectorAll('.section').forEach(s => s.style.display = 'none');
      document.getElementById(sectionId).style.display = 'block';
    });
  });

  // Obsługa formularza
  const form = document.querySelector('.airdrop-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = e.target.querySelector('button[type="submit"]');
      btn.disabled = true;
      
      try {
        // Tutaj dodaj kod zapisu do Firebase (bez zmian)
        console.log('Form submitted');
        
        // Tymczasowa symulacja sukcesu:
        document.querySelectorAll('.step-card')[0].classList.add('completed');
        document.querySelectorAll('.step-card')[1].classList.add('active');
        alert('Registration successful!'); // Tymczasowe zastępstwo
      } catch (error) {
        console.error(error);
        alert('Error: ' + error.message);
      } finally {
        btn.disabled = false;
      }
    });
  }
});
