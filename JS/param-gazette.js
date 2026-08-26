const ADMIN_GAZETTE_API = 'https://gbai-rai-backend-x.vercel.app/api/gazette';
let gazetteArticles = [];

async function loadGazetteAdmin() {
	const container = document.getElementById('param-gazette-list');
	if (!container) return;
	try {
		const response = await fetch(ADMIN_GAZETTE_API);
		const result = await response.json();
		gazetteArticles = Array.isArray(result) ? result : (result.articles || result.data || result.items || []);
		container.innerHTML = gazetteArticles.length ? '' : '<p class="item-subtext">Aucun article publié.</p>';
		gazetteArticles.forEach(article => {
			const row = document.createElement('div'); row.className = 'admin-item-row';
			row.innerHTML = '<div class="item-info"><span class="badge"></span><strong></strong><p class="item-subtext"></p></div><div class="item-actions"><button class="btn-icon btn-delete" type="button">🗑️</button></div>';
			row.querySelector('.badge').textContent = article.badge || article.category || 'Info';
			row.querySelector('strong').textContent = article.title || '';
			row.querySelector('.item-subtext').textContent = article.content || article.description || '';
			row.querySelector('.btn-delete').onclick = async () => { if (confirm('Supprimer cet article ?')) { await fetch(`${ADMIN_GAZETTE_API}/${article.id}`, { method: 'DELETE' }); loadGazetteAdmin(); } };
			container.appendChild(row);
		});
	} catch (error) { container.innerHTML = '<p class="item-subtext">Impossible de charger la Gazette.</p>'; }
}

document.addEventListener('DOMContentLoaded', () => {
	document.getElementById('param-gazette-form')?.addEventListener('submit', async event => {
		event.preventDefault();
		const payload = { title: document.getElementById('gazette-title').value.trim(), content: document.getElementById('gazette-desc').value.trim(), badge: document.getElementById('gazette-badge').value };
		const response = await fetch(ADMIN_GAZETTE_API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
		if (!response.ok) return alert('Impossible de publier cet article.');
		event.target.reset(); loadGazetteAdmin();
	});
	document.getElementById('btn-delete-all-gazette')?.addEventListener('click', async () => { if (confirm('Supprimer tous les articles ?')) { await fetch(ADMIN_GAZETTE_API, { method: 'DELETE' }); loadGazetteAdmin(); } });
	loadGazetteAdmin();
});
