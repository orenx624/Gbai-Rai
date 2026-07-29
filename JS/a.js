// =======================================================================
// EXPÉRIENCE UTILISATEUR PUBLIC — Gbai-Rai
// Toute la logique de sécurité/validation est déléguée au backend.
// Ce fichier ne contient que de la présentation et des appels API.
// =======================================================================

const API_BASE = 'https://gbai-rai-backend.onrender.com/api';

// Clés localStorage pour l'état côté client uniquement (UI state, pas sécurité)
const PAIR_INDEX_KEY   = 'gbai_rai_current_pair';
const VOTE_STATE_KEY   = 'gbai_rai_voted_pairs';

const clashState = {
    participants: [],
    pairs: [],
    currentIndex: 0,
    voteState: {},
    initialized: false,
};

// -----------------------------------------------------------------------
// UTILITAIRES
// -----------------------------------------------------------------------
function loadVoteState()      { try { return JSON.parse(localStorage.getItem(VOTE_STATE_KEY)) || {}; } catch { return {}; } }
function saveVoteState(state) { localStorage.setItem(VOTE_STATE_KEY, JSON.stringify(state)); }
function loadPairIndex()      { const v = parseInt(localStorage.getItem(PAIR_INDEX_KEY), 10); return Number.isInteger(v) && v >= 0 ? v : 0; }
function savePairIndex(i)     { localStorage.setItem(PAIR_INDEX_KEY, String(i)); }

