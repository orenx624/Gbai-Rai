document.addEventListener('DOMContentLoaded', () => {
    fetchSondages();

    // Gestion de l'ajout dynamique d'options dans le formulaire
    const btnAddOption = document.getElementById('btn-add-option');
    if (btnAddOption) {
        btnAddOption.addEventListener('click', () => {
            const container = document.getElementById('options-container');
            const count = container.querySelectorAll('.option-input').length + 1;

            const row = document.createElement('div');
            row.className = 'option-row';
            row.style.display = 'flex';
            row.style.gap = '0.5rem';

            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'custom-input option-input';
            input.placeholder = `Option ${count} (ex: ... )`;
            input.required = true;

            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'btn-icon btn-delete';
            removeBtn.textContent = '❌';
            removeBtn.title = 'Retirer cette option';
            removeBtn.onclick = () => row.remove();

            row.appendChild(input);
            row.appendChild(removeBtn);
            container.appendChild(row);
        });
    }

    // Gestion de la soumission du formulaire de création de sondage
    const form = document.getElementById('param-sondages-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const question = document.getElementById('sondage-question').value.trim();
            const optionInputs = document.querySelectorAll('.option-input');
            const options = Array.from(optionInputs).map(input => input.value.trim()).filter(val => val !== '');

            if (!question || options.length < 2) {
                alert('Veuillez renseigner une question et au moins 2 options valides.');
                return;
            }

            try {
                const response = await fetch('/api/sondages', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ question, options })
                });

                const result = await response.json();
                if (response.ok && result.success) {
                    form.reset();
                    // Remettre les 2 champs d'options de base
                    document.getElementById('options-container').innerHTML = `
                        <div class="option-row" style="display: flex; gap: 0.5rem;">
                            <input type="text" class="custom-input option-input" placeholder="Option 1 (ex: Informatique de Gestion)" required>
                        </div>
                        <div class="option-row" style="display: flex; gap: 0.5rem;">
                            <input type="text" class="custom-input option-input" placeholder="Option 2 (ex: Finance et Comptabilité)" required>
                        </div>
                    `;
                    fetchSondages();
                } else {
                    alert('Erreur : ' + (result.message || 'Impossible de créer le sondage'));
                }
            } catch (error) {
                console.error('Erreur réseau :', error);
                alert('Erreur de connexion avec le serveur.');
            }
        });
    }

    // Gestion du bouton global "Tout supprimer"
    const btnDeleteAll = document.getElementById('btn-delete-all-sondages');
    if (btnDeleteAll) {
        btnDeleteAll.addEventListener('click', async () => {
            if (!confirm('Voulez-vous vraiment supprimer TOUS les sondages ?')) return;

            try {
                const response = await fetch('/api/sondages', { method: 'DELETE' });
                if (response.ok) {
                    fetchSondages();
                } else {
                    alert('Erreur lors de la suppression globale.');
                }
            } catch (error) {
                console.error('Erreur réseau :', error);
            }
        });
    }
});

// Fonction pour récupérer et afficher les sondages
async function fetchSondages() {
    try {
        const response = await fetch('/api/sondages');
        const result = await response.json();
        const container = document.getElementById('param-sondages-list');
        if (!container) return;

        container.innerHTML = '';

        const sondages = result.data || (Array.isArray(result) ? result : []);

        if (sondages.length === 0) {
            container.innerHTML = '<p class="item-subtext" style="text-align: center; padding: 1rem;">Aucun sondage actif pour le moment.</p>';
            return;
        }

        sondages.forEach(sondage => {
            // Calculer le total des votes de toutes les options
            const totalVotes = sondage.options ? sondage.options.reduce((sum, opt) => sum + (opt.votes || 0), 0) : 0;

            const row = document.createElement('div');
            row.className = 'admin-item-row';
            row.innerHTML = `
                <div class="item-info">
                    <strong>${sondage.question}</strong>
                    <p class="item-subtext">Statut : ${sondage.active !== false ? 'Actif' : 'Clôturé'} • ${totalVotes} vote(s)</p>
                </div>
                <div class="item-actions">
                    <button class="btn-icon btn-delete" onclick="deleteSondage('${sondage.id}')" title="Supprimer ce sondage">🗑️</button>
                </div>
            `;
            container.appendChild(row);
        });
    } catch (error) {
        console.error('Erreur lors du chargement des sondages :', error);
    }
}

// Fonction de suppression d'un sondage individuel
async function deleteSondage(id) {
    if (!confirm('Voulez-vous vraiment supprimer ce sondage ?')) return;

    try {
        const response = await fetch(`/api/sondages/${id}`, { method: 'DELETE' });
        if (response.ok) {
            fetchSondages();
        } else {
            alert('Erreur lors de la suppression.');
        }
    } catch (error) {
        console.error('Erreur réseau :', error);
    }
}

