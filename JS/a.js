// =======================================================================
// EXPÉRIENCE UTILISATEUR PUBLIC (CLASH ET VOTES) - TOUT EN LOCALSTORAGE SHARED
// =======================================================================

const STORAGE_KEY = 'gbai_rai_participants';
const CLASH_CONTENT_KEY = 'gbai_rai_clash_content';
const PAIR_INDEX_KEY = 'gbai_rai_current_pair';
const VOTE_STATE_KEY = 'gbai_rai_voted_pairs';
const RADIO_ITEMS_KEY = 'gbai_rai_radio_items';

const defaultClashContent = {
    title: 'Clash des photos',
    description: 'Vote pour ta photo préférée et laisse un commentaire sous chacune des deux équipes.',
    summaryLeftTitle: 'Comment ça marche ?',
    summaryLeftText: 'Un seul vote par duel. Le bouton de l\'autre photo se désactive automatiquement.',
    summaryRightTitle: 'Commentaires séparés',
    summaryRightText: 'Chaque photo possède sa colonne dédiée pour garder les avis distincts et clashés.'
};

const defaultRadioItems = [
    { id: 'radio-1', text: 'Un nouveau duel a été lancé au campus et tout le monde veut voter avant la fin de la journée.' },
    { id: 'radio-2', text: 'Les rumeurs les plus chaudes circulent déjà dans les couloirs, et la radio couloir les relaye en temps réel.' }
];

