const API_URL = 'https://gbai-rai-backend.vercel.app/api/sondages';

document.addEventListener('DOMContentLoaded', () => {
    fetchAllPolls();

    const submitBtn = document.getElementById('submit-poll-btn');
    if (submitBtn) {
        submitBtn.addEventListener('click', handleProposeSondage);
    }
});

// Formater la date/heure de création
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// 1. Récupération et affichage de TOUS les sondages
async function fetchAllPolls() {
    const listContainer = document.getElementById('polls-list-container');
    if (!listContainer) return;

    try {
        const response = await fetch(API_URL);
        const result = await response.json();

        if (result.success && result.data && result.data.length > 0) {
            renderPollsList(result.data);
        } else {
            listContainer.innerHTML = `
                <div style="padding: 20px; text-align: center; background: rgba(255,255,255,0.05); border-radius: 12px;">
                    <h3>📊 Aucun sondage actif pour le moment.</h3>
                    <p>Soyez le premier à en proposer un ci-dessus !</p>
                </div>
            `;
        }
    } catch (error) {
        console.error("Erreur lors de la récupération des sondages :", error);
        listContainer.innerHTML = `
            <div style="padding: 20px; text-align: center; color: #ff4d4d;">
                <p>Impossible de charger les sondages. Vérifiez votre connexion.</p>
            </div>
        `;
    }
}

// 2. Génération de la liste des cartes de sondage
function renderPollsList(sondages) {
    const listContainer = document.getElementById('polls-list-container');
    listContainer.innerHTML = '';

    sondages.forEach(sondage => {
        const pollCard = document.createElement('div');
        pollCard.className = 'poll-card';
        pollCard.style.marginBottom = '2rem';

        const totalVotes = (sondage.options || []).reduce((acc, opt) => acc + (opt.votes || 0), 0);
        const votedOptionIndex = localStorage.getItem(`voted_sondage_${sondage.id}`);
        const dateFormatted = formatDate(sondage.createdAt);

        let optionsHTML = '';
        (sondage.options || []).forEach((option, index) => {
            const votes = option.votes || 0;
            const percent = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
            const isVoted = votedOptionIndex !== null && parseInt(votedOptionIndex) === index;

            optionsHTML += `
                <div class="poll-option-btn ${isVoted ? 'voted' : ''}" 
                     data-sondage-id="${sondage.id}" 
                     data-index="${index}"
                     style="cursor: ${votedOptionIndex === null ? 'pointer' : 'default'}">
                    <div class="option-fill" style="width: ${percent}%;"></div>
                    <span class="option-label">${option.text}</span>
                    <span class="option-percent">${percent}%</span>
                </div>
            `;
        });

        pollCard.innerHTML = `
            <div class="poll-header" style="display: flex; justify-content: space-between; align-items: center;">
                <span class="badge badge-live">En cours</span>
                <span class="poll-timer" style="font-size: 0.85rem; opacity: 0.8;">🕒 ${dateFormatted}</span>
            </div>
            <h3 class="poll-question" style="margin: 15px 0;">${sondage.question}</h3>
            <div class="poll-options">
                ${optionsHTML}
            </div>
            <div class="poll-footer" style="margin-top: 15px; font-weight: bold;">
                <span>🗳️ ${totalVotes} vote${totalVotes > 1 ? 's' : ''} enregistré${totalVotes > 1 ? 's' : ''}</span>
            </div>
        `;

        listContainer.appendChild(pollCard);
    });

    // Attachement des événements de clic aux options
    document.querySelectorAll('.poll-option-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const sondageId = btn.dataset.sondageId;
            const optionIndex = parseInt(btn.dataset.index);
            if (sondageId && !isNaN(optionIndex)) {
                submitVote(sondageId, optionIndex);
            }
        });
    });
}

// 3. Soumission d'un vote
async function submitVote(sondageId, optionIndex) {
    if (localStorage.getItem(`voted_sondage_${sondageId}`) !== null) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/${sondageId}/vote`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ optionIndex })
        });

        const result = await response.json();

        if (result.success) {
            localStorage.setItem(`voted_sondage_${sondageId}`, optionIndex);
            fetchAllPolls();
        } else {
            alert("Erreur lors de l'enregistrement du vote : " + result.message);
        }
    } catch (error) {
        console.error("Erreur vote :", error);
    }
}

// 4. Envoi de la proposition à l'admin
async function handleProposeSondage() {
    const input = document.getElementById('new-poll-input');
    const questionText = input.value.trim();

    if (!questionText) {
        alert("Veuillez saisir une question avant d'envoyer.");
        return;
    }

    try {
        const response = await fetch('https://gbai-rai-backend.vercel.app/api/sondages/proposer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question: questionText })
        });

        const result = await response.json();

        if (result.success) {
            alert("Votre proposition a été transmise avec succès à l'administrateur !");
            input.value = '';
        } else {
            alert("Erreur : " + result.message);
        }
    } catch (error) {
        console.error("Erreur proposition sondage :", error);
    }
}
