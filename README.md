# 10 Min To Fight

Appli mobile (Expo / React Native) qui génère chaque jour un entraînement de ~10 minutes,
sans équipement : 10 exercices de 45 secondes avec 15 secondes de récupération, mêlant
cardio, musculation (haut du corps), étirements (jambes / bas du dos) et techniques d'arts
martiaux (boxe, muay thaï, kung fu, krav maga, jujitsu brésilien).

Une notification locale propose un nouvel entraînement tous les matins à 7h.

## Structure du repo

```
10MinToFight/
├── server/   Backend Node/TypeScript : génère l'entraînement du jour et sert les visuels d'exercice
└── app/      Application mobile Expo/React Native (TypeScript)
```

## Comment ça fonctionne

### Génération de l'entraînement (`server/`)

- Une bibliothèque de ~44 exercices sans équipement est définie dans
  `server/src/data/exercises.ts`, répartie en 4 catégories avec un quota fixe par
  entraînement (3 cardio, 3 muscu haut du corps, 2 étirements, 2 arts martiaux).
- Si une clé `LLM_API_KEY` est configurée, le serveur demande à un LLM (par défaut via l'API
  compatible OpenAI de [Mammouth AI](https://mammouth.ai), configurable via `LLM_BASE_URL` /
  `LLM_MODEL`) de choisir les 10 exercices du jour, en respectant les quotas et en variant par
  rapport à l'historique récent de l'appareil.
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

## Déploiement du backend et notification 7h

Pour ne jamais avoir à lancer le serveur en local, déployez-le une fois sur un hébergeur
(Render, Railway, Fly.io...) et pointez `apiBaseUrl` vers son URL publique.

Les hébergeurs gratuits mettent souvent le service en veille après une période d'inactivité
(ex. ~15 min sur Render), ce qui provoque un temps de démarrage de 30-50s au réveil. La
notification quotidienne à 7h est programmée par l'OS du téléphone, indépendamment du serveur :
elle s'affiche à l'heure même si le backend dort, et c'est seulement à l'ouverture de l'app que
la requête part. Choix assumé ici : plutôt que de bricoler un ping externe pour maintenir le
serveur éveillé (coûteux en quota gratuit, pas fiable à 100%), l'app affiche simplement un message
d'attente et patiente jusqu'à 60s le temps que le serveur se réveille — acceptable pour un usage
1x/jour. Si ce délai occasionnel dérange, les alternatives sont un hébergeur avec une offre
"toujours actif" sans mise en veille (ex. Fly.io) ou un petit forfait payant (~5-7€/mois).

## Limites connues / suites possibles

- Testé dans cet environnement via typecheck (`tsc --noEmit`) et export Metro (`expo export
  --platform ios`), qui compilent et bundlent sans erreur ; il n'a pas été possible de lancer un
  simulateur iOS/Android réel ici pour valider visuellement l'UI — à vérifier avec Expo Go ou un
  simulateur avant mise en production.
- La génération d'images (OpenAI) et la génération de l'entraînement par LLM (Mammouth AI ou tout
  autre endpoint compatible OpenAI) sont optionnelles : sans clés, l'app reste pleinement
  fonctionnelle grâce aux générateurs locaux.
- Pour une notification 7h fiable même après redémarrage du téléphone, l'utilisateur doit avoir
  lancé l'app au moins une fois pour accorder la permission de notification (demandée
  automatiquement au premier lancement).
- Le backend stocke l'historique par appareil dans de simples fichiers JSON (`server/data/`) —
  suffisant pour un usage mono-serveur, mais à remplacer par une vraie base de données en cas de
  déploiement multi-instances.
