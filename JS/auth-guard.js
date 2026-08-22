// Vérification automatique de la session admin au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('gbai_admin_session_token');
    
    // Si le jeton est absent, on redirige uniquement si on n'est pas déjà sur admin.html
    if (!token && !window.location.pathname.includes('admin.html')) {
        console.warn('Session admin introuvable, redirection...');
        window.location.href = 'admin.html';
    }
});