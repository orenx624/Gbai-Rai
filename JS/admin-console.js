// =======================================================================
// CONSOLE D'ADMINISTRATION PROFESSIONNELLE POUR GBAI-RAI
// =======================================================================

const CONFIG = {
    STORAGE_KEY: 'gbai_rai_participants',
    CLASH_CONTENT_KEY: 'gbai_rai_clash_content',
    VOTE_STATE_KEY: 'gbai_rai_voted_pairs',
    CURRENT_ADMIN_KEY: 'gbai_rai_current_logged_admin',
    RADIO_ITEMS_KEY: 'gbai_rai_radio_items'
};

const defaultParticipants = [
    { id: 'p1', name: 'Amina', gender: 'F', photo: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=80', votes: 0, comments: [] },
    { id: 'p2', name: 'Moussa', gender: 'M', photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=800&q=80', votes: 0, comments: [] },
    { id: 'p3', name: 'Seydou', gender: 'M', photo: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=800&q=80', votes: 0, comments: [] }
];

const defaultRadioItems = [
    { id: 'radio-1', text: 'Un nouveau duel a été lancé au campus et tout le monde veut voter avant la fin de la journée.' },
    { id: 'radio-2', text: 'Les rumeurs les plus chaudes circulent déjà dans les couloirs, et la radio couloir les relaye en temps réel.' }
];

const defaultClashContent = {
    title: 'Clash des photos',
    description: 'Vote pour ta photo préférée et laisse un commentaire sous chacune des deux équipes.',
    summaryLeftTitle: 'Comment ça marche ?',
    summaryLeftText: 'Un seul vote par duel. Le bouton de l\'autre photo se désactive automatiquement.',
    summaryRightTitle: 'Commentaires séparés',
    summaryRightText: 'Chaque photo possède sa colonne dédiée pour garder les avis distincts.'
};

let participants = [];
let clashContent = {};

// 1. CHARGEMENT INITIAL DES DONNÉES DE L'APPLICATION
function loadData() {
    const storedParticipants = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEY));
    participants = Array.isArray(storedParticipants) && storedParticipants.length ? storedParticipants : defaultParticipants;
    clashContent = JSON.parse(localStorage.getItem(CONFIG.CLASH_CONTENT_KEY)) || {...defaultClashContent};
}

function loadRadioItems() {
    const stored = JSON.parse(localStorage.getItem(CONFIG.RADIO_ITEMS_KEY));
    return Array.isArray(stored) && stored.length ? stored : defaultRadioItems;
}

function saveRadioItems(items) {
    localStorage.setItem(CONFIG.RADIO_ITEMS_KEY, JSON.stringify(items));
}

function saveData() {
    localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(participants));
    localStorage.setItem(CONFIG.CLASH_CONTENT_KEY, JSON.stringify(clashContent));
}

// 2. CONTRÔLE D'ACCÈS ET VÉRIFICATION DE SESSION
function initSecurity() {
    const session = localStorage.getItem(CONFIG.CURRENT_ADMIN_KEY);
    const gate = document.getElementById('admin-gate');
    const workspace = document.getElementById('admin-workspace');
    const logoutBtn = document.getElementById('admin-logout-top');

    if (session) {
        if(gate) gate.classList.add('hidden');
        if(workspace) workspace.classList.remove('hidden');
        if(logoutBtn) logoutBtn.classList.remove('hidden');
        runConsoleDashboard();
    } else {
        if(gate) gate.classList.remove('hidden');
        if(workspace) workspace.classList.add('hidden');
        if(logoutBtn) logoutBtn.classList.add('hidden');
        setupGateLogin();
    }
}

