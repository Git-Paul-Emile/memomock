# MemoAI Assistant

Plateforme d'aide à la rédaction et à l'encadrement de mémoires académiques décrite dans le
mémo de cadrage. Le dépôt contient deux projets :

- **Frontend** (`frontend/`) - Next.js / React, tous les écrans étudiant/encadrant/admin.
- **Backend** (`backend/`) - API REST Node.js/Express + Prisma/PostgreSQL.

## Stack technique

- **Next.js 16** (App Router, React 19, TypeScript strict)
- **Tailwind CSS v4** + composants **shadcn/ui** faits main (Radix UI + class-variance-authority)
- **react-hook-form + zod** pour la validation de formulaires
- **recharts** pour les graphiques du tableau de bord de supervision
- **sonner** pour les notifications toast
- **Backend** : Node.js/Express, **Prisma** + **PostgreSQL** (données académiques).

## Démarrage rapide

### 1. Backend (API + base de données)

```bash
cd backend
npm install
```

Éditez `backend/.env` et renseignez `DATABASE_URL` avec votre chaîne de connexion
PostgreSQL, puis :

```bash
npm run prisma:generate
npm run prisma:migrate
npm run seed
```

### 2. Frontend

```bash
cd frontend
npm install
```

### 3. Lancer les deux ensemble

Il n'y a pas de commande unique à la racine : ouvrez deux terminaux, un par projet.

```bash
# Terminal 1
cd backend
npm run dev      # API sur :4000

# Terminal 2
cd frontend
npm run dev      # Frontend sur :3000
```

## Authentification (mock)

- **E-mail / mot de passe** : inscription et connexion via l'API json-server mock
  (`POST /users`, `GET /users?email=...`), voir `frontend/src/context/auth-context.tsx`.
- **Afficher/masquer le mot de passe** sur tous les champs de saisie (`components/ui/password-input.tsx`).
- **Mot de passe oublié** : en mode mock, met à jour directement le mot de passe dans `data.json`
  et renvoie un succès.
- **Téléphone obligatoire, non vérifié** : le numéro est collecté à l'inscription (champ requis)
  mais il n'y a pas de vérification par code OTP.
- **Sessions actives** : chaque connexion génère un identifiant de session stocké en localStorage,
  visible dans `/parametres` avec possibilité de révoquer les autres sessions.

## Stockage des fichiers et notifications

- **Documents et avatars sur Cloudinary** : la soumission d'un mémoire (`POST
  /api/documents/upload`) et le changement de photo de profil (`POST /api/users/avatar`)
  envoient directement le fichier vers Cloudinary (dossiers `documents/{etudiantId}/...` et
  `avatars/{userId}`), plutôt que de le stocker sur le disque du serveur - voir
  `backend/src/lib/cloudinary.js`.
- **Canal de notification préféré** : chaque utilisateur choisit dans `/parametres` s'il
  reçoit ses notifications par e-mail (par défaut, via Resend) ou uniquement dans l'application.
  Le canal WhatsApp a été retiré. Chaque notification créée est automatiquement relayée vers ce
  canal (voir `backend/src/lib/notifications/canaux`, appelé à la fois par la route HTTP et par
  le worker d'analyse asynchrone).
- **Pipeline d'analyse asynchrone** : la soumission d'un document (`POST
  /api/documents/upload`) publie un job sur une file BullMQ (Redis) plutôt que de générer les
  analyses de forme/fond de façon bloquante - un worker les traite en arrière-plan et
  notifie l'étudiant une fois terminé (voir `backend/src/lib/queue.js` et
  `backend/src/workers/analyse.worker.js`). Si Redis n'est pas disponible, le traitement bascule
  automatiquement en mode synchrone (même code, exécuté immédiatement) : l'application reste
  utilisable sans aucune infrastructure supplémentaire à provisionner en développement.

## RGPD

- **Droit d'accès et de portabilité** (art. 15 et 20) : `GET /api/users/me/export` renvoie un
  export JSON complet des données personnelles de l'utilisateur courant (profil, documents,
  analyses, notifications, messages) - accessible depuis `/parametres`.
- **Droit à l'effacement** (art. 17) : `POST /api/users/me/anonymiser` anonymise
  irréversiblement les données identifiantes (nom, e-mail, téléphone, avatar) et supprime le
  compte (connexion définitivement impossible). Les enregistrements
  académiques (documents, analyses) sont conservés mais détachés de l'identité - voir le
  commentaire de la route pour la justification (contraintes de clé étrangère + traçabilité
  académique légitime), une pratique reconnue par la CNIL lorsqu'une suppression totale n'est
  pas possible.
- **Information des personnes concernées** (art. 12-14) : page `/confidentialite`, liée depuis
  l'inscription et les paramètres du compte.

## Structure du projet

```
frontend/                     Frontend Next.js (voir frontend/package.json)
  src/
    app/                          Routes (App Router)
      login/, register/             Authentification
      reinitialiser-mot-de-passe/   Réinitialisation de mot de passe
      etudiant/                     Espace étudiant (dashboard, soumission, analyse, correction)
      encadrant/                    Espace encadrant (dashboard, profil, relecture, jumeau numérique)
      admin/                        Espace admin (supervision technique)
      notifications/, parametres/   Écrans transverses (tous rôles)
    components/
      ui/                          Primitives UI façon shadcn/ui (Button, Card, Table, Dialog...)
      layout/                      Sidebar, header, garde de route par rôle
      shared/                      Toolbar, pagination, empty state, badges, jauge de score
      auth/                        Sélecteur de compte Google simulé
      profil/, documents/          Composants métier spécifiques
    context/auth-context.tsx      Authentification (mock json-server)
    hooks/use-api-list.ts         Hook générique de consommation REST paginée/triée/filtrée
    lib/api.ts                     Client HTTP (pagination _page/_limit, tri _sort/_order, recherche q=)
    lib/mock-ai.ts                 Petits utilitaires pour l'écran de correction interactive
    types/                         Types partagés (contrat de données frontend ↔ json-server)
