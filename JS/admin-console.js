// =======================================================================
// CONSOLE D'ADMINISTRATION PROFESSIONNELLE POUR GBAI-RAI (SANS REDIRECTION JS)
// =======================================================================

// URL du backend Vercel
const API_URL = 'https://gbai-rai-backend-x.vercel.app/api';
const ADMIN_SESSION_STORAGE_KEY = 'gbai_admin_session_token';

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
let adminSession = { isAuthenticated: false, token: null };

function getStoredAdminToken() {
    try {
        return localStorage.getItem(ADMIN_SESSION_STORAGE_KEY) || '';
    } catch (error) {
        console.warn('Impossible d’accéder au stockage local:', error);
        return '';
    }
}

function persistAdminToken(token) {
    try {
        if (token) {
            localStorage.setItem(ADMIN_SESSION_STORAGE_KEY, token);
        }
    } catch (error) {
        console.warn('Impossible de persister le jeton d\'authentification:', error);
    }
}

function clearAdminForm() {
    const emailInput = document.getElementById('gate-email');
    const passInput = document.getElementById('gate-password');
    const errorDiv = document.getElementById('gate-error');

    if (emailInput) emailInput.value = '';
    if (passInput) passInput.value = '';
    if (errorDiv) {
        errorDiv.textContent = '';
        errorDiv.classList.add('hidden');
    }
}

function showAdminGate() {
    const gate = document.getElementById('admin-gate');
    const workspace = document.getElementById('admin-workspace');
    const logoutBtn = document.getElementById('admin-logout-top');

    if (gate) gate.classList.remove('hidden');
    if (workspace) workspace.classList.add('hidden');
    if (logoutBtn) logoutBtn.classList.add('hidden');
    clearAdminForm();
}

function showAdminWorkspace() {
    const gate = document.getElementById('admin-gate');
    const workspace = document.getElementById('admin-workspace');
    const logoutBtn = document.getElementById('admin-logout-top');

    if (gate) gate.classList.add('hidden');
    if (workspace) workspace.classList.remove('hidden');
    if (logoutBtn) logoutBtn.classList.remove('hidden');
}

function resetAdminAuthState() {
    adminSession = { isAuthenticated: false, token: null };
    persistAdminToken('');
    showAdminGate();
}