function setupGateLogin() {
    const loginBtn = document.getElementById('gate-login-btn');
    const emailInput = document.getElementById('gate-email');
    const passInput = document.getElementById('gate-password');
    const errorDiv = document.getElementById('gate-error');

    if (!loginBtn) return;

    function handleLogin() {
        const email = emailInput ? emailInput.value.trim().toLowerCase() : '';
        const pass = passInput ? passInput.value.trim() : '';

        const validEmails = ['admin@orstore.com', 'admin', 'orphet@orstore.com', 'admin@gbai-rai.com', 'orphet'];
        const validPasswords = ['admin', 'root', '1234', 'admin123'];

        const isEmailValid = validEmails.includes(email) || email.startsWith('admin');
        const isPassValid = validPasswords.includes(pass);

        if ((isEmailValid && isPassValid) || (email === "admin" && pass === "admin") || (pass === "admin")) {
            if (errorDiv) errorDiv.classList.add('hidden');
            localStorage.setItem(CONFIG.CURRENT_ADMIN_KEY, email || 'admin@orstore.com');
            initSecurity();
        } else {
            if (errorDiv) {
                errorDiv.textContent = "❌ Identifiants incorrects. (Identifiant: admin / Mot de passe: admin)";
                errorDiv.classList.remove('hidden');
            } else {
                alert("Échec d'authentification : Identifiants incorrects.");
            }
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

// 3. CODE DE GESTION DU TABLEAU DE BORD DYNAMIQUE
function runConsoleDashboard() {
    populateParticipantSelector();
    renderParticipantManagement();
    renderRadioItemsAdmin();
    prefillConfigurationFields();
    setupDashboardEvents();
}

// Remplir le sélecteur pour cibler la modération de commentaires
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

// Affichage chirurgical des commentaires avec animation d'entrée et suppression fluide
function renderRadioItemsAdmin() {
    const list = document.getElementById('radio-items-list');
    if (!list) return;

    const items = loadRadioItems();
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
        deleteBtn.onclick = function() {
            row.style.animation = 'fadeOutScale 0.25s forwards';
            setTimeout(() => {
                const nextItems = items.filter(entry => entry.id !== item.id);
                saveRadioItems(nextItems);
                renderRadioItemsAdmin();
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

        saveBtn.onclick = function() {
            participant.name = nameInput.value.trim() || participant.name;
            participant.photo = photoInput.value.trim() || participant.photo;
            participant.gender = genderSelect.value;
            saveData();
            saveBtn.textContent = '✓ Modifié !';
            setTimeout(() => { saveBtn.textContent = '💾 Enregistrer'; }, 1500);
            renderParticipantManagement();
            populateParticipantSelector();
        };

        deleteBtn.onclick = function() {
            card.style.animation = 'fadeOutScale 0.25s forwards';
            setTimeout(() => {
                participants = participants.filter(p => p.id !== participant.id);
                saveData();
                renderParticipantManagement();
                populateParticipantSelector();
            }, 220);
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

    // Header Card d'aperçu du candidat sélectionné
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

    // Affichage des commentaires avec animation d'entrée et suppression fluide
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

        card.querySelector('.btn-delete-single').onclick = function() {
            card.classList.add('deleting');
            setTimeout(() => {
                participant.comments.splice(realIndex, 1);
                saveData();
                renderIndividualComments(participantId);
                populateParticipantSelector();
            }, 250);
        };

        stream.appendChild(card);
    });
}

// Pré-remplir les inputs d'édition de texte du site
function prefillConfigurationFields() {
    if(document.getElementById('cfg-clash-title')) document.getElementById('cfg-clash-title').value = clashContent.title;
    if(document.getElementById('cfg-clash-desc')) document.getElementById('cfg-clash-desc').value = clashContent.description;
    if(document.getElementById('cfg-left-title')) document.getElementById('cfg-left-title').value = clashContent.summaryLeftTitle;
    if(document.getElementById('cfg-left-text')) document.getElementById('cfg-left-text').value = clashContent.summaryLeftText;
}

// Événements d'action (Enregistrements, modifications, ajouts)
function setupDashboardEvents() {
    // Bouton de déconnexion globale
    const logoutTop = document.getElementById('admin-logout-top');
    if (logoutTop) {
        logoutTop.onclick = function() {
            localStorage.removeItem(CONFIG.CURRENT_ADMIN_KEY);
            location.reload();
        };
    }

    // Action : Déployer/Ajouter un nouveau candidat
    const addBtn = document.getElementById('add-candidate-btn');
    if (addBtn) {
        addBtn.onclick = function() {
            const name = document.getElementById('new-candidate-name').value.trim();
            const photo = document.getElementById('new-candidate-photo').value.trim();
            const gender = document.getElementById('new-candidate-gender').value;

            if (!name || !photo) {
                alert("Erreur : Veuillez attribuer un nom et un lien d'image valide.");
                return;
            }

            const newId = 'p' + (Date.now()); // Génération d'ID unique par timestamp
            participants.push({
                id: newId,
                name: name,
                gender: gender,
                photo: photo,
                votes: 0,
                comments: []
            });

            saveData();
            alert(`Succès : Le candidat "${name}" a été ajouté à la base de données.`);
            document.getElementById('new-candidate-name').value = '';
            document.getElementById('new-candidate-photo').value = '';
            renderParticipantManagement();
            populateParticipantSelector();
        };
    }

    const addRadioItemBtn = document.getElementById('add-radio-item-btn');
    if (addRadioItemBtn) {
        addRadioItemBtn.onclick = function() {
            const textInput = document.getElementById('new-radio-item-text');
            const text = textInput?.value.trim();
            if (!text) {
                alert('Veuillez saisir une information avant de l’ajouter à la radio couloir.');
                return;
            }
            const items = loadRadioItems();
            items.push({ id: 'radio-' + Date.now(), text });
            saveRadioItems(items);
            textInput.value = '';
            renderRadioItemsAdmin();
            alert('Information ajoutée à la radio couloir.');
        };
    }

    // Action : Sauvegarder les modifications de texte du site
    const saveCfgBtn = document.getElementById('save-cfg-btn');
    if (saveCfgBtn) {
        saveCfgBtn.onclick = function() {
            clashContent.title = document.getElementById('cfg-clash-title').value.trim() || defaultClashContent.title;
            clashContent.description = document.getElementById('cfg-clash-desc').value.trim() || defaultClashContent.description;
            clashContent.summaryLeftTitle = document.getElementById('cfg-left-title').value.trim() || defaultClashContent.summaryLeftTitle;
            clashContent.summaryLeftText = document.getElementById('cfg-left-text').value.trim() || defaultClashContent.summaryLeftText;

            saveData();
            alert("Les modifications de contenu ont été appliquées et enregistrées avec succès !");
        };
    }

    // Nettoyages globaux (Options de secours)
    const resetVotes = document.getElementById('global-reset-votes');
    if (resetVotes) {
        resetVotes.onclick = function() {
            if (confirm("⚠️ Réinitialiser TOUS les compteurs de votes à zéro ?")) {
                participants.forEach(p => p.votes = 0);
                localStorage.setItem(CONFIG.VOTE_STATE_KEY, JSON.stringify({}));
                saveData();
                alert("Scores remis à zéro !");
                location.reload();
            }
        };
    }

    const clearComments = document.getElementById('global-clear-comments');
    if (clearComments) {
        clearComments.onclick = function() {
            if (confirm("⚠️ Supprimer intégralement TOUS les commentaires du site d'un coup ?")) {
                participants.forEach(p => p.comments = []);
                saveData();
                alert("Base de commentaires nettoyée !");
                location.reload();
            }
        };
    }
}

// Initialisation dès chargement complet du script
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    initSecurity();
});