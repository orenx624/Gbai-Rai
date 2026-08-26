const CONFESSIONS_API = 'https://gbai-rai-backend-x.vercel.app/api/confessions';
let confessionsRequest = null;
let confessions = [];

function renderConfessions() {
	const container = document.getElementById('confessions-feed-container');
	if (!container) return;
	container.innerHTML = '';
	if (!confessions.length) {
		container.innerHTML = '<p class="item-subtext">Aucune confession publiée pour le moment.</p>';
		return;
	}
	confessions.forEach((item, index) => {
		const card = document.createElement('article');
		card.className = 'confession-card';
		card.innerHTML = '<div class="confession-header"><span class="confession-id"></span><span class="badge badge-anonyme"></span></div><p class="confession-text"></p><div class="confession-reactions"></div>';
		card.querySelector('.confession-id').textContent = `#Confession ${item.number || item.id || index + 1}`;
		card.querySelector('.badge').textContent = item.category || item.categorie || 'Anonyme';
		card.querySelector('.confession-text').textContent = item.text || item.content || item.confession || '';
		card.querySelector('.confession-reactions').textContent = item.createdAt ? new Date(item.createdAt).toLocaleString('fr-FR') : '';
		container.appendChild(card);
	});
}

async function loadConfessions(forceRefresh = false) {
	if (confessionsRequest && !forceRefresh) return confessionsRequest;
	confessionsRequest = fetch(`${CONFESSIONS_API}${forceRefresh ? `?t=${Date.now()}` : ''}`).then(async response => {
		if (!response.ok) throw new Error(`HTTP ${response.status}`);
		const result = await response.json();
		confessions = Array.isArray(result) ? result : (result.data || result.confessions || result.items || []);
		renderConfessions();
	}).catch(() => {
		const container = document.getElementById('confessions-feed-container');
		if (container && !confessions.length) container.innerHTML = '<p class="item-subtext">Impossible de charger les confessions pour le moment.</p>';
	}).finally(() => { confessionsRequest = null; });
	return confessionsRequest;
}

async function submitConfession() {
	const input = document.getElementById('confession-input');
	const category = document.getElementById('confession-category');
	const text = input?.value.trim();
	if (!text) return alert('Écrivez une confession avant de publier.');
	try {
		const response = await fetch(`${CONFESSIONS_API}/proposer`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, category: category?.value || 'Anonyme' }) });
		if (!response.ok) throw new Error(`HTTP ${response.status}`);
		input.value = '';
		alert('Votre confession a été envoyée pour modération.');
	} catch (error) {
		alert('Impossible d’envoyer la confession pour le moment.');
	}
}

document.addEventListener('DOMContentLoaded', () => {
	document.getElementById('submit-confession-btn')?.addEventListener('click', submitConfession);
	loadConfessions();
	gbaiStartPolling(() => loadConfessions(true), 20000);
});
