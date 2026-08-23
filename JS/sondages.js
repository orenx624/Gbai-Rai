const API_URL = 'https://gbai-rai-backend.vercel.app/api/sondages';

let currentSondage = null;

document.addEventListener('DOMContentLoaded', () => {
    fetchActivePoll();

    const submitBtn = document.getElementById('submit-poll-btn');
    if (submitBtn) {
        submitBtn.addEventListener('click', handleProposeSondage);
    }
});

// 1. Récupération des sondages depuis le backend
async function fetchActivePoll() {
    const pollContainer = document.getElementById('active-poll-container');
    try {
        const response = await fetch(API_URL);
        const result = await response.json();

        if (result.success && result.data && result.data.length > 0) {
            // Prends le sondage le plus récent
            currentSondage = result.data[0];
            renderPoll(currentSondage);
        } else {
            pollContainer.innerHTML = `
                <div style="padding: 20px; text-align: center;">
                    <h3>📊 Aucun sondage actif pour le moment.</h3>
                    <p>Revenez plus tard ou proposez-en un ci-dessous !</p>
                </div>
            `;
        }
    } catch (error) {
        console.error("Erreur lors de la récupération du sondage :", error);
        pollContainer.innerHTML = `
            <div style="padding: 20px; text-align: center; color: #ff4d4d;">
                <p>Impossible de charger le sondage. Vérifiez votre connexion.</p>
            </div>
        `;
    }
}

// 2. Affichage dynamique du sondage dans le DOM
function renderPoll(sondage) {
    const questionEl = document.getElementById('poll-question');
    const optionsContainer = document.getElementById('poll-options-container');
    const votesCountEl = document.getElementById('poll-votes-count');

    questionEl.textContent = sondage.question;

    // Calcul du nombre total de votes
    const totalVotes = sondage.options.reduce((acc, opt) => acc + (opt.votes || 0), 0);
    votesCountEl.textContent = `🗳️ ${totalVotes} vote${totalVotes > 1 ? 's' : ''} enregistré${totalVotes > 1 ? 's' : ''}`;

    // Vérifier si l'utilisateur a déjà voté pour ce sondage
    const votedOptionIndex = localStorage.getItem(`voted_sondage_${sondage.id}`);

    optionsContainer.innerHTML = '';

    sondage.options.forEach((option, index) => {
        const votes = option.votes || 0;
        const percent = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
        
        const isVoted = votedOptionIndex !== null && parseInt(votedOptionIndex) === index;

        const optionDiv = document.createElement('div');
        optionDiv.className = `poll-option-btn ${isVoted ? 'voted' : ''}`;
        optionDiv.dataset.index = index;

        optionDiv.innerHTML = `
            <div class="option-fill" style="width: ${percent}%;"></div>
            <span class="option-label">${option.text}</span>
            <span class="option-percent">${percent}%</span>
        `;

        // Désactiver les clics si déjà voté
        if (votedOptionIndex === null) {
            optionDiv.style.cursor = 'pointer';
            optionDiv.addEventListener('click', () => submitVote(sondage.id, index));
        } else {
            optionDiv.style.cursor = 'default';
        }

        optionsContainer.appendChild(optionDiv);
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
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ optionIndex })
        });

        const result = await response.json();

        if (result.success) {
            // Enregistrer le vote en local pour éviter les votes multiples
            localStorage.setItem(`voted_sondage_${sondageId}`, optionIndex);
            
            // Recharger le sondage pour mettre à jour les pourcentages
            fetchActivePoll();
        } else {
            alert("Erreur lors de l'enregistrement du vote : " + result.message);
        }
    } catch (error) {
        console.error("Erreur vote :", error);
    }
}

// 4. Proposition d'un sondage par un utilisateur
async function handleProposeSondage() {
    const input = document.getElementById('new-poll-input');
    const questionText = input.value.trim();

    if (!questionText) {
        alert("Veuillez saisir une question avant d'envoyer.");
        return;
    }

    try {
        // Envoi avec des options par défaut (Oui / Non)
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                question: questionText,
                options: ["D'accord", "Pas d'accord"]
            })
        });

        const result = await response.json();

        if (result.success) {
            alert("Votre idée de sondage a été soumise avec succès !");
            input.value = '';
            fetchActivePoll();
        } else {
            alert("Erreur : " + result.message);
        }
    } catch (error) {
        console.error("Erreur proposition sondage :", error);
    }
}