function formatTimestamp() {
    return new Date().toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function createCommentItem(comment) {
    const item = document.createElement('div');
    item.className = 'comment-item';
    item.innerHTML = `<p>${comment.text}</p><small>${comment.time}</small>`;
    return item;
}

function renderText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

// -----------------------------------------------------------------------
// PAGE CLASH
// -----------------------------------------------------------------------
async function renderClashPage() {
    // Chargement des participants depuis le backend
    try {
        const res = await fetch(`${API_BASE}/participants`);
        if (!res.ok) throw new Error('Erreur réseau');
        clashState.participants = await res.json();
    } catch (e) {
        console.warn('Backend inaccessible, données indisponibles.');
        clashState.participants = [];
    }

    // Génération des paires
    clashState.pairs = [];
    for (let i = 0; i < clashState.participants.length; i += 2) {
        clashState.pairs.push({
            left:  clashState.participants[i],
            right: clashState.participants[i + 1] || clashState.participants[0],
        });
    }

    clashState.currentIndex = loadPairIndex();
    clashState.voteState    = loadVoteState();

    // Références DOM
    const leftCard    = document.getElementById('photo-left');
    const rightCard   = document.getElementById('photo-right');
    const leftInput   = document.getElementById('input-left');
    const rightInput  = document.getElementById('input-right');
    const leftBubble  = document.getElementById('bubble-left');
    const rightBubble = document.getElementById('bubble-right');
    const bottomViewer    = document.getElementById('bottom-comments-viewer');
    const bottomTitle     = document.getElementById('bottom-comments-title');
    const bottomList      = document.getElementById('bottom-comments-list');
    const closeBottom     = document.getElementById('close-comments-viewer');
    const nextBtn         = document.getElementById('next-duel');

    const el = id => document.getElementById(id);

    function renderCommentThread(participant, container) {
        if (!container) return;
        container.innerHTML = '';
        if (!participant?.comments?.length) {
            const empty = document.createElement('div');
            empty.className = 'comment-empty';
            empty.textContent = 'Aucun commentaire pour le moment.';
            container.appendChild(empty);
            return;
        }
        participant.comments.slice().reverse().forEach(c => container.appendChild(createCommentItem(c)));
    }

    function renderPair(index) {
        const pair = clashState.pairs[index];
        if (!pair) return;
        const total = (pair.left.votes || 0) + (pair.right.votes || 0);

        // Images
        const setImg = (card, participant) => {
            const img = card?.querySelector('img');
            if (img) { img.src = participant.photo; img.alt = `Photo de ${participant.name}`; }
        };
        setImg(leftCard, pair.left);
        setImg(rightCard, pair.right);

        // Noms, votes, pourcentages
        renderText('name-left',     pair.left.name);
        renderText('name-right',    pair.right.name);
        renderText('vote-left',     `${pair.left.votes || 0} votes`);
        renderText('vote-right',    `${pair.right.votes || 0} votes`);
        renderText('percent-left',  `${total ? Math.round(((pair.left.votes || 0) / total) * 100) : 0}%`);
        renderText('percent-right', `${total ? Math.round(((pair.right.votes || 0) / total) * 100) : 0}%`);

        // Data attributes pour les boutons
        ['vote-left-btn', 'comment-left-btn', 'view-comments-left-btn'].forEach(id => {
            const btn = el(id); if (btn) btn.dataset.participantId = pair.left.id;
        });
        ['vote-right-btn', 'comment-right-btn', 'view-comments-right-btn'].forEach(id => {
            const btn = el(id); if (btn) btn.dataset.participantId = pair.right.id;
        });

        renderCommentThread(pair.left,  document.getElementById('comments-left'));
        renderCommentThread(pair.right, document.getElementById('comments-right'));
        updateVoteButtons(index);
    }

    function updateVoteButtons(pairIndex) {
        const selectedId = clashState.voteState[pairIndex];
        [el('vote-left-btn'), el('vote-right-btn')].filter(Boolean).forEach(btn => {
            if (selectedId) {
                btn.disabled = true;
                btn.classList.add('disabled');
                btn.textContent = btn.dataset.participantId === selectedId ? 'Voté ✓' : 'Verrouillé';
            } else {
                btn.disabled = false;
                btn.classList.remove('disabled');
                btn.textContent = 'Voter';
            }
        });
    }

    function toggleBubble(side) {
        if (side === 'left') {
            leftBubble?.classList.remove('hidden');
            rightBubble?.classList.add('hidden');
            leftInput?.focus();
        } else {
            rightBubble?.classList.remove('hidden');
            leftBubble?.classList.add('hidden');
            rightInput?.focus();
        }
    }

    function closeBubble(side) {
        (side === 'left' ? leftBubble : rightBubble)?.classList.add('hidden');
    }

    function showBottomComments(participant) {
        if (!bottomViewer || !bottomList) return;
        if (bottomTitle) bottomTitle.textContent = `Commentaires — ${participant.name}`;
        bottomList.innerHTML = '';
        if (!participant.comments?.length) {
            const empty = document.createElement('div');
            empty.className = 'comment-empty';
            empty.textContent = 'Aucun commentaire pour cette photo.';
            bottomList.appendChild(empty);
        } else {
            participant.comments.slice().reverse().forEach(c => bottomList.appendChild(createCommentItem(c)));
        }
        bottomViewer.classList.remove('hidden');
    }

    // VOTE → backend uniquement
    async function addVote(participantId) {
        if (clashState.voteState[clashState.currentIndex]) return; // déjà voté côté client

        try {
            const res = await fetch(`${API_BASE}/vote`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ participantId }),
            });
            const data = await res.json();
            if (data.success) {
                // Mise à jour locale du score après confirmation backend
                const p = clashState.participants.find(item => item.id === participantId);
                if (p) p.votes = data.votes;
                clashState.voteState[clashState.currentIndex] = participantId;
                saveVoteState(clashState.voteState);
                renderPair(clashState.currentIndex);
            }
        } catch (e) {
            console.warn('Vote non envoyé au serveur:', e);
        }
    }

    // COMMENTAIRE → backend uniquement
    async function addComment(side) {
        const btnId  = side === 'left' ? 'comment-left-btn' : 'comment-right-btn';
        const partnerId = el(btnId)?.dataset.participantId;
        const input  = side === 'left' ? leftInput : rightInput;
        const text   = input?.value.trim();
        if (!text || !partnerId) return;

        try {
            const res = await fetch(`${API_BASE}/comment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ participantId: partnerId, text }),
            });
            const data = await res.json();
            if (data.success) {
                const p = clashState.participants.find(item => item.id === partnerId);
                if (p) p.comments.push(data.comment);
                if (input) input.value = '';
                closeBubble(side);
                renderPair(clashState.currentIndex);
            }
        } catch (e) {
            console.warn('Commentaire non envoyé:', e);
        }
    }

    function goNext() {
        if (!clashState.pairs.length) return;
        const nextIndex = (clashState.currentIndex + 1) % clashState.pairs.length;
        const duelContent = document.querySelector('.duel-content');
        duelContent?.classList.add('slide-left');
        setTimeout(() => {
            clashState.currentIndex = nextIndex;
            savePairIndex(nextIndex);
            renderPair(nextIndex);
            duelContent?.classList.remove('slide-left');
            duelContent?.classList.add('slide-right');
            setTimeout(() => duelContent?.classList.remove('slide-right'), 300);
        }, 250);
    }

    if (!clashState.initialized) {
        el('vote-left-btn')?.addEventListener('click',  () => addVote(el('vote-left-btn').dataset.participantId));
        el('vote-right-btn')?.addEventListener('click', () => addVote(el('vote-right-btn').dataset.participantId));
        el('comment-left-btn')?.addEventListener('click',  () => toggleBubble('left'));
        el('comment-right-btn')?.addEventListener('click', () => toggleBubble('right'));
        el('view-comments-left-btn')?.addEventListener('click', () => {
            const pair = clashState.pairs[clashState.currentIndex];
            if (pair) showBottomComments(pair.left);
        });
        el('view-comments-right-btn')?.addEventListener('click', () => {
            const pair = clashState.pairs[clashState.currentIndex];
            if (pair) showBottomComments(pair.right);
        });
        el('submit-left')?.addEventListener('click',  () => addComment('left'));
        el('submit-right')?.addEventListener('click', () => addComment('right'));
        el('cancel-left')?.addEventListener('click',  () => closeBubble('left'));
        el('cancel-right')?.addEventListener('click', () => closeBubble('right'));
        closeBottom?.addEventListener('click', () => bottomViewer?.classList.add('hidden'));
        nextBtn?.addEventListener('click', goNext);
        el('admin-open')?.addEventListener('click', () => { window.location.href = 'admin.html'; });
        clashState.initialized = true;
    }

    renderPair(clashState.currentIndex);
}

// -----------------------------------------------------------------------
// RADIO COULOIR
// -----------------------------------------------------------------------
let radioCouloirTimer = null;
let radioCouloirIndex = 0;
let radioCouloirItems = [];

function getRadioDuration(text) {
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    return Math.max(4000, words * 500);
}

async function renderRadioCouloir() {
    const textEl    = document.getElementById('radio-couloir-text');
    const counterEl = document.getElementById('radio-couloir-counter');
    if (!textEl || !counterEl) return;

    // Chargement depuis le backend
    try {
        const res = await fetch(`${API_BASE}/radio`);
        if (res.ok) radioCouloirItems = await res.json();
    } catch (e) {
        // fallback : items vides
        radioCouloirItems = [];
    }

    if (!radioCouloirItems.length) {
        textEl.textContent = 'Aucune information disponible pour l\'instant.';
        counterEl.textContent = '0 / 0';
        return;
    }

    radioCouloirIndex = 0;
    const showItem = () => {
        const item = radioCouloirItems[radioCouloirIndex];
        if (!item) return;
        textEl.textContent    = item.text;
        counterEl.textContent = `${radioCouloirIndex + 1} / ${radioCouloirItems.length}`;
        if (radioCouloirTimer) clearTimeout(radioCouloirTimer);
        radioCouloirTimer = setTimeout(() => {
            radioCouloirIndex = (radioCouloirIndex + 1) % radioCouloirItems.length;
            showItem();
        }, getRadioDuration(item.text));
    };
    showItem();
}

// -----------------------------------------------------------------------
// PAGE CLASSEMENT
// -----------------------------------------------------------------------
async function renderClassementPage() {
    try {
        const res = await fetch(`${API_BASE}/classement`);
        if (!res.ok) throw new Error('Erreur');
        const data = await res.json();

        const topParticipant = document.getElementById('top-participant');
        const topFive        = document.getElementById('top-five');
        const leaderboard    = document.getElementById('leaderboard-list');

        if (topParticipant) {
            topParticipant.innerHTML = data.queen
                ? `<div class="queen-card">
                       <img src="${data.queen.photo}" alt="${data.queen.name}">
                       <div>
                           <h2>${data.queen.name}</h2>
                           <p class="badge">${data.queen.gender === 'F' ? 'Reine' : 'Roi'} du campus</p>
                           <p>${data.queen.votes || 0} votes</p>
                       </div>
                   </div>`
                : '<div class="comment-empty">Aucun participant.</div>';
        }

        if (topFive) {
            topFive.innerHTML = '';
            data.top.slice(0, 5).forEach((p, i) => {
                const el = document.createElement('div');
                el.className = 'top-five-item';
                el.innerHTML = `<img src="${p.photo}"><h3>${i + 1}. ${p.name}</h3><p>${p.votes || 0} votes</p>`;
                topFive.appendChild(el);
            });
        }

        if (leaderboard) {
            leaderboard.innerHTML = '';
            data.top.forEach((p, idx) => {
                const row = document.createElement('div');
                row.className = 'leader-row';
                row.innerHTML = `<div class="rank">${idx + 1}</div><img src="${p.photo}">
                    <div class="info"><strong>${p.name}</strong><div class="meta">${p.votes || 0} votes</div></div>`;
                leaderboard.appendChild(row);
            });
        }
    } catch (e) {
        console.warn('Classement inaccessible:', e);
    }
}

// -----------------------------------------------------------------------
// COMPTEUR DE VUES (UI state uniquement)
// -----------------------------------------------------------------------
function updatePageViews() {
    const viewEl = document.getElementById('view-count');
    if (!viewEl) return;
    const VIEW_KEY    = 'gbai_rai_view_count';
    const SESSION_KEY = 'gbai_rai_session_visited';
    let views = parseInt(localStorage.getItem(VIEW_KEY), 10);
    if (isNaN(views) || views < 1420) views = 1420;
    if (!sessionStorage.getItem(SESSION_KEY)) {
        views += 1;
        localStorage.setItem(VIEW_KEY, String(views));
        sessionStorage.setItem(SESSION_KEY, 'true');
    }
    viewEl.textContent = views.toLocaleString('fr-FR');
}

// -----------------------------------------------------------------------
// INITIALISATION
// -----------------------------------------------------------------------
async function initApp() {
    if (document.querySelector('.duel-content'))       await renderClashPage();
    if (document.getElementById('radio-couloir-text')) { await renderRadioCouloir(); updatePageViews(); }
    if (document.getElementById('leaderboard-list'))   await renderClassementPage();
}

document.addEventListener('DOMContentLoaded', initApp);