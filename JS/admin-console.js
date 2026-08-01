// =======================================================================
// CONSOLE D'ADMINISTRATION PROFESSIONNELLE POUR GBAI-RAI (AVEC BACKEND)
// =======================================================================

// URL du backend Vercel.
const API_URL = 'https://gbai-rai-backend-x.vercel.app/api';

const defaultClashContent = {
    title: 'Clash des photos',
    description: 'Vote pour ta photo préférée et laisse un commentaire sous chacune des deux équipes.',
    summaryLeftTitle: 'Comment ça marche ?',
    summaryLeftText: 'Un seul vote par duel. Le bouton de l\'autre photo se désactive automatiquement.',
    summaryRightTitle: 'Commentaires séparés',
    summaryRightText: 'Chaque photo possède sa colonne dédiée pour garder les avis distincts.'
};

let participants = [];
let clashContent = { ...defaultClashContent };

async function requestJson(path, options = {}) {
    const url = `${API_URL}${path.startsWith('/') ? path : `/${path}`}`;
    const response = await fetch(url, options);
    const text = await response.text();
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return text ? JSON.parse(text) : null;
}

// 1. CHARGEMENT INITIAL DES DONNÉES DEPUIS LE BACKEND
async function loadData() {
    try {
        const payload = await requestJson('/participants');
        participants = Array.isArray(payload) ? payload : (payload?.participants || []);
    } catch (error) {
        console.error('Erreur de connexion au serveur Backend:', error);
        participants = [];
    }

    try {
        const payload = await requestJson('/content');
        if (payload && typeof payload === 'object') {
            clashContent = {
                ...defaultClashContent,
                ...payload,
                title: payload.title || defaultClashContent.title,
                description: payload.description || defaultClashContent.description,
                summaryLeftTitle: payload.summaryLeftTitle || defaultClashContent.summaryLeftTitle,
                summaryLeftText: payload.summaryLeftText || defaultClashContent.summaryLeftText
            };
        }
    } catch (error) {
        clashContent = { ...defaultClashContent };
    }
}

async function loadRadioItems() {
    try {
        const payload = await requestJson('/radio');
        return Array.isArray(payload) ? payload : (payload?.items || payload?.radioItems || []);
    } catch (error) {
        console.warn('Impossible de charger la radio depuis le backend:', error);
        return [];
    }
}

async function saveRadioItems(items) {
    const payload = await requestJson('/radio', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items })
    });
    return payload;
}

async function saveLocalConfig() {
    return requestJson('/content', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clashContent)
    });
}

// 2. CONTRÔLE D'ACCÈS ET VÉRIFICATION DE SESSION
function initSecurity() {
    const gate = document.getElementById('admin-gate');
    const workspace = document.getElementById('admin-workspace');
    const logoutBtn = document.getElementById('admin-logout-top');

    if (gate) gate.classList.add('hidden');
    if (workspace) workspace.classList.remove('hidden');
    if (logoutBtn) logoutBtn.classList.remove('hidden');
    runConsoleDashboard();
}

