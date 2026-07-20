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
    const header = document.getElementById('admin-header');

    if (session) {
        if(gate) gate.classList.add('hidden');
        if(workspace) workspace.classList.remove('hidden');
        if(header) header.classList.remove('hidden');
        runConsoleDashboard();
    } else {
        if(gate) gate.classList.remove('hidden');
        if(workspace) workspace.classList.add('hidden');
        if(header) header.classList.add('hidden');
        setupGateLogin();
    }
}

function setupGateLogin() {
    const loginBtn = document.getElementById('gate-login-btn');
    if (!loginBtn) return;

    loginBtn.onclick = function() {
        const email = document.getElementById('gate-email').value.trim();
        const pass = document.getElementById('gate-password').value;

        // Identifiants d'administration maîtres et professionnels
        if ((email === "admin@orstore.com" && pass === "admin") || (email === "orphet@orstore.com" && pass === "root")) {
            localStorage.setItem(CONFIG.CURRENT_ADMIN_KEY, email);
            alert("Accès accordé. Bienvenue, Administrateur.");
            initSecurity();
        } else {
            alert("Échec d'authentification : Identifiants incorrects ou droits insuffisants.");
        }
    };
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

    selector.innerHTML = '<option value="">-- Choisir un candidat à auditer --</option>';
    participants.forEach(p => {
        const option = document.createElement('option');
        option.value = p.id;
        option.textContent = `${p.name} (${p.gender === 'F' ? 'Femme' : 'Homme'}) — [${p.comments.length} coms]`;
        selector.appendChild(option);
    });

    selector.onchange = function() {
        renderIndividualComments(this.value);
    };
}

// Affichage chirurgical des commentaires avec option de suppression unique
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
        row.style.padding = '0.7rem 0.8rem';
        row.style.borderRadius = '10px';
        row.style.background = 'rgba(255,255,255,0.04)';
        row.style.border = '1px solid var(--border)';

        const text = document.createElement('p');
        text.style.margin = '0';
        text.style.color = '#fff';
        text.style.flex = '1';
        text.textContent = item.text;

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-soft';
        deleteBtn.style.width = 'auto';
        deleteBtn.style.padding = '0.5rem 0.75rem';
        deleteBtn.textContent = 'Supprimer';
        deleteBtn.onclick = function() {
            const nextItems = items.filter(entry => entry.id !== item.id);
            saveRadioItems(nextItems);
            renderRadioItemsAdmin();
            alert('Information supprimée de la radio couloir.');
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
        const item = document.createElement('div');
        item.style.background = 'rgba(255,255,255,0.04)';
        item.style.border = '1px solid var(--border)';
        item.style.borderRadius = '16px';
        item.style.padding = '0.9rem';
        item.style.display = 'grid';
        item.style.gap = '0.7rem';

        item.innerHTML = `
            <input class="participant-edit-name" value="${participant.name}" placeholder="Nom" style="width: 100%; padding: 0.7rem; border-radius: 8px; border: 1px solid var(--border); background: rgba(0,0,0,0.2); color: #fff;">
            <input class="participant-edit-photo" value="${participant.photo}" placeholder="Lien de photo" style="width: 100%; padding: 0.7rem; border-radius: 8px; border: 1px solid var(--border); background: rgba(0,0,0,0.2); color: #fff;">
            <select class="participant-edit-gender" style="width: 100%; padding: 0.7rem; border-radius: 8px; border: 1px solid var(--border); background: rgba(15,23,42,0.95); color: #fff;">
                <option value="M" ${participant.gender === 'M' ? 'selected' : ''}>Masculin</option>
                <option value="F" ${participant.gender === 'F' ? 'selected' : ''}>Féminin</option>
            </select>
            <div style="display: flex; gap: 0.6rem; flex-wrap: wrap;">
                <button class="btn btn-primary participant-save-btn" type="button" style="width: auto; padding: 0.65rem 0.9rem;">Enregistrer</button>
                <button class="btn btn-soft participant-delete-btn" type="button" style="width: auto; padding: 0.65rem 0.9rem;">Supprimer</button>
            </div>
        `;

        const nameInput = item.querySelector('.participant-edit-name');
        const photoInput = item.querySelector('.participant-edit-photo');
        const genderSelect = item.querySelector('.participant-edit-gender');
        const saveBtn = item.querySelector('.participant-save-btn');
        const deleteBtn = item.querySelector('.participant-delete-btn');

        saveBtn.onclick = function() {
            participant.name = nameInput.value.trim() || participant.name;
            participant.photo = photoInput.value.trim() || participant.photo;
            participant.gender = genderSelect.value;
            saveData();
            alert(`Profil mis à jour pour ${participant.name}`);
            renderParticipantManagement();
            populateParticipantSelector();
        };

        deleteBtn.onclick = function() {
            if (confirm(`Supprimer définitivement ${participant.name} et toutes ses données ?`)) {
                participants = participants.filter(p => p.id !== participant.id);
                saveData();
                renderParticipantManagement();
                populateParticipantSelector();
                alert('Candidat supprimé.');
            }
        };

        list.appendChild(item);
    });
}

function renderIndividualComments(participantId) {
    const stream = document.getElementById('mod-comments-stream');
    if (!stream) return;

    if (!participantId) {
        stream.innerHTML = '<div class="comment-empty">Aucun candidat sélectionné.</div>';
        return;
    }

    const participant = participants.find(p => p.id === participantId);
    if (!participant || !participant.comments || participant.comments.length === 0) {
        stream.innerHTML = '<div class="comment-empty" style="color: var(--primary);">Zéro commentaire trouvé pour ce profil.</div>';
        return;
    }

    stream.innerHTML = '';
    // On affiche les commentaires (du plus récent au plus ancien)
    participant.comments.slice().reverse().forEach((comment, indexInverted) => {
        // Retrouver l'index d'origine dans le tableau réel
        const realIndex = participant.comments.length - 1 - indexInverted;

        const item = document.createElement('div');
        item.className = 'comment-item';
        item.style.background = 'rgba(255,255,255,0.03)';
        item.style.padding = '0.8rem';
        item.style.borderRadius = '10px';
        item.style.border = '1px solid var(--border)';
        item.style.display = 'flex';
        item.style.justifyContent = 'space-between';
        item.style.alignItems = 'center';
        item.style.gap = '1rem';

        item.innerHTML = `
            <div style="flex-grow: 1;">
                <p style="margin:0; font-size:0.95rem; color:#fff;">${comment.text}</p>
                <small style="color: var(--text-muted); font-size:0.75rem;">Posté le : ${comment.time || 'Date inconnue'}</small>
            </div>
            <button class="btn-delete-single" data-index="${realIndex}" style="background: rgba(239,68,68,0.2); color: var(--red); border: 1px solid var(--red); padding: 0.4rem 0.6rem; border-radius: 6px; cursor: pointer; font-size: 0.8rem; font-weight: bold;">
                Supprimer
            </button>
        `;

        // Événement d'éradication sur le bouton unique de ce commentaire
        item.querySelector('.btn-delete-single').onclick = function() {
            if (confirm("Supprimer définitivement ce commentaire spécifique ?")) {
                participant.comments.splice(realIndex, 1);
                saveData();
                renderIndividualComments(participantId); // Rafraîchissement instantané du flux
                populateParticipantSelector(); // Mise à jour du compteur dans le sélecteur
            }
        };

        stream.appendChild(item);
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