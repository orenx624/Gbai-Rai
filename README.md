# Gbai-Rai - Le Réseau du Campus

## Project Overview
Gbai-Rai is a campus social network experience designed for photo clashes, voting, and ranking participants based on vote power and community engagement. The application uses HTML, CSS, and JavaScript with browser `localStorage` persistence to keep votes and comments across page refreshes.

## Directory Structure
```
ENEAM_NETWORK/
├── CSS/
│   └── style.css
├── HTML/
│   ├── home.html
│   ├── clash.html
│   └── classement.html
├── JS/
│   └── a.js
└── README.md
```

## Architecture Summary

### HTML level
- `HTML/home.html`: Homepage with navigation and a featured teaser for the photo clash. The teaser redirects to `HTML/clash.html`, while the navigation also links to `HTML/classement.html`.
- `HTML/clash.html`: Clash page for photo duels. It displays two photos, vote buttons, comment inputs placed under each photo, and separate comment columns for each side.
- `HTML/classement.html`: Ranking page with a special Top 5 layout. The top participant receives a dynamic badge of either "Reine du Campus" or "Roi du Campus" depending on gender. Each row is interactive and opens a modal with detailed statistics.

### CSS level
- `CSS/style.css`: Contains global theme variables, responsive layout rules, and styling for cards, navigation, and interactive elements.
- Uses a dark campus network theme with accent colors for votes, badges, and hover interactions.
- Includes responsive grid layouts and custom slide animations for the clash navigation.
- Provides a polished modal style for detailed ranking statistics.

### JS level
- `JS/a.js`: Manages the participant data model and application logic.
- Uses a structured array of objects containing `id`, `name`, `gender`, `photo`, `votes`, and `comments`.
- Persists participant records using browser `localStorage` so votes and comments remain after refresh and page navigation.
- Includes vote arithmetic functions for incrementing votes, calculating percentages, and sorting participants by vote count.
- Provides page-specific rendering for the home page, clash page, and classement page.

## Quick Test Guide
1. Open the project in Live Server from the `ENEAM_NETWORK` folder. Use `home.html` as the entry point.
2. Check the homepage: the photo clash teaser should be clickable and redirect to `clash.html`.
3. On `clash.html`, vote for either left or right photo. After voting, the opposite photo button disables instantly and the vote count updates.
4. Add comments under each photo using the input fields and `Commenter` buttons. Verify that each comment appears in the correct column.
5. Click `Suivant` on the clash page to move to the next photo pair with animated sliding transition.
6. Go to `classement.html` from navigation. Confirm the top participant is highlighted and labeled either "Reine du Campus" or "Roi du Campus".
7. Click on any participant row on the classement page to open their detailed statistics modal. Confirm the modal shows the participant photo, total votes, win percentage, and their comment history.

## Notes
- The application is self-contained and runs fully in the browser without server-side dependencies.
- All participant data, votes, and comments are stored in `localStorage` so the state persists.
- The design is intentionally responsive for mobile and desktop users.

## Déploiement sur GitHub

1) Publier le code source sur GitHub (dépôt `main`)

```bash
cd /path/to/ENEAM_NETWORK
git init
git add .
git commit -m "Initial import: Gbai-Rai site + server"
# créer un repo vide sur GitHub et copier l'URL remote
git remote add origin https://github.com/<votre-username>/<votre-repo>.git
git branch -M main
git push -u origin main
```

2) Héberger le front-end via GitHub Pages
- Option simple : activer GitHub Pages sur `main` (ou utiliser le workflow Actions fourni) ; l'URL sera `https://<votre-username>.github.io/<votre-repo>/`.
- Vous pourrez ouvrir `HTML/home.html` (par ex. `https://.../<votre-repo>/HTML/home.html`).

3) Déployer l'API (server)
- Le dossier `server/` contient `server.js` (Express). GitHub Pages ne peut pas exécuter Node.
- Déployez `server/` sur Render, Railway, Heroku ou un VPS. Exemple Render : créez un service Web, choisissez le repo GitHub et la commande `npm start`.
- Après déploiement, mettez à jour `JS/a.js` -> `SERVER_URL` pour pointer vers l'URL publique du serveur.

Si vous voulez que je pousse le dépôt vers GitHub pour vous, fournissez un token GitHub (ou autorisez via `gh` CLI) — autrement je peux initialiser le repo local et vous fournir exactement les commandes à exécuter.
