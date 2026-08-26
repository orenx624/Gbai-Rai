async function renderGazette() {
    const container = document.querySelector('.gazette-list');
    if (!container) return;

    try {
        const data = await gbaiRequest('/gazette', {}, false);
        if (data.success) {
            container.innerHTML = data.articles.map(article => `
                <article class="gazette-card">
                    ${article.image ? `<img src="${article.image}" alt="${article.title}">` : ''}
                    <div class="gazette-content">
                        <h3>${article.title}</h3>
                        <p>${article.content}</p>
                        <small>Publié le ${new Date(article.createdAt).toLocaleDateString()}</small>
                    </div>
                </article>
            `).join('');
        }
    } catch (e) {
        console.error("Erreur gazette:", e);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    renderGazette();
    gbaiStartPolling(() => renderGazette(), 30000);
});