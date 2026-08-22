// Vérification automatique de la session admin au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    // Utilisation de la bonne clé de stockage définie dans admin-console.js
    const token = localStorage.getItem('gbai_admin_session_token');

    // Si le jeton est absent, on redirige vers la page de connexion
    if (!token) {
        window.location.href = 'admin.html';
    }
});