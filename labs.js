/**
 * BTÜ Geçerken Lab - Genel Orkestratör (labs.js)
 */
document.addEventListener('DOMContentLoaded', () => {
  // Yalnızca navbar varsa başlatır, sekme engellemesi yapmaz
  if (window.LabsNavbar && typeof window.LabsNavbar.init === 'function') {
    window.LabsNavbar.init();
  }
});