function setupGateLogin() {
    const loginBtn = document.getElementById('gate-login-btn');
    const emailInput = document.getElementById('gate-email');
    const passInput = document.getElementById('gate-password');
    const errorDiv = document.getElementById('gate-error');

    if (!loginBtn) return;

    async function handleLogin() {
        const email = emailInput ? emailInput.value.trim().toLowerCase() : '';
        const pass = passInput ? passInput.value.trim() : '';

        try {
            // Vérification sécurisée auprès du Backend
            const response = await fetch(`${API_URL}/admin/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password: pass })
            });

            const data = await response.json();

            if (data.success) {
                if (errorDiv) errorDiv.classList.add('hidden');
                initSecurity();
            } else {
                if (errorDiv) {
                    errorDiv.textContent = "❌ " + (data.message || "Identifiants incorrects.");
                    errorDiv.classList.remove('hidden');
                } else {
                    alert("Échec d'authentification : Identifiants incorrects.");
                }
            }
        } catch (error) {
            alert("Erreur : Impossible de contacter le serveur Backend.");
        }
    }

    loginBtn.onclick = handleLogin;

    [emailInput, passInput].forEach(input => {
        if (input) {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') handleLogin();
            });
        }
    });
}

function updateAdminScrollIndicators() {
    const cards = document.querySelectorAll('.admin-card-section');

    cards.forEach(card => {
        const maxScrollTop = Math.max(0, card.scrollHeight - card.clientHeight);
        const progress = maxScrollTop > 0 ? Math.min(1, card.scrollTop / maxScrollTop) : 0;
        card.style.setProperty('--scroll-progress', progress.toFixed(4));
    });
}

function initAdminScrollIndicators() {
    const cards = document.querySelectorAll('.admin-card-section');

    cards.forEach(card => {
        card.addEventListener('scroll', updateAdminScrollIndicators, { passive: true });
        card.addEventListener('mouseenter', updateAdminScrollIndicators);
    });

    window.addEventListener('resize', updateAdminScrollIndicators);
    updateAdminScrollIndicators();
}

// 3. TABLEAU DE BORD DYNAMIQUE
async function runConsoleDashboard() {
    await loadData();
    populateParticipantSelector();
    renderParticipantManagement();
    await renderRadioItemsAdmin();
    prefillConfigurationFields();
    setupDashboardEvents();
    initAdminScrollIndicators();
}

function populateParticipantSelector() {
    const selector = document.getElementById('mod-participant-selector');
    if (!selector) return;

    const currentSelected = selector.value;
    selector.innerHTML = '<option value="">-- Choisir un candidat à auditer --</option>';
    participants.forEach(p => {
        const option = document.createElement('option');
        option.value = p.id;
        option.textContent = `${p.name} (${p.gender === 'F' ? 'Femme' : 'Homme'}) — [${p.comments ? p.comments.length : 0} coms]`;
        selector.appendChild(option);
    });

    if (currentSelected) selector.value = currentSelected;

    selector.onchange = function() {
        renderIndividualComments(this.value);
    };
}

async function renderRadioItemsAdmin() {
    const list = document.getElementById('radio-items-list');
    if (!list) return;

    const items = await loadRadioItems();
    if (!items.length) {
        list.innerHTML = '<div class="comment-empty" style="color: var(--primary);">Aucune information pour la radio couloir.</div>';
        return;
    }

    list.innerHTML = '';
    items.forEach(item => {
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.justifyContent = 'space-between';
        row.style.alignItems = 'center';
        row.style.gap = '0.75rem';
        row.style.padding = '0.75rem 0.9rem';
        row.style.borderRadius = '12px';
        row.style.background = 'rgba(255,255,255,0.04)';
        row.style.border = '1px solid var(--border)';
        row.style.animation = 'fadeInSlideUp 0.3s ease forwards';
        row.style.transition = 'all 0.25s ease';

        const text = document.createElement('p');
        text.style.margin = '0';
        text.style.color = '#fff';
        text.style.flex = '1';
        text.style.fontSize = '0.92rem';
        text.textContent = item.text;

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn-delete-single';
        deleteBtn.innerHTML = '<span>🗑️</span> <span>Supprimer</span>';
        deleteBtn.onclick = async function() {
            row.style.animation = 'fadeOutScale 0.25s forwards';
            setTimeout(async () => {
                const nextItems = items.filter(entry => entry.id !== item.id);
                await saveRadioItems(nextItems);
                await renderRadioItemsAdmin();
            }, 220);
        };

        row.appendChild(text);
        row.appendChild(deleteBtn);
        list.appendChild(row);
    });
}

function renderParticipantManagement() {
    const list = document.getElementById('participant-management-list');
    if (!list) return;

    if (!participants.length) {
        list.innerHTML = '<div class="comment-empty" style="color: var(--primary);">Aucun candidat enregistré. Ajoutez-en un pour lancer le duel.</div>';
        return;
    }

    list.innerHTML = '';
    participants.forEach(participant => {
        const card = document.createElement('div');
        card.className = 'candidate-edit-card';

        card.innerHTML = `
            <div class="candidate-edit-header">
                <img src="${participant.photo}" alt="${participant.name}">
                <div>
                    <strong style="color: #fff; font-size: 1rem;">${participant.name}</strong>
                    <div style="font-size: 0.8rem; color: var(--text-muted);">${participant.votes || 0} votes enregistrés</div>
                </div>
            </div>
            <div style="display: grid; gap: 0.6rem;">
                <input class="participant-edit-name" value="${participant.name}" placeholder="Nom du candidat" style="width: 100%; padding: 0.7rem; border-radius: 10px; border: 1px solid var(--border); background: rgba(0,0,0,0.25); color: #fff;">
                <input class="participant-edit-photo" value="${participant.photo}" placeholder="URL de la photo" style="width: 100%; padding: 0.7rem; border-radius: 10px; border: 1px solid var(--border); background: rgba(0,0,0,0.25); color: #fff;">
                <select class="participant-edit-gender" style="width: 100%; padding: 0.7rem; border-radius: 10px; border: 1px solid var(--border); background: rgba(15,23,42,0.95); color: #fff;">
                    <option value="M" ${participant.gender === 'M' ? 'selected' : ''}>Masculin (Roi)</option>
                    <option value="F" ${participant.gender === 'F' ? 'selected' : ''}>Féminin (Reine)</option>
                </select>
            </div>
            <div style="display: flex; gap: 0.6rem; margin-top: 0.2rem;">
                <button class="btn btn-primary participant-save-btn" type="button" style="padding: 0.6rem 1rem; font-size: 0.85rem; font-weight: bold; width: auto;">💾 Enregistrer</button>
                <button class="btn btn-soft participant-delete-btn" type="button" style="color: var(--red); padding: 0.6rem 1rem; font-size: 0.85rem; width: auto;">🗑️ Supprimer</button>
            </div>
        `;

        const nameInput = card.querySelector('.participant-edit-name');
        const photoInput = card.querySelector('.participant-edit-photo');
        const genderSelect = card.querySelector('.participant-edit-gender');
        const saveBtn = card.querySelector('.participant-save-btn');
        const deleteBtn = card.querySelector('.participant-delete-btn');

        saveBtn.onclick = async function() {
            try {
                await requestJson(`/participants/${participant.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: nameInput.value.trim() || participant.name,
                        photo: photoInput.value.trim() || participant.photo,
                        gender: genderSelect.value
                    })
                });
                saveBtn.textContent = '✓ Modifié !';
                setTimeout(() => { saveBtn.textContent = '💾 Enregistrer'; }, 1500);
                await loadData();
                renderParticipantManagement();
                populateParticipantSelector();
            } catch (error) {
                console.error('Échec de la mise à jour du candidat:', error);
                alert('Échec de la mise à jour du candidat.');
            }
        };

        deleteBtn.onclick = async function() {
            card.style.animation = 'fadeOutScale 0.25s forwards';
            try {
                await requestJson(`/participants/${participant.id}`, {
                    method: 'DELETE'
                });
                await loadData();
                renderParticipantManagement();
                populateParticipantSelector();
            } catch (error) {
                console.error('Échec de la suppression du candidat:', error);
                alert('Échec de la suppression du candidat.');
            }
        };

        list.appendChild(card);
    });
}

