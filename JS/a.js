// =======================================================================
// EXPÉRIENCE UTILISATEUR PUBLIC — Gbai-Rai
// Toute la logique de sécurité/validation est déléguée au backend.
// Ce fichier ne contient que de la présentation et des appels API.
// =======================================================================
                                                                                                                                    
let viewCount = 1420;

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
function formatTimestamp() {
    return new Date().toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function shuffleArray(items) {
    const nextItems = [...items];
    for (let index = nextItems.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [nextItems[index], nextItems[swapIndex]] = [nextItems[swapIndex], nextItems[index]];
    }
    return nextItems;
}

async function requestJson(path, options = {}) {
    const { cache = true, ...requestOptions } = options;
    return gbaiRequest(path, requestOptions, cache);
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

function buildRoundRobinPairs(participants) {
    const pairs = [];
    for (let i = 0; i < participants.length; i += 1) {
        for (let j = i + 1; j < participants.length; j += 1) {
            pairs.push({ left: participants[i], right: participants[j] });
        }
    }
    return shuffleArray(pairs);
}

// -----------------------------------------------------------------------
// PAGE CLASH
// -----------------------------------------------------------------------
async function renderClashPage(forceRefresh = false) {
    // Chargement des participants depuis le backend
    try {
        const data = await requestJson('/participants', { cache: !forceRefresh });
        clashState.participants = Array.isArray(data) ? data : (data?.participants || data?.data || []);
    } catch (e) {
        console.warn('Backend inaccessible, données indisponibles.', e);
        clashState.participants = [];
    }

    // Génération des paires Round-Robin à partir des participants du backend
    clashState.pairs = buildRoundRobinPairs(clashState.participants);

    if (clashState.pairs.length) {
        clashState.currentIndex = Math.min(clashState.currentIndex, clashState.pairs.length - 1);
    } else {
        clashState.currentIndex = 0;
    }
    clashState.voteState = {};

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
        if (clashState.voteState[clashState.currentIndex]) return;

        try {
            const data = await requestJson('/votes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ participantId }),
            });
            if (data?.success !== false) {
                const p = clashState.participants.find(item => item.id === participantId);
                if (p) p.votes = (p.votes || 0) + 1;
                clashState.voteState[clashState.currentIndex] = participantId;
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
            const data = await requestJson('/comments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ participantId: partnerId, text }),
            });
            if (data?.success) {
                const p = clashState.participants.find(item => item.id === partnerId);
                if (p) p.comments = Array.isArray(p.comments) ? [...p.comments, data.comment] : [data.comment];
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
        clashState.currentIndex = nextIndex;
        renderPair(nextIndex);
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
        // admin button handled globally via setupAdminButtons()
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

async function renderRadioCouloir(forceRefresh = false) {
    const textEl    = document.getElementById('radio-couloir-text');
    const counterEl = document.getElementById('radio-couloir-counter');
    if (!textEl || !counterEl) return;

    // Chargement depuis le backend
    try {
        const data = await requestJson('/radio', { cache: !forceRefresh });
        const items = Array.isArray(data) ? data : (data?.items || data?.radioItems || data?.radio?.items || data?.data || []);
        radioCouloirItems = Array.isArray(items) ? items : [];
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
async function renderClassementPage(forceRefresh = false) {
    try {
        let data = await requestJson('/classement', { cache: !forceRefresh });
        if (!data || (!data.top && !data.queen && !data.participants && !data.data)) {
            const participantsData = await requestJson('/participants', { cache: !forceRefresh });
            const participants = Array.isArray(participantsData) ? participantsData : (participantsData?.participants || participantsData?.data || []);
            const top = [...participants].sort((a, b) => (b.votes || 0) - (a.votes || 0));
            data = { queen: top[0] || null, top, participants: top };
        }

        const topParticipant = document.getElementById('top-participant');
        const topFive        = document.getElementById('top-five');
        const leaderboard    = document.getElementById('leaderboard-list');
        const ranking = Array.isArray(data?.top) ? data.top : (Array.isArray(data?.participants) ? data.participants : (Array.isArray(data?.data) ? data.data : []));
        const queen = data?.queen || ranking[0] || null;

        if (topParticipant) {
            topParticipant.innerHTML = queen
                ? `<div class="queen-card">
                       <img src="${queen.photo}" alt="${queen.name}">
                       <div>
                           <h2>${queen.name}</h2>
                           <p class="badge">${queen.gender === 'F' ? 'Reine' : 'Roi'} du campus</p>
                           <p>${queen.votes || 0} votes</p>
                       </div>
                   </div>`
                : '<div class="comment-empty">Aucun participant.</div>';
        }

        if (topFive) {
            topFive.innerHTML = '';
            ranking.slice(0, 5).forEach((p, i) => {
                const el = document.createElement('div');
                el.className = 'top-five-item';
                el.innerHTML = `<img src="${p.photo}"><h3>${i + 1}. ${p.name}</h3><p>${p.votes || 0} votes</p>`;
                topFive.appendChild(el);
            });
        }

        if (leaderboard) {
            leaderboard.innerHTML = '';
            ranking.forEach((p, idx) => {
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
    viewCount = Math.max(viewCount, 1420);
    viewCount += 1;
    viewEl.textContent = viewCount.toLocaleString('fr-FR');
}

// -----------------------------------------------------------------------
// INITIALISATION
// -----------------------------------------------------------------------
function updateAdminButtons() {
    const isActive = localStorage.getItem('admin_session') === 'active';
    const loginBtn = document.getElementById('admin-login');
    const logoutBtn = document.getElementById('admin-logout');
    if (isActive) {
        loginBtn?.classList.add('hidden');
        logoutBtn?.classList.remove('hidden');
    } else {
        loginBtn?.classList.remove('hidden');
        logoutBtn?.classList.add('hidden');
    }
}

function setupAdminButtons() {
    updateAdminButtons();
    const loginBtn = document.getElementById('admin-login');
    const logoutBtn = document.getElementById('admin-logout');
    loginBtn?.addEventListener('click', () => { window.location.href = 'admin.html'; });
    logoutBtn?.addEventListener('click', () => {
        localStorage.removeItem('admin_session');
        updateAdminButtons();
        location.reload();
    });
}
function initRadioCouloir() {
    const radioTextEl = document.getElementById('radio-couloir-text');
    if (!radioTextEl) return;

    renderRadioCouloir();
    updatePageViews();
}

async function initApp() {
    setupAdminButtons();
    if (document.body.classList.contains('page-home')) {
        void gbaiPrefetch(['/participants', '/radio', '/classement', '/gazette']);
    }
    if (document.querySelector('.duel-content'))       await renderClashPage();
    if (document.getElementById('radio-couloir-text')) await initRadioCouloir();
    if (document.getElementById('leaderboard-list'))   await renderClassementPage();

    if (document.querySelector('.duel-content')) gbaiStartPolling(() => renderClashPage(true));
    if (document.getElementById('radio-couloir-text')) gbaiStartPolling(() => renderRadioCouloir(true));
    if (document.getElementById('leaderboard-list')) gbaiStartPolling(() => renderClassementPage(true));
}

document.addEventListener('DOMContentLoaded', initApp);