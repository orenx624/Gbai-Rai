const ADMIN_ANNONCES_API = 'https://gbai-rai-backend-x.vercel.app/api/annonces';
let adminAnnonces = [];

async function loadAdminAnnonces() {
	const container = document.getElementById('param-annonces-active');
	if (!container) return;
	try {
		const response = await fetch(ADMIN_ANNONCES_API);
		const result = await response.json();
		adminAnnonces = Array.isArray(result) ? result : (result.data || result.annonces || result.items || []);
		container.innerHTML = adminAnnonces.length ? '' : '<p class="item-subtext">Aucune annonce active.</p>';
		adminAnnonces.forEach(item => {
			const row = document.createElement('div');
			row.className = 'admin-item-row';
			row.innerHTML = '<div class="item-info"><span class="badge"></span><strong></strong><p class="item-subtext"></p></div><div class="item-actions"><button class="btn-icon btn-delete" type="button" title="Supprimer">🗑️</button></div>';
			row.querySelector('.badge').textContent = item.category || item.categorie || 'Annonce';
			row.querySelector('strong').textContent = item.title || item.titre || '';
			row.querySelector('.item-subtext').textContent = `${item.price || item.prix || ''} • ${item.description || item.desc || ''}`;
			row.querySelector('.btn-delete').onclick = () => deleteAnnonce(item.id);
			container.appendChild(row);
		});
	} catch (error) { container.innerHTML = '<p class="item-subtext">Impossible de charger les annonces.</p>'; }
}

async function deleteAnnonce(id) {
	if (!id || !confirm('Supprimer cette annonce ?')) return;
	await fetch(`${ADMIN_ANNONCES_API}/${id}`, { method: 'DELETE' });
	loadAdminAnnonces();
}

document.addEventListener('DOMContentLoaded', () => {
	const form = document.getElementById('param-annonce-form');
	form?.addEventListener('submit', async event => {
		event.preventDefault();
		const payload = { title: document.getElementById('annonce-title').value.trim(), description: document.getElementById('annonce-desc').value.trim(), category: document.getElementById('annonce-category').value, price: document.getElementById('annonce-price').value.trim() };
		const response = await fetch(ADMIN_ANNONCES_API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
		if (!response.ok) return alert('Impossible de publier cette annonce.');
		form.reset();
		loadAdminAnnonces();
	});
	document.getElementById('btn-delete-all-annonces')?.addEventListener('click', async () => {
		if (confirm('Supprimer toutes les annonces ?')) { await fetch(ADMIN_ANNONCES_API, { method: 'DELETE' }); loadAdminAnnonces(); }
	});
	loadAdminAnnonces();
});
