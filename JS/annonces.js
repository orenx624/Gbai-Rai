const ANNONCES_API = 'https://gbai-rai-backend-x.vercel.app/api/annonces';
let annonces = [];
let annoncesRequest = null;

function annonceValue(item, ...keys) {
	return keys.map(key => item?.[key]).find(value => value !== undefined && value !== null) || '';
}

function renderAnnonces() {
	const container = document.getElementById('annonces-grid-container');
	if (!container) return;
	const activeFilter = document.querySelector('#annonces-filters .pill.active')?.dataset.filter || 'all';
	const visible = annonces.filter(item => activeFilter === 'all' || String(annonceValue(item, 'category', 'categorie')).toLowerCase() === activeFilter);
	container.innerHTML = '';
	if (!visible.length) {
		container.innerHTML = '<p class="item-subtext">Aucune annonce dans cette catégorie.</p>';
		return;
	}
	visible.forEach(item => {
		const card = document.createElement('article');
		card.className = 'annonce-card';
		const category = annonceValue(item, 'category', 'categorie') || 'Autre';
		const contact = annonceValue(item, 'whatsapp', 'phone', 'contact');
		card.innerHTML = `<div class="annonce-top"><span class="annonce-category"></span><span class="annonce-price"></span></div><h3 class="annonce-title"></h3><p class="annonce-desc"></p><div class="annonce-footer"><span class="annonce-date"></span><button class="btn-whatsapp" type="button">Contacter</button></div>`;
		card.querySelector('.annonce-category').textContent = category;
		card.querySelector('.annonce-price').textContent = annonceValue(item, 'price', 'prix');
		card.querySelector('.annonce-title').textContent = annonceValue(item, 'title', 'titre');
		card.querySelector('.annonce-desc').textContent = annonceValue(item, 'description', 'desc', 'content');
		card.querySelector('.annonce-date').textContent = annonceValue(item, 'createdAt', 'date');
		const button = card.querySelector('.btn-whatsapp');
		if (contact) button.onclick = () => { window.open(`https://wa.me/${String(contact).replace(/\D/g, '')}`, '_blank', 'noopener'); };
		else button.disabled = true;
		container.appendChild(card);
	});
}

async function loadAnnonces(forceRefresh = false) {
	if (annoncesRequest && !forceRefresh) return annoncesRequest;
	annoncesRequest = fetch(`${ANNONCES_API}${forceRefresh ? `?t=${Date.now()}` : ''}`).then(async response => {
		if (!response.ok) throw new Error(`HTTP ${response.status}`);
		const result = await response.json();
		annonces = Array.isArray(result) ? result : (result.data || result.annonces || result.items || []);
		renderAnnonces();
	}).catch(() => {
		const container = document.getElementById('annonces-grid-container');
		if (container && !annonces.length) container.innerHTML = '<p class="item-subtext">Impossible de charger les annonces pour le moment.</p>';
	}).finally(() => { annoncesRequest = null; });
	return annoncesRequest;
}

document.addEventListener('DOMContentLoaded', () => {
	document.querySelectorAll('#annonces-filters .pill').forEach(button => button.addEventListener('click', () => {
		document.querySelectorAll('#annonces-filters .pill').forEach(item => item.classList.remove('active'));
		button.classList.add('active');
		renderAnnonces();
	}));
	loadAnnonces();
	gbaiStartPolling(() => loadAnnonces(true), 30000);
});