```

## Choix d'architecture

- **Séparation des responsabilités** : toute la logique réseau (pagination, tri, filtre,
  recherche) est centralisée côté frontend dans `lib/api.ts` et le hook `useApiList`, et côté
  backend dans `utils/crudFactory.js` + `middleware/queryParser.js`. Les écrans et les routes
  ne contiennent que de la logique de présentation/métier, jamais de logique réseau bas niveau.
- **Composants UI réutilisables** (`components/ui`) construits sur Radix UI, dans l'esprit
  shadcn/ui : chaque composant a une seule responsabilité et se personnalise par composition,
  pas par duplication (principes DRY / SOLID appliqués à l'UI).
- **Garde de route par rôle** (`components/layout/route-guard.tsx`) : chaque espace
  (`/etudiant`, `/encadrant`, `/admin`) vérifie le rôle de l'utilisateur connecté et redirige
  si nécessaire.
- **API REST conforme aux 6 contraintes REST** : client-serveur, sans état (le jeton d'identité
  est envoyé à chaque requête via le header `Authorization`), cache (GET non forcés en
  `no-store`), interface uniforme (ressources nommées au pluriel, verbes HTTP standards),
  système en couches (routes → controllers/services → Prisma), et pagination/tri/filtre/
  recherche disponibles sur toutes les listes.
- **Base de données normalisée** : les listes imbriquées de l'ancien `db.json` (guides,
  normes... d'un profil encadrant ; points d'une analyse) sont désormais des tables à part
  entière (`ElementReference`, `PointAnalyse`) reliées par clé étrangère, tout en conservant
  exactement la même forme de réponse JSON côté frontend (voir `backend/src/modules/analyses`
  et `backend/src/modules/profils-encadrant`).
- **Sécurité** : authentification mockée (mots de passe stockés en clair dans `data.json` pour le
  développement) ; jetons d'identité vérifiés côté serveur ; autorisations fines par rôle et par
  propriété des données (`utils/rbac.js`) ; validation stricte des entrées (Zod) ; limitation de
  débit et en-têtes de sécurité HTTP (`helmet`) - voir `backend/README.md` pour le détail complet.
- **Contenu IA réel (OpenAI), avec repli simulé** : les analyses forme/fond
  (`backend/src/workers/analyse.worker.js`) et les embeddings du profil méthodologique
  (`backend/src/lib/embeddings`) utilisent un vrai LLM (OpenAI `gpt-4o-mini` +
  `text-embedding-3-small`) dès que `OPENAI_API_KEY` est renseignée côté backend - sans elle,
  tout reste en mode simulé (gabarits pédagogiques, embeddings placeholder). Voir
  `backend/README.md`, section « Contenu IA réel ».
- **RAG (pgvector)** : le profil méthodologique de chaque encadrant est découpé en fragments et
  indexé dans pgvector à chaque mise à jour (`backend/src/lib/vector-store`), recherche par
  similarité fonctionnelle de bout en bout (`GET /api/profils-encadrant/recherche`) et utilisée
  comme contexte des analyses de fond dès que le LLM est actif.

## Déploiement et intégration continue

- **CI** : le pipeline GitHub Actions (`.github/workflows/ci.yml`) : lint → format (Prettier) →
  tests → build applicatif, sur chaque push/PR vers `main` - voir `rules/cicd.md`.
- **Architecture locale** : frontend (Next.js 3000) + json-server mock DB (4000). Pas de
  dépendances externes - tout s'exécute localement. Aucun Docker, aucun PostgreSQL, aucune
  authentification externe requise.
- **Données mockées locales** : `frontend/data.json` contient 12 utilisateurs, 8 documents, 3 encadrants,
  et 10+ autres collections. json-server expose ces données sous forme d'API REST sur `http://localhost:4000`.
  Aucune dépendance externe - tout est local et auto-contenu.
- **Authentification** : complètement mockée via `frontend/src/context/auth-context.tsx` qui utilise json-server
  comme backend d'authentification. Les tokens sont au format `mock-token-{userId}`. 
- **Vérifié localement** : lint, tests et build du frontend - voir le workflow CI.
  UptimeRobot, intervalle 5 min) qui l'appelle régulièrement empêche la mise en veille.