function renderIndividualComments(participantId) {
    const stream = document.getElementById('mod-comments-stream');
    if (!stream) return;

    if (!participantId) {
        stream.innerHTML = `
            <div class="comment-empty" style="text-align: center; padding: 2rem 1rem; color: var(--text-muted);">
                <div style="font-size: 2rem; margin-bottom: 0.5rem;">👆</div>
                <strong>Sélectionnez un candidat ci-dessus</strong>
                <p style="font-size: 0.85rem; margin-top: 0.25rem;">Choisissez un participant dans la liste pour auditer ses commentaires.</p>
            </div>
        `;
        return;
    }

    const participant = participants.find(p => p.id === participantId);
    if (!participant) return;

    const previewHeader = document.createElement('div');
    previewHeader.className = 'mod-candidate-preview';
    previewHeader.innerHTML = `
        <img src="${participant.photo}" alt="${participant.name}">
        <div class="mod-candidate-info">
            <h4>${participant.name} <span class="badge" style="font-size:0.7rem; padding:0.15rem 0.5rem;">${participant.gender === 'F' ? 'Reine 👑' : 'Roi 👑'}</span></h4>
            <div class="mod-candidate-stats">
                <span>🔥 ${participant.votes || 0} votes</span>
                <span class="mod-badge-count">💬 ${participant.comments ? participant.comments.length : 0} com(s)</span>
            </div>
        </div>
    `;

    stream.innerHTML = '';
    stream.appendChild(previewHeader);

    if (!participant.comments || participant.comments.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'comment-empty';
        empty.style.color = 'var(--primary)';
        empty.style.padding = '1.5rem';
        empty.style.textAlign = 'center';
        empty.innerHTML = '✨ Aucun commentaire sous cette photo.';
        stream.appendChild(empty);
        return;
    }

    participant.comments.slice().reverse().forEach((comment, indexInverted) => {
        const realIndex = participant.comments.length - 1 - indexInverted;

        const card = document.createElement('div');
        card.className = 'mod-comment-card';

        card.innerHTML = `
            <div class="mod-comment-content">
                <p class="mod-comment-text">${comment.text}</p>
                <div class="mod-comment-time">
                    <span>🕒</span> <span>${comment.time || 'Date inconnue'}</span>
                </div>
            </div>
            <button class="btn-delete-single" data-index="${realIndex}">
                <span>🗑️</span> <span>Supprimer</span>
            </button>
        `;

        card.querySelector('.btn-delete-single').onclick = async function() {
            card.classList.add('deleting');
            const commentId = comment.id || realIndex;
            try {
                await requestJson(`/participants/${participantId}/comments/${commentId}`, {
                    method: 'DELETE'
                });
                await loadData();
                renderIndividualComments(participantId);
                populateParticipantSelector();
            } catch (error) {
                console.error('Échec de la suppression du commentaire:', error);
                alert('Échec de la suppression du commentaire.');
            }
        };

        stream.appendChild(card);
    });
}

