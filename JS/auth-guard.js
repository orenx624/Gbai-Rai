// Vérification automatique de la session admin au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('admin_token');
    const session = localStorage.getItem('admin_session');

    // Si le jeton ou la session est absent, on redirige vers la page de connexion
    if (!token && session !== 'active') {
        window.location.href = 'admin.html'; // ou votre page de login
    }
});