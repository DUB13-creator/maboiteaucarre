# Source du site Ma boîte au carré

Le site publié est `index.html` à la racine du dépôt (fichier généré). Ce dossier `source/` contient de quoi le reconstruire.

- `react/src/App.jsx` : tout le contenu et le comportement (sections, diagnostic, formulaire, mentions légales, politique de confidentialité)
- `react/extra.css` : styles (l'ordre des règles compte, ajouter à la fin)
- `react/build.py` : assemble le tout en un seul `index.html` (esbuild, GSAP, polices et logos intégrés)
- `react/deploy.sh` : ajoute doctype et viewport et copie le résultat à la racine du dépôt
- `react/test.js`, `leg.js`, `dlg.js`, `aud.js` : tests Playwright
- Formulaire : Web3Forms (clé publique `FORM_KEY` dans `App.jsx`) ; `rdv.html` génère le fichier agenda (.ics)
- Quand le domaine maboiteaucarre.pro sera branché : changer `SITE_URL` dans `App.jsx`, ajouter un fichier `CNAME`

Dépendance : `/opt/npm-tools/node_modules/esbuild` dans l'environnement Claude (ou tout esbuild installé), chemins du build à adapter.