async function requestJson(path, options = {}) {
    const url = `${API_URL}${path.startsWith('/') ? path : `/${path}`}`;
    const token = localStorage.getItem(ADMIN_SESSION_STORAGE_KEY) || '';
    const requestOptions = {
        ...options,
        headers: {
            ...(options.headers || {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(options.method && options.method.toUpperCase() !== 'GET' ? { 'Content-Type': 'application/json' } : {}),
        }
    };
    const response = await fetch(url, requestOptions);
    const text = await response.text();
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return text ? JSON.parse(text) : null;
}

// 1. CHARGEMENT INITIAL DES DONNÉES
async function loadData() {
    try {
        const payload = await requestJson('/participants');
        participants = Array.isArray(payload) ? payload : (payload?.participants || payload?.data || []);
    } catch (error) {
        console.error('Erreur de connexion au serveur Backend:', error);
        participants = [];
    }

    try {
        const payload = await requestJson('/content');
        const content = payload?.content || payload?.data || payload || {};
        if (content && typeof content === 'object') {
            clashContent = {
                ...defaultClashContent,
                ...content,
                title: content.title || defaultClashContent.title,
                description: content.description || defaultClashContent.description,
                summaryLeftTitle: content.summaryLeftTitle || defaultClashContent.summaryLeftTitle,
                summaryLeftText: content.summaryLeftText || defaultClashContent.summaryLeftText
            };
        }
    } catch (error) {
        clashContent = { ...defaultClashContent };
    }
}

async function loadRadioItems() {
    try {
        const payload = await requestJson('/radio');
        const radio = payload?.radio || payload || {};
        return Array.isArray(radio) ? radio : (radio?.items || radio?.radioItems || payload?.items || payload?.radioItems || []);
    } catch (error) {
        console.warn('Impossible de charger la radio depuis le backend:', error);
        return [];
    }
}

async function saveRadioItems(items) {
    return requestJson('/radio', {
        method: 'PUT',
        body: JSON.stringify({ items })
    });
}

async function saveLocalConfig() {
    return requestJson('/content', {
        method: 'PUT',
        body: JSON.stringify(clashContent)
    });
}

// 2. CONTRÔLE D'ACCÈS
async function validateStoredSession() {
    const token = getStoredAdminToken();
    if (!token) {
        resetAdminAuthState();
        return false;
    }

    try {
        const response = await fetch(`${API_URL}/admin/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token })
        });
        const data = await response.json().catch(() => ({}));

        if (response.ok && data?.success !== false) {
            adminSession = { isAuthenticated: true, token };
            showAdminWorkspace();
            await runConsoleDashboard();
            return true;
        }
    } catch (error) {
        console.warn('Échec de validation de session backend:', error);
    }

    persistAdminToken('');
    resetAdminAuthState();
    return false;
}

function initSecurity() {
    resetAdminAuthState();
}

function setupGateLogin() {
    const loginBtn = document.getElementById('gate-login-btn');
    const loginForm = document.getElementById('admin-login-form');
    const emailInput = document.getElementById('gate-email');
    const passInput = document.getElementById('gate-password');
    const errorDiv = document.getElementById('gate-error');

    if (!loginBtn && !loginForm) return;

    async function handleLogin(event) {
        if (event) event.preventDefault();

        const email = emailInput ? emailInput.value.trim().toLowerCase() : '';
        const pass = passInput ? passInput.value.trim() : '';

        if (!email || !pass) {
            if (errorDiv) {
                errorDiv.textContent = '❌ Veuillez saisir un identifiant et un mot de passe.';
                errorDiv.classList.remove('hidden');
            }
            return;
        }

        try {
            const response = await fetch(`${API_URL}/admin/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password: pass })
            });

            let data = {};
            try { data = await response.json(); } catch (error) { data = {}; }

            if (response.ok && data?.success !== false) {
                const token = data?.token || data?.accessToken || data?.authToken || data?.jwt || data?.sessionToken || null;
                adminSession = { isAuthenticated: true, token };
                persistAdminToken(token);

                if (errorDiv) {
                    errorDiv.textContent = '';
                    errorDiv.classList.add('hidden');
                }

                showAdminWorkspace();
                await runConsoleDashboard();
            } else {
                adminSession = { isAuthenticated: false, token: null };
                persistAdminToken('');

                if (errorDiv) {
                    errorDiv.textContent = '❌ ' + (data?.message || 'Identifiants incorrects.');
                    errorDiv.classList.remove('hidden');
                } else {
                    alert('Échec d\'authentification : Identifiants incorrects.');
                }
            }
        } catch (error) {
            adminSession = { isAuthenticated: false, token: null };
            persistAdminToken('');

            if (errorDiv) {
                errorDiv.textContent = '❌ Impossible de contacter le serveur Backend.';
                errorDiv.classList.remove('hidden');
            } else {
                alert('Erreur : Impossible de contacter le serveur Backend.');
            }
        }
    }

    if (loginBtn) loginBtn.onclick = (event) => handleLogin(event);
    if (loginForm) loginForm.addEventListener('submit', handleLogin);

    [emailInput, passInput].forEach(input => {
        if (input) {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    handleLogin(e);
                }
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
    const list = document.getElementById('radio-items-list') || document.getElementById('radio-admin-list');
    if (!list) return;

    const items = await loadRadioItems();
    if (!items.length) {
        list.innerHTML = '<div class="comment-empty" style="color: var(--primary, #38bdf8);">Aucune information pour la radio couloir.</div>';
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
        row.style.border = '1px solid rgba(255,255,255,0.1)';
        row.style.marginBottom = '0.5rem';

        const text = document.createElement('p');
        text.style.margin = '0';
        text.style.color = '#fff';
        text.style.flex = '1';
        text.style.fontSize = '0.92rem';
        text.textContent = item.text;

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn-danger';
        deleteBtn.style.padding = '0.4rem 0.8rem';
        deleteBtn.style.fontSize = '0.8rem';
        deleteBtn.innerHTML = '🗑️ Supprimer';
        deleteBtn.onclick = async function(e) {
            e.stopPropagation(); // <-- Ajouté ici
            const nextItems = items.filter(entry => entry.id !== item.id);
            await saveRadioItems(nextItems);
            await renderRadioItemsAdmin();
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
        list.innerHTML = '<div class="comment-empty" style="color: var(--primary, #38bdf8);">Aucun candidat enregistré. Ajoutez-en un ci-dessus.</div>';
        return;
    }

    list.innerHTML = '';
    participants.forEach(participant => {
        const card = document.createElement('div');
        card.className = 'candidate-edit-card';
        card.style.background = 'rgba(255,255,255,0.03)';
        card.style.padding = '0.8rem';
        card.style.borderRadius = '12px';
        card.style.marginBottom = '0.75rem';
        card.style.border = '1px solid rgba(255,255,255,0.08)';

        card.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.6rem;">
                <img src="${participant.photo}" alt="${participant.name}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">
                <div>
                    <strong style="color: #fff; font-size: 0.95rem;">${participant.name}</strong>
                    <div style="font-size: 0.8rem; color: #94a3b8;">${participant.votes || 0} votes enregistrés</div>
                </div>
            </div>
            <div style="display: grid; gap: 0.5rem;">
                <input class="participant-edit-name" value="${participant.name}" placeholder="Nom du candidat" style="width: 100%; padding: 0.5rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.3); color: #fff;">
                <input class="participant-edit-photo" value="${participant.photo}" placeholder="URL de la photo" style="width: 100%; padding: 0.5rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.3); color: #fff;">
            </div>
            <div style="display: flex; gap: 0.5rem; margin-top: 0.6rem;">
                <button class="btn-primary participant-save-btn" type="button" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;">💾 Enregistrer</button>
                <button class="btn-danger participant-delete-btn" type="button" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;">🗑️ Supprimer</button>
            </div>
        `;

        const nameInput = card.querySelector('.participant-edit-name');
        const photoInput = card.querySelector('.participant-edit-photo');
        const saveBtn = card.querySelector('.participant-save-btn');
        const deleteBtn = card.querySelector('.participant-delete-btn');

        saveBtn.onclick = async function(e) {
            e.stopPropagation(); // <-- Ajouté ici
            try {
                await requestJson(`/participants/${participant.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: nameInput.value.trim() || participant.name,
                        photo: photoInput.value.trim() || participant.photo,
                        gender: participant.gender || 'M'
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

        deleteBtn.onclick = async function(e) {
            e.stopPropagation(); // <-- Ajouté ici
            try {
                await requestJson(`/participants/${participant.id}`, { method: 'DELETE' });
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
            <div class="comment-empty" style="text-align: center; padding: 1.5rem 1rem; color: #94a3b8;">
                <p style="font-size: 0.85rem;">Sélectionnez un participant ci-dessus pour examiner ses commentaires.</p>
            </div>
        `;
        return;
    }

    const participant = participants.find(p => p.id === participantId);
    if (!participant) return;

    stream.innerHTML = '';

    if (!participant.comments || participant.comments.length === 0) {
        stream.innerHTML = '<div class="comment-empty" style="color: var(--primary, #38bdf8); padding: 1rem; text-align: center;">✨ Aucun commentaire sous cette photo.</div>';
        return;
    }

    participant.comments.slice().reverse().forEach((comment, indexInverted) => {
        const realIndex = participant.comments.length - 1 - indexInverted;
        const card = document.createElement('div');
        card.style.display = 'flex';
        card.style.justifyContent = 'space-between';
        card.style.alignItems = 'center';
        card.style.padding = '0.6rem 0.8rem';
        card.style.background = 'rgba(255,255,255,0.03)';
        card.style.border = '1px solid rgba(255,255,255,0.08)';
        card.style.borderRadius = '8px';
        card.style.marginBottom = '0.5rem';

        card.innerHTML = `
            <div>
                <p style="margin: 0; color: #fff; font-size: 0.88rem;">${comment.text}</p>
                <span style="font-size: 0.75rem; color: #94a3b8;">🕒 ${comment.time || 'Récemment'}</span>
            </div>
            <button class="btn-danger btn-delete-single" style="padding: 0.3rem 0.6rem; font-size: 0.75rem;">🗑️</button>
        `;

        card.querySelector('.btn-delete-single').onclick = async function(e) {
            e.stopPropagation(); // <-- Ajouté ici
            const commentId = comment.id || realIndex;
            try {
                await requestJson(`/participants/${participantId}/comments/${commentId}`, { method: 'DELETE' });
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
}

function setupDashboardEvents() {
    const logoutBtn = document.getElementById('admin-logout-top');
    if (logoutBtn) {
        logoutBtn.onclick = function() {
            resetAdminAuthState();
        };
    }

    const addCandidateBtn = document.getElementById('add-candidate-btn');
    if (addCandidateBtn) {
        addCandidateBtn.onclick = async function(e) {
            e.preventDefault();
            const nameInput = document.getElementById('new-candidate-name');
            const fileInput = document.getElementById('new-candidate-file');
            const photoInput = document.getElementById('new-candidate-photo');
            const genderInput = document.getElementById('new-candidate-gender');

            const name = nameInput ? nameInput.value.trim() : '';
            const selectedFile = fileInput?.files?.[0];
            let photoUrl = photoInput ? photoInput.value.trim() : '';
            const gender = genderInput ? genderInput.value : 'M';

            if (!name) {
                alert("Veuillez saisir un nom pour le candidat.");
                return;
            }

            try {
                if (selectedFile) {
                    photoUrl = await new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(reader.result);
                        reader.onerror = () => reject(new Error('Erreur de lecture du fichier.'));
                        reader.readAsDataURL(selectedFile);
                    });
                }

                if (!photoUrl) {
                    alert("Veuillez choisir une photo à importer ou coller une URL.");
                    return;
                }

                const response = await fetch(`${API_URL}/participants`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${localStorage.getItem(ADMIN_SESSION_STORAGE_KEY) || ''}`
                    },
                    body: JSON.stringify({ name, photo: photoUrl, gender })
                });

                const data = await response.json();

                if (data.success || response.ok) {
                    alert(`Succès : Le candidat "${name}" a été ajouté.`);
                    if (nameInput) nameInput.value = '';
                    if (fileInput) fileInput.value = '';
                    if (photoInput) photoInput.value = '';
                    await loadData();
                    renderParticipantManagement();
                    populateParticipantSelector();
                }
            } catch (error) {
                alert("Erreur lors de l'enregistrement du candidat.");
            }
        };
    }

    const addRadioBtn = document.getElementById('add-radio-item-btn');
    if (addRadioBtn) {
        addRadioBtn.onclick = async function(e) {
            e.preventDefault();
            const textInput = document.getElementById('new-radio-item-text');
            const text = textInput ? textInput.value.trim() : '';

            if (!text) return;

            const items = await loadRadioItems();
            const nextItems = [...items, { id: 'radio-' + Date.now(), text }];
            await saveRadioItems(nextItems);
            textInput.value = '';
            await renderRadioItemsAdmin();
            alert('Annonce diffusée sur Radio Couloir !');
        };
    }

    const saveCfgBtn = document.getElementById('save-cfg-btn');
    if (saveCfgBtn) {
        saveCfgBtn.onclick = async function() {
            const titleInput = document.getElementById('cfg-clash-title');
            const descInput = document.getElementById('cfg-clash-desc');

            if (titleInput) clashContent.title = titleInput.value.trim();
            if (descInput) clashContent.description = descInput.value.trim();

            try {
                await saveLocalConfig();
                alert('Configuration mise à jour avec succès !');
            } catch (error) {
                alert('Erreur lors de la mise à jour de la configuration.');
            }
        };
    }
}

// Initialisation au chargement du DOM
document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
    initSecurity();
    setupGateLogin();
    await validateStoredSession();
});
