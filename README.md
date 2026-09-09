# 10 Min To Fight

Génère chaque jour un entraînement intensif de 10 minutes, sans équipement : 10 exercices d'une
minute (50s d'effort intense + 10s de récup), mêlant endurance, muscu, souplesse et combat.

## Structure du repo

```
10MinToFight/
├── web/      Version actuelle : page HTML/JS autonome, aucun serveur, aucune IA
├── server/   Ancien prototype : backend Node/TypeScript (génération LLM)
└── app/      Ancien prototype : appli mobile Expo/React Native
```

`server/` et `app/` sont un premier prototype (génération par LLM + notifications natives)
conservé pour référence, mais nécessitait un backend hébergé et un build mobile — voir plus bas.
**`web/` est la version à utiliser aujourd'hui** : une seule page HTML qui tourne entièrement dans
le navigateur, sans rien à déployer ni à builder.

## `web/` — la version HTML autonome

Aucun serveur, aucune clé API, aucune IA : tout tourne côté navigateur.

### Utilisation

Ouvrez `web/index.html` dans un navigateur (double-clic, ou servez le dossier avec n'importe quel
serveur statique). Sur téléphone, le plus simple est d'héberger `web/` gratuitement (GitHub Pages,
Netlify, Vercel...) et d'ajouter la page à l'écran d'accueil pour un rendu plein écran façon appli.

### Comment ça fonctionne

- **Bibliothèque d'exercices** (`web/exercises.js`) : ~50 exercices sans équipement répartis en 4
  disciplines — endurance 🌬️ (bleu), muscu 💪 (rouge), souplesse 🧘‍♂️ (vert), combat 👊 (noir).
- **Entraînement du jour** : généré par un algorithme local (seedé sur la date), toujours 10
  exercices avec les 4 disciplines représentées, mélangées. Stable toute la journée (mis en cache
  dans `localStorage`), différent le lendemain. Un historique local (7 derniers jours) évite de
  répéter trop souvent les mêmes exercices.
- **Minuteur** : chaque exercice dure 1 minute pile — 50s d'effort intense puis 10s de récup avec
  annonce vocale du prochain exercice (Web Speech API). Bips synthétisés (Web Audio API, aucun
  fichier audio) : un bip par seconde durant les 5 dernières secondes de l'effort (prévient
  l'arrivée de la récup) et durant les 3 dernières secondes de la récup (prévient le prochain
  effort), avec un bip plus aigu sur la toute dernière seconde de chaque compte à rebours.
- **Pastilles de catégorie** : chaque exercice affiche sa discipline (rouge/bleu/noir/vert +
  emoji) sur l'écran d'accueil et pendant l'entraînement.

### Limites connues

- Testé avec Playwright (Chromium headless) dans cet environnement : génération du jour (10
  exercices, 4 catégories représentées, stable au rechargement), décompte des bips, transitions de
  phase et annonces vocales vérifiés programmatiquement. Pas de test sur un vrai téléphone iOS/
  Android — à faire avant usage quotidien, en particulier la synthèse vocale et l'audio qui
  nécessitent un premier tap utilisateur pour se débloquer sur iOS Safari (déjà géré : le bouton
  "Démarrer" déclenche ce déblocage).
- Pas de notification quotidienne (contrairement à l'ancien prototype `app/`) : une page web seule
  ne peut pas réveiller le téléphone à 7h. Pense à te faire un rappel de ton côté, ou demande-moi
  d'explorer les notifications push web (PWA) si tu veux cette fonctionnalité plus tard.
- « Sans IA » pour l'instant : l'algorithme de sélection est déterministe. La structure du code
  (une fonction `generateWorkout(date)` isolée dans `web/app.js`) est prête à être remplacée par un
  appel LLM plus tard si besoin.

---

## Ancien prototype : appli mobile Expo + backend

Ce qui suit décrit `server/` et `app/`, la version précédente (génération par LLM, notifications
natives, build mobile via EAS). Conservé pour référence.

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

### Application mobile (`app/`)

- Écran d'accueil : liste des 10 exercices du jour, bouton "Démarrer".
- Écran d'entraînement : pour chaque exercice, nom, description détaillée ("comment bien le
  faire"), icône de catégorie, minuteur de 45s / 15s qui sonne au début et à la fin de chaque
  exercice (fichiers sons synthétisés localement, voir `app/scripts/generate-sounds.js`).
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

Sans clé API renseignée, le serveur fonctionne déjà complètement en mode génération locale.

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
- La génération de l'entraînement par LLM (Claude) est optionnelle : sans clé, l'app reste
  pleinement fonctionnelle grâce au générateur local.
- Pour une notification 7h fiable même après redémarrage du téléphone, l'utilisateur doit avoir
  lancé l'app au moins une fois pour accorder la permission de notification (demandée
  automatiquement au premier lancement).
- Le backend stocke l'historique par appareil dans de simples fichiers JSON (`server/data/`) —
  suffisant pour un usage mono-serveur, mais à remplacer par une vraie base de données en cas de
  déploiement multi-instances.
