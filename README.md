# 10 Min To Fight

Appli mobile (Expo / React Native) qui génère chaque jour un entraînement de ~10 minutes,
sans équipement : 10 exercices de 45 secondes avec 15 secondes de récupération, mêlant
cardio, musculation (haut du corps), étirements (jambes / bas du dos) et techniques d'arts
martiaux (boxe, muay thaï, kung fu, krav maga, jujitsu brésilien).

Une notification locale propose un nouvel entraînement tous les matins à 7h.

## Structure du repo

```
10MinToFight/
├── server/           Backend Node/TypeScript : génère l'entraînement du jour et sert les visuels d'exercice
├── app/              Application mobile Expo/React Native (TypeScript)
└── youtube-summary/  Web app indépendante : résumé + fiabilité + chat IA sur une vidéo YouTube
    ├── server/       Backend Node/TypeScript (transcript, résumé, fiabilité, chat)
    └── web/          Frontend Vite/React (TypeScript)
```

## Comment ça fonctionne

### Génération de l'entraînement (`server/`)

- Une bibliothèque de ~44 exercices sans équipement est définie dans
  `server/src/data/exercises.ts`, répartie en 4 catégories avec un quota fixe par
  entraînement (3 cardio, 3 muscu haut du corps, 2 étirements, 2 arts martiaux).
