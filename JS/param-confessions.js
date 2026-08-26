const ADMIN_CONFESSIONS_API = 'https://gbai-rai-backend-x.vercel.app/api/confessions';
async function loadAdminConfessions() {
	const active = document.getElementById('param-confessions-active');
	const pending = document.getElementById('param-confessions-pending');
	if (!active && !pending) return;
	try {
		const response = await fetch(ADMIN_CONFESSIONS_API);
		const result = await response.json();
		const items = Array.isArray(result) ? result : (result.data || result.confessions || result.items || []);
		[active, pending].filter(Boolean).forEach(list => {
			list.innerHTML = '';
			items.forEach(item => {
				const row = document.createElement('div'); row.className = 'admin-item-row';
				row.innerHTML = '<div class="item-info"><span class="badge badge-anonyme"></span><strong></strong><p class="item-subtext"></p></div><div class="item-actions"><button class="btn-icon btn-delete" type="button">🗑️</button></div>';
				row.querySelector('.badge').textContent = item.category || item.categorie || 'Anonyme';
				row.querySelector('strong').textContent = `#Confession ${item.number || item.id || ''}`;
				row.querySelector('.item-subtext').textContent = item.text || item.content || '';
				row.querySelector('.btn-delete').onclick = async () => { await fetch(`${ADMIN_CONFESSIONS_API}/${item.id}`, { method: 'DELETE' }); loadAdminConfessions(); };
				list.appendChild(row);
			});
		});
	} catch (error) { console.warn('Confessions admin indisponibles:', error); }
}
document.addEventListener('DOMContentLoaded', loadAdminConfessions);