const defaultParticipants = [
    { id: 'p1', name: 'Amina', gender: 'F', photo: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=80', votes: 0, comments: [] },
    { id: 'p2', name: 'Moussa', gender: 'M', photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=800&q=80', votes: 0, comments: [] },
    { id: 'p3', name: 'Seydou', gender: 'M', photo: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=800&q=80', votes: 0, comments: [] },
    { id: 'p4', name: 'Rita', gender: 'F', photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=800&q=80', votes: 0, comments: [] },
    { id: 'p5', name: 'Fabrice', gender: 'M', photo: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&w=800&q=80', votes: 0, comments: [] },
    { id: 'p6', name: 'Nadia', gender: 'F', photo: 'https://images.unsplash.com/photo-1507120410856-1f35574c3b45?auto=format&fit=crop&w=800&q=80', votes: 0, comments: [] },
    { id: 'p7', name: 'David', gender: 'M', photo: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=800&q=80', votes: 0, comments: [] },
    { id: 'p8', name: 'Leila', gender: 'F', photo: 'https://images.unsplash.com/photo-1502685104226-ee32379fefbe?auto=format&fit=crop&w=800&q=80', votes: 0, comments: [] }
];

const clashState = {
    participants: [],
    pairs: [],
    currentIndex: 0,
    voteState: {},
    initialized: false
};

const SERVER_URL = 'http://localhost:3000';
let useServer = false;

function getStoredData(key, fallback) {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    try { return JSON.parse(raw); } catch { return fallback; }
}

function setStoredData(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

async function loadParticipants() {
    if (useServer) {
        try {
            const res = await fetch(`${SERVER_URL}/participants`);
            if (res.ok) return await res.json();
        } catch (e) {
            console.warn('Server unreachable, falling back to localStorage');
            useServer = false;
        }
    }
    const stored = getStoredData(STORAGE_KEY, null);
    if (Array.isArray(stored) && stored.length) return stored;
    setStoredData(STORAGE_KEY, defaultParticipants);
    return [...defaultParticipants];
}

async function saveParticipants(participants) {
    if (useServer) {
        try { await fetch(`${SERVER_URL}/sync`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ participants }) }); } catch (e) { }
    }
    setStoredData(STORAGE_KEY, participants);
}

function loadClashContent() {
    const stored = getStoredData(CLASH_CONTENT_KEY, null);
    if (stored && typeof stored === 'object') return { ...defaultClashContent, ...stored };
    return { ...defaultClashContent };
}

function loadVoteState() { return getStoredData(VOTE_STATE_KEY, {}); }
function saveVoteState(state) { setStoredData(VOTE_STATE_KEY, state); }
function loadRadioItems() {
    const stored = getStoredData(RADIO_ITEMS_KEY, null);
    if (Array.isArray(stored) && stored.length) return stored;
    setStoredData(RADIO_ITEMS_KEY, defaultRadioItems);
    return [...defaultRadioItems];
}
function saveRadioItems(items) { setStoredData(RADIO_ITEMS_KEY, items); }
function getRadioDuration(text) {
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    return Math.max(4000, words * 500);
}
function loadPairIndex() {
    const index = parseInt(localStorage.getItem(PAIR_INDEX_KEY), 10);
    return Number.isInteger(index) && index >= 0 ? index : 0;
}
function savePairIndex(index) { localStorage.setItem(PAIR_INDEX_KEY, String(index)); }

function formatTimestamp() {
    const date = new Date();
    return date.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function createCommentItem(comment) {
    const item = document.createElement('div');
    item.className = 'comment-item';
    item.innerHTML = `<p>${comment.text}</p><small>${comment.time}</small>`;
    return item;
}

function renderText(id, text) {
    const element = document.getElementById(id);
    if (element) element.textContent = text;
}

async function renderClashPage() {
    clashState.participants = loadParticipants();
    clashState.participants = await loadParticipants();
    clashState.pairs = [];
    
    for (let i = 0; i < clashState.participants.length; i += 2) {
        clashState.pairs.push({
            left: clashState.participants[i],
            right: clashState.participants[i + 1] || clashState.participants[0]
        });
    }
    
    clashState.currentIndex = loadPairIndex();
    clashState.voteState = loadVoteState();
    const clashContent = loadClashContent();

    renderText('duel-title', clashContent.title);
    renderText('duel-description', clashContent.description);
    renderText('summary-left-title', clashContent.summaryLeftTitle);
    renderText('summary-left-text', clashContent.summaryLeftText);
    renderText('summary-right-title', clashContent.summaryRightTitle);
    renderText('summary-right-text', clashContent.summaryRightText);

    const leftCard = document.getElementById('photo-left');
    const rightCard = document.getElementById('photo-right');
    const leftComments = document.getElementById('comments-left');
    const rightComments = document.getElementById('comments-right');
    const leftBubble = document.getElementById('bubble-left');
    const rightBubble = document.getElementById('bubble-right');
    const leftInput = document.getElementById('input-left');
    const rightInput = document.getElementById('input-right');
    const leftName = document.getElementById('name-left');
    const rightName = document.getElementById('name-right');
    const leftVotes = document.getElementById('vote-left');
    const rightVotes = document.getElementById('vote-right');
    const leftPercent = document.getElementById('percent-left');
    const rightPercent = document.getElementById('percent-right');
    const leftVoteBtn = document.getElementById('vote-left-btn');
    const rightVoteBtn = document.getElementById('vote-right-btn');
    const leftCommentBtn = document.getElementById('comment-left-btn');
    const rightCommentBtn = document.getElementById('comment-right-btn');
    const viewLeftBtn = document.getElementById('view-comments-left-btn');
    const viewRightBtn = document.getElementById('view-comments-right-btn');
    const submitLeft = document.getElementById('submit-left');
    const submitRight = document.getElementById('submit-right');
    const cancelLeft = document.getElementById('cancel-left');
    const cancelRight = document.getElementById('cancel-right');
    const bottomCommentsViewer = document.getElementById('bottom-comments-viewer');
    const bottomCommentsTitle = document.getElementById('bottom-comments-title');
    const bottomCommentsSubtitle = document.getElementById('bottom-comments-subtitle');
    const bottomCommentsList = document.getElementById('bottom-comments-list');
    const closeBottom = document.getElementById('close-comments-viewer');
    const nextDuelsBtn = document.getElementById('next-duel');

    function renderCommentThread(participant, container) {
        if (!container) return;
        container.innerHTML = '';
        if (!participant || !participant.comments || !participant.comments.length) {
            const empty = document.createElement('div');
            empty.className = 'comment-empty';
            empty.textContent = 'Aucun commentaire pour le moment.';
            container.appendChild(empty);
            return;
        }
        participant.comments.slice().reverse().forEach(comment => container.appendChild(createCommentItem(comment)));
    }

    function renderPair(index) {
        const pair = clashState.pairs[index];
        if (!pair) return;
        const totalVotes = pair.left.votes + pair.right.votes;

        if (leftCard) {
            const leftImage = leftCard.querySelector('img');
            if (leftImage) {
                leftImage.src = pair.left.photo;
                leftImage.alt = `Photo de ${pair.left.name}`;
            }
        }
        if (rightCard) {
            const rightImage = rightCard.querySelector('img');
            if (rightImage) {
                rightImage.src = pair.right.photo;
                rightImage.alt = `Photo de ${pair.right.name}`;
            }
        }

        if (leftName) leftName.textContent = pair.left.name;
        if (rightName) rightName.textContent = pair.right.name;
        if (leftVotes) leftVotes.textContent = `${pair.left.votes} votes`;
        if (rightVotes) rightVotes.textContent = `${pair.right.votes} votes`;
        if (leftPercent) leftPercent.textContent = `${totalVotes ? Math.round((pair.left.votes / totalVotes) * 100) : 0}%`;
        if (rightPercent) rightPercent.textContent = `${totalVotes ? Math.round((pair.right.votes / totalVotes) * 100) : 0}%`;

        if (leftVoteBtn) leftVoteBtn.dataset.participantId = pair.left.id;
        if (rightVoteBtn) rightVoteBtn.dataset.participantId = pair.right.id;
        if (leftCommentBtn) leftCommentBtn.dataset.participantId = pair.left.id;
        if (rightCommentBtn) rightCommentBtn.dataset.participantId = pair.right.id;
        if (viewLeftBtn) viewLeftBtn.dataset.participantId = pair.left.id;
        if (viewRightBtn) viewRightBtn.dataset.participantId = pair.right.id;

        renderCommentThread(pair.left, leftComments);
        renderCommentThread(pair.right, rightComments);
        updateVoteButtons(index);
    }

    function updateVoteButtons(pairIndex) {
        const selectedId = clashState.voteState[pairIndex];
        const buttons = [leftVoteBtn, rightVoteBtn].filter(Boolean);
        buttons.forEach(button => {
            if (!button) return;
            if (selectedId) {
                button.disabled = true;
                button.classList.add('disabled');
                button.textContent = button.dataset.participantId === selectedId ? 'Voté ✓' : 'Verrouillé';
            } else {
                button.disabled = false;
                button.classList.remove('disabled');
                button.textContent = 'Voter';
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
        if (side === 'left') leftBubble?.classList.add('hidden');
        else rightBubble?.classList.add('hidden');
    }

    function showBottomComments(participant) {
        if (!bottomCommentsViewer || !bottomCommentsList) return;
        bottomCommentsTitle.textContent = `Commentaires — ${participant.name}`;
        bottomCommentsSubtitle.textContent = 'Derniers avis sous la photo.';
        bottomCommentsList.innerHTML = '';
        if (!participant.comments.length) {
            const empty = document.createElement('div');
            empty.className = 'comment-empty';
            empty.textContent = 'Aucun commentaire pour cette photo.';
            bottomCommentsList.appendChild(empty);
        } else {
            participant.comments.slice().reverse().forEach(comment => bottomCommentsList.appendChild(createCommentItem(comment)));
        }
        bottomCommentsViewer.classList.remove('hidden');
    }

    function addVote(participantId) {
        if (clashState.voteState[clashState.currentIndex]) return;
        const participant = clashState.participants.find(item => item.id === participantId);
        if (!participant) return;
        participant.votes += 1;
        clashState.voteState[clashState.currentIndex] = participantId;
        saveVoteState(clashState.voteState);
        // persist to server when available
        if (useServer) {
            fetch(`${SERVER_URL}/vote`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ participantId }) }).catch(() => {
                console.warn('Vote not sent to server');
            }).then(() => renderPair(clashState.currentIndex));
        } else {
            saveParticipants(clashState.participants);
            renderPair(clashState.currentIndex);
        }
    }

    function addComment(side) {
        const partnerId = side === 'left' ? leftCommentBtn?.dataset.participantId : rightCommentBtn?.dataset.participantId;
        const input = side === 'left' ? leftInput : rightInput;
        const text = input?.value.trim();
        if (!text || !partnerId) return;
        const participant = clashState.participants.find(item => item.id === partnerId);
        if (!participant) return;
        const comment = { text, time: formatTimestamp() };
        participant.comments.push(comment);
        if (useServer) {
            fetch(`${SERVER_URL}/comment`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ participantId: partnerId, text }) })
                .catch(() => console.warn('Comment not sent to server'))
                .then(() => {
                    if (input) input.value = '';
                    closeBubble(side);
                    renderPair(clashState.currentIndex);
                });
        } else {
            saveParticipants(clashState.participants);
            if (input) input.value = '';
            closeBubble(side);
            renderPair(clashState.currentIndex);
        }
    }

    function goNext() {
        if (!clashState.pairs.length) return;
        const nextIndex = (clashState.currentIndex + 1) % clashState.pairs.length;
        document.querySelector('.duel-content')?.classList.add('slide-left');
        setTimeout(() => {
            clashState.currentIndex = nextIndex;
            savePairIndex(nextIndex);
            renderPair(nextIndex);
            document.querySelector('.duel-content')?.classList.remove('slide-left');
            document.querySelector('.duel-content')?.classList.add('slide-right');
            setTimeout(() => document.querySelector('.duel-content')?.classList.remove('slide-right'), 300);
        }, 250);
    }

    if (!clashState.initialized) {
        leftVoteBtn?.addEventListener('click', () => addVote(leftVoteBtn.dataset.participantId));
        rightVoteBtn?.addEventListener('click', () => addVote(rightVoteBtn.dataset.participantId));
        leftCommentBtn?.addEventListener('click', () => toggleBubble('left'));
        rightCommentBtn?.addEventListener('click', () => toggleBubble('right'));
        viewLeftBtn?.addEventListener('click', () => {
            const pair = clashState.pairs[clashState.currentIndex];
            if (pair) showBottomComments(pair.left);
        });
        viewRightBtn?.addEventListener('click', () => {
            const pair = clashState.pairs[clashState.currentIndex];
            if (pair) showBottomComments(pair.right);
        });
        submitLeft?.addEventListener('click', () => addComment('left'));
        submitRight?.addEventListener('click', () => addComment('right'));
        cancelLeft?.addEventListener('click', () => closeBubble('left'));
        cancelRight?.addEventListener('click', () => closeBubble('right'));
        closeBottom?.addEventListener('click', () => bottomCommentsViewer?.classList.add('hidden'));
        nextDuelsBtn?.addEventListener('click', goNext);
        
        // INTERCONNEXION MAGIQUE : Redirection directe vers la nouvelle page dédiée !
        document.getElementById('admin-open')?.addEventListener('click', () => {
            window.location.href = 'admin.html';
        });

        clashState.initialized = true;
    }

    renderPair(clashState.currentIndex);
}

let radioCouloirTimer = null;
let radioCouloirIndex = 0;
let radioCouloirItems = [];

function renderRadioCouloir() {
    const textElement = document.getElementById('radio-couloir-text');
    const counterElement = document.getElementById('radio-couloir-counter');
    if (!textElement || !counterElement) return;

    radioCouloirItems = loadRadioItems();
    if (!radioCouloirItems.length) {
        textElement.textContent = 'Aucune information disponible pour l’instant.';
        counterElement.textContent = '0 / 0';
        return;
    }

    radioCouloirIndex = 0;
    const showItem = () => {
        const item = radioCouloirItems[radioCouloirIndex];
        if (!item) return;
        textElement.textContent = item.text;
        counterElement.textContent = `${radioCouloirIndex + 1} / ${radioCouloirItems.length}`;
        if (radioCouloirTimer) clearTimeout(radioCouloirTimer);
        radioCouloirTimer = setTimeout(() => {
            radioCouloirIndex = (radioCouloirIndex + 1) % radioCouloirItems.length;
            showItem();
        }, getRadioDuration(item.text));
    };

    showItem();
}

async function renderClassementPage() {
    let data = null;
    if (useServer) {
        try {
            const res = await fetch(`${SERVER_URL}/classement`);
            if (res.ok) data = await res.json();
        } catch (e) { useServer = false; }
    }
    if (!data) {
        const parts = await loadParticipants();
        const sorted = parts.slice().sort((a,b) => (b.votes||0) - (a.votes||0));
        data = { top: sorted.slice(0,10), queen: sorted[0] || null };
    }

    const topParticipant = document.getElementById('top-participant');
    const topFive = document.getElementById('top-five');
    const leaderboardList = document.getElementById('leaderboard-list');

    if (topParticipant) {
        if (data.queen) {
            topParticipant.innerHTML = `
                <div class="queen-card">
                    <img src="${data.queen.photo}" alt="${data.queen.name}">
                    <div>
                        <h2>${data.queen.name}</h2>
                        <p class="badge">Reine du campus</p>
                        <p>${data.queen.votes || 0} votes</p>
                    </div>
                </div>
            `;
        } else topParticipant.innerHTML = '<div class="comment-empty">Aucun participant.</div>';
    }

    if (topFive) {
        topFive.innerHTML = '';
        data.top.slice(0,5).forEach((p, i) => {
            const el = document.createElement('div');
            el.className = 'top-five-item';
            el.innerHTML = `<img src="${p.photo}"><h3>${i+1}. ${p.name}</h3><p>${p.votes||0} votes</p>`;
            topFive.appendChild(el);
        });
    }

    if (leaderboardList) {
        leaderboardList.innerHTML = '';
        data.top.forEach((p, idx) => {
            const row = document.createElement('div');
            row.className = 'leader-row';
            row.innerHTML = `<div class="rank">${idx+1}</div><img src="${p.photo}"><div class="info"><strong>${p.name}</strong><div class="meta">${p.votes||0} votes</div></div>`;
            leaderboardList.appendChild(row);
        });
    }
}

function updatePageViews() {
    const viewCountElement = document.getElementById('view-count');
    if (!viewCountElement) return;

    const VIEW_COUNT_KEY = 'gbai_rai_view_count';
    const SESSION_VISITED_KEY = 'gbai_rai_session_visited';

    let views = parseInt(localStorage.getItem(VIEW_COUNT_KEY), 10);
    if (isNaN(views) || views < 1420) {
        views = 1420;
    }

    // Incrémenter le nombre réel de vues lors d'une nouvelle consultation de page
    if (!sessionStorage.getItem(SESSION_VISITED_KEY)) {
        views += 1;
        localStorage.setItem(VIEW_COUNT_KEY, String(views));
        sessionStorage.setItem(SESSION_VISITED_KEY, 'true');
    }

    viewCountElement.textContent = views.toLocaleString('fr-FR');
}

function initApp() {
    // Détecter si un serveur est disponible
    (async () => {
        try {
            const res = await fetch(`${SERVER_URL}/participants`, { method: 'GET' });
            if (res.ok) useServer = true;
        } catch (e) {
            useServer = false;
        }
        if (document.querySelector('.duel-content')) await renderClashPage();
        if (document.getElementById('radio-couloir-text')) {
            renderRadioCouloir();
            updatePageViews();
        }
        if (document.querySelector('.page-classement') || document.getElementById('leaderboard-list')) await renderClassementPage();
    })();
}

document.addEventListener('DOMContentLoaded', initApp);