function prefillConfigurationFields() {
    if(document.getElementById('cfg-clash-title')) document.getElementById('cfg-clash-title').value = clashContent.title;
    if(document.getElementById('cfg-clash-desc')) document.getElementById('cfg-clash-desc').value = clashContent.description;
    if(document.getElementById('cfg-left-title')) document.getElementById('cfg-left-title').value = clashContent.summaryLeftTitle;
    if(document.getElementById('cfg-left-text')) document.getElementById('cfg-left-text').value = clashContent.summaryLeftText;
}

function setupDashboardEvents() {
    const logoutTop = document.getElementById('admin-logout-top');
    if (logoutTop) {
        logoutTop.onclick = function() {
            location.reload();
        };
    }

    // AJOUTER UN CANDIDAT (Envoi vers le Backend via HTTP)
    const addBtn = document.getElementById('add-candidate-btn');
    if (addBtn) {
        addBtn.onclick = async function() {
            const name = document.getElementById('new-candidate-name').value.trim();
            const photoInputValue = document.getElementById('new-candidate-photo').value.trim();
            const gender = document.getElementById('new-candidate-gender').value;
            const fileInput = document.getElementById('new-candidate-file');
            const selectedFile = fileInput?.files?.[0];

            if (!name || (!photoInputValue && !selectedFile)) {
                alert("Erreur : Veuillez attribuer un nom et une image valide (URL ou fichier)." );
                return;
            }

            addBtn.textContent = 'Envoi en cours...';

            try {
                let photo = photoInputValue;
                if (selectedFile) {
                    photo = await new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(reader.result);
                        reader.onerror = () => reject(new Error('Impossible de lire le fichier sélectionné.'));
                        reader.readAsDataURL(selectedFile);
                    });
                }

                const response = await fetch(`${API_URL}/participants`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, photo, gender })
                });

                const data = await response.json();

                if (data.success) {
                    alert(`Succès : Le candidat "${name}" a été ajouté.`);
                    document.getElementById('new-candidate-name').value = '';
                    document.getElementById('new-candidate-photo').value = '';
                    if (fileInput) fileInput.value = '';
                    await loadData();
                    renderParticipantManagement();
                    populateParticipantSelector();
                }
            } catch (error) {
                alert("Erreur lors de l'ajout sur le serveur.");
            } finally {
                addBtn.textContent = '➕ Ajouter le candidat';
            }
        };
    }

    const addRadioItemBtn = document.getElementById('add-radio-item-btn');
    if (addRadioItemBtn) {
        addRadioItemBtn.onclick = async function() {
            const textInput = document.getElementById('new-radio-item-text');
            const text = textInput?.value.trim();
            if (!text) {
                alert('Veuillez saisir une information avant de l’ajouter à la radio couloir.');
                return;
            }
            const items = await loadRadioItems();
            const nextItems = [...items, { id: 'radio-' + Date.now(), text }];
            await saveRadioItems(nextItems);
            textInput.value = '';
            await renderRadioItemsAdmin();
            alert('Information ajoutée à la radio couloir.');
        };
    }

    const saveCfgBtn = document.getElementById('save-cfg-btn');
    if (saveCfgBtn) {
        saveCfgBtn.onclick = async function() {
            clashContent.title = document.getElementById('cfg-clash-title').value.trim() || defaultClashContent.title;
            clashContent.description = document.getElementById('cfg-clash-desc').value.trim() || defaultClashContent.description;
            clashContent.summaryLeftTitle = document.getElementById('cfg-left-title').value.trim() || defaultClashContent.summaryLeftTitle;
            clashContent.summaryLeftText = document.getElementById('cfg-left-text').value.trim() || defaultClashContent.summaryLeftText;

            try {
                await saveLocalConfig();
                alert("Les modifications de contenu ont été appliquées !");
            } catch (error) {
                console.error('Échec de sauvegarde du contenu:', error);
                alert('Échec de la sauvegarde du contenu.');
            }
        };
    }
}

// Initialisation dès le chargement de la page
document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
    initSecurity();
});