- Si une clé `ANTHROPIC_API_KEY` est configurée, le serveur demande à Claude de choisir les
  10 exercices du jour (en respectant les quotas et en variant par rapport à l'historique
  récent de l'appareil).
- Sinon (ou si l'appel échoue), un générateur local déterministe prend le relais : il choisit
  les exercices avec les mêmes règles, sans dépendre d'aucune API.
- L'historique par appareil (`server/data/history/<deviceId>.json`) sert à éviter de répéter
  les mêmes exercices d'un jour à l'autre et à faire tourner les disciplines d'arts martiaux.

### Visuels d'exercice

- `GET /api/exercises/:slug/image` sert l'illustration en cache si l'exercice a déjà été
  illustré (fichier dans `server/data/images/`), sinon la génère via l'API d'images d'OpenAI
  (si `OPENAI_API_KEY` est configurée) puis la met en cache pour toutes les prochaines fois
  que cet exercice apparaît dans un entraînement.
- Sans clé configurée, l'endpoint répond 404 et l'application affiche une icône de catégorie
  à la place.

### Application mobile (`app/`)

- Écran d'accueil : liste des 10 exercices du jour, bouton "Démarrer".
- Écran d'entraînement : pour chaque exercice, nom, description détaillée ("comment bien le
  faire"), visuel, minuteur de 45s / 15s qui sonne au début et à la fin de chaque exercice
  (fichiers sons synthétisés localement, voir `app/scripts/generate-sounds.js`).
- Écran de récapitulatif en fin d'entraînement.
- Notification locale quotidienne à 7h (`expo-notifications`), programmée au premier lancement.
- Résilience réseau : l'entraînement du jour est mis en cache localement (AsyncStorage) ; si le
  serveur est injoignable et qu'aucun cache n'existe encore, une routine de secours fixe est
  utilisée pour ne jamais bloquer l'utilisateur.

## Lancer le backend

```bash
cd server
cp .env.example .env   # renseigner les clés API optionnelles
npm install
npm run dev             # serveur de dev avec rechargement automatique
# ou : npm run build && npm start
```

Sans aucune clé API renseignée, le serveur fonctionne déjà complètement (génération locale +
icônes de catégorie à la place des visuels).

## Lancer l'application mobile

```bash
cd app
npm install
npx expo start
```

Scannez le QR code avec l'app Expo Go (Android/iOS), ou lancez un simulateur (`npx expo start --ios` / `--android`).

Par défaut, l'app appelle le backend sur `http://localhost:3000`. Pour tester sur un téléphone
physique ou pointer vers un backend déployé, changez `expo.extra.apiBaseUrl` dans `app/app.json`
(ou définissez la variable d'env `EXPO_PUBLIC_API_BASE_URL`).

## Web app : résumé YouTube + fiabilité + chat IA (`youtube-summary/`)

Application web indépendante de l'app mobile ci-dessus. On colle un lien YouTube, elle :

1. Extrait l'ID de la vidéo et récupère ses sous-titres (`youtube-transcript`, sans clé API —
   fonctionne avec les sous-titres auto-générés ou manuels, en français si disponibles).
2. Envoie le transcript à Claude pour générer un résumé en points clés, une liste des
   affirmations les plus notables, et une **note de fiabilité heuristique** (1 à 5) basée
   uniquement sur des indices textuels : présence de sources citées, ton mesuré vs
   sensationnaliste, distinction faits/opinions. Cette note n'est **pas** une vérification
   factuelle indépendante — l'app le rappelle explicitement à l'écran (l'IA n'a pas accès à
   internet pour vérifier les faits avancés dans la vidéo).
3. Ouvre un chat pour poser des questions sur le contenu de la vidéo ; les réponses sont
   contraintes au transcript (le modèle est instruit à dire "je ne sais pas" plutôt qu'inventer).

### Lancer le backend (`youtube-summary/server/`)

```bash
cd youtube-summary/server
cp .env.example .env   # renseigner ANTHROPIC_API_KEY (requis)
npm install
npm run dev             # http://localhost:3001
```

Sans `ANTHROPIC_API_KEY`, `/api/analyze` et `/api/chat` répondent 503 (la récupération du
transcript, elle, ne nécessite aucune clé).

### Lancer le frontend (`youtube-summary/web/`)

```bash
cd youtube-summary/web
npm install
npm run dev             # http://localhost:5173, proxy /api vers localhost:3001 en dev
```

Pour un déploiement où frontend et backend sont sur des origines différentes, définir
`VITE_API_BASE_URL` (voir `youtube-summary/web/.env.example`) à l'URL du backend déployé.

### Limites connues de ce module

- Les sessions d'analyse (transcript + historique de chat) sont stockées **en mémoire** côté
  serveur (expiration après 4h) — à remplacer par un store persistant pour un déploiement
  multi-instances.
- La récupération du transcript dépend du scraping public de YouTube (`youtube-transcript`) :
  aucune clé API requise, mais peut échouer si YouTube modifie sa page, si les sous-titres sont
  désactivés, ou si la vidéo est privée/restreinte — l'app affiche alors un message d'erreur clair.
- Testé dans cet environnement via `tsc` (typecheck) et build de production (`vite build`) sur les
  deux paquets, ainsi qu'un test visuel du flux complet (formulaire → résumé → fiabilité → chat)
  avec des réponses API simulées : le bac à sable de développement utilisé ici bloque les accès
  réseau sortants vers youtube.com, donc le flux réel bout-en-bout (vraie vidéo, vrai appel Claude)
  n'a pas pu être vérifié depuis cet environnement — à tester avec une vraie clé Anthropic et un
  accès réseau non restreint avant mise en production.

## Limites connues / suites possibles

- Testé dans cet environnement via typecheck (`tsc --noEmit`) et export Metro (`expo export
  --platform ios`), qui compilent et bundlent sans erreur ; il n'a pas été possible de lancer un
  simulateur iOS/Android réel ici pour valider visuellement l'UI — à vérifier avec Expo Go ou un
  simulateur avant mise en production.
- La génération d'images (OpenAI) et la génération de l'entraînement par LLM (Claude) sont
  optionnelles : sans clés, l'app reste pleinement fonctionnelle grâce aux générateurs locaux.
- Pour une notification 7h fiable même après redémarrage du téléphone, l'utilisateur doit avoir
  lancé l'app au moins une fois pour accorder la permission de notification (demandée
  automatiquement au premier lancement).
- Le backend stocke l'historique par appareil dans de simples fichiers JSON (`server/data/`) —
  suffisant pour un usage mono-serveur, mais à remplacer par une vraie base de données en cas de
  déploiement multi-instances.
