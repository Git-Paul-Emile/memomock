# MemoAI Assistant

Plateforme d'aide à la rédaction et à l'encadrement de mémoires académiques décrite dans le
mémo de cadrage (`feature.md`).

Ce dépôt contient **une seule application** : le frontend Next.js. Il n'y a pas de backend
séparé — les données sont servies par un mock (`json-server` sur `frontend/data.json`), et
l'authentification est simulée côté client (voir plus bas).

- **Frontend** (`frontend/`) — Next.js / React, tous les écrans étudiant / encadrant /
  administrateur d'établissement / super-admin.
- **Données de démonstration** (`frontend/data.json`) — jeu de données cohérent exposé en API
  REST par `json-server`.

## Stack technique

- **Next.js 16** (App Router, React 19, TypeScript strict)
- **Tailwind CSS v4** + composants façon **shadcn/ui** faits main (Radix UI +
  class-variance-authority)
- **react-hook-form + zod** pour la validation de formulaires
- **@tanstack/react-query** pour le cache des requêtes
- **recharts** pour les graphiques des tableaux de bord
- **sonner** pour les notifications toast
- **vitest** + Testing Library pour les tests unitaires
- **json-server** pour le mock d'API REST (dépendance de développement)

## Démarrage rapide

Un seul projet, deux processus à lancer (l'API mock et le serveur de développement Next.js).

```bash
cd frontend
npm install
```

```bash
# Terminal 1 — API mock (json-server) sur http://localhost:4000
npm run mock:server

# Terminal 2 — application Next.js sur http://localhost:3000
npm run dev
```

Comptes de démonstration (identifiants stockés en clair dans `data.json`, champ `password`).
Les trois premiers sont accessibles en un clic depuis la page `/login` :

| Rôle | E-mail | Mot de passe |
| --- | --- | --- |
| Étudiant | `amina.diallo@etu.memoai.fr` | `etudiant123` |
| Encadrant | `j.leroux@memoai.fr` | `encadrant123` |
| Administrateur d'établissement | `direction@paris-saclay.memoai.fr` | `etablissement123` |
| Super-admin plateforme | `admin@memoai.fr` | `admin123` |

Ces comptes sont liés entre eux : l'étudiante Amina Diallo est encadrée par Jérôme Leroux, et
tous deux sont rattachés à l'établissement _Université Paris-Saclay_ administré par le
troisième compte.

### Déploiement distant

En déploiement (Vercel, voir `vercel.json`), `json-server` n'est pas disponible. Une route
Next.js de secours, `src/app/api/mock/[[...path]]/route.ts`, réimplémente les mêmes verbes
REST à partir de `data.json` (en mémoire, réinitialisée à chaque démarrage). Le client HTTP
(`src/lib/api.ts`) bascule automatiquement vers `/api/mock` quand l'application tourne sur un
hôte distant configuré pour une API locale.

## Scripts

| Commande | Effet |
| --- | --- |
| `npm run dev` | Serveur de développement Next.js (:3000) |
| `npm run mock:server` | API mock json-server (:4000) |
| `npm run build` | Build de production |
| `npm run start` | Sert le build de production |
| `npm run lint` | ESLint (config `eslint-config-next`) |
| `npm run format` / `npm run format:check` | Prettier (écriture / vérification) |
| `npm run test` / `npm run test:watch` | Tests vitest |

## Authentification (mock)

Toute l'authentification est simulée : `src/lib/firebase.ts` est un module de substitution
qui expose la même API que le SDK Firebase mais lit et écrit dans `data.json` via l'API mock,
et `src/context/auth-context.tsx` est la seule source de vérité sur « qui est connecté ».

- **E-mail / mot de passe** : inscription et connexion via l'API mock (`POST /users`,
  `GET /users?email=...`). Les mots de passe sont stockés en clair dans `data.json` — c'est un
  jeu de données de démonstration, pas une base de production.
- **Jeton d'identité** au format `mock-token-{userId}`, envoyé dans l'en-tête `Authorization`
  de chaque requête.
- **Afficher / masquer le mot de passe** sur tous les champs (`components/ui/password-input.tsx`).
- **Mot de passe oublié** : en mode mock, le mot de passe est directement réinitialisé dans
  `data.json` et un succès est renvoyé.
- **Téléphone obligatoire, non vérifié** : le numéro est collecté à l'inscription (champ
  requis) sans vérification par code.
- **Sessions actives** : chaque connexion génère un identifiant de session stocké en
  `localStorage`, visible dans `/parametres` avec possibilité de révoquer les autres sessions.

## RGPD

Les fonctionnalités RGPD sont implémentées côté client contre l'API mock :

- **Droit d'accès et de portabilité** (art. 15 et 20) : `/parametres` assemble et télécharge un
  export JSON complet des données de l'utilisateur courant (profil, documents, analyses,
  notifications).
- **Droit à l'effacement** (art. 17) : `/parametres` anonymise les données identifiantes (nom,
  e-mail, téléphone, avatar) et neutralise le compte. Les enregistrements académiques
  (documents, analyses) sont conservés mais détachés de l'identité — le détail est affiché
  avant confirmation.
- **Droit de rectification** : modification du profil depuis la même page.
- **Information des personnes concernées** (art. 12-14) : page `/confidentialite`, liée depuis
  l'inscription et les paramètres du compte.

## Contenu IA (simulé)

Il n'y a aucun appel à un LLM réel. Les analyses de forme / fond, le score de conformité et
les échanges avec le tuteur IA sont générés localement à partir de gabarits
(`src/lib/mock-ai.ts`) et de données pré-calculées dans `data.json`.

## Structure du projet

```text
frontend/
  data.json                     Jeu de données mock (servi par json-server)
  src/
    app/                          Routes (App Router)
      login/, register/             Authentification
      completer-profil/             Complétion de profil (inscription Google simulée)
      reinitialiser-mot-de-passe/   Réinitialisation de mot de passe
      etudiant/                     Espace étudiant (dashboard, soumission, analyse, correction)
      encadrant/                    Espace encadrant (dashboard, profil, relecture, canevas, jumeau)
      etablissement/                Espace administrateur d'établissement (voir ci-dessous)
      admin/                        Espace super-admin (supervision technique)
      api/mock/[[...path]]/         Route REST de secours pour le déploiement distant
      notifications/, parametres/   Écrans transverses (tous rôles)
      (pages marketing publiques : a-propos, faq, tarification, contact...)
    components/
      ui/                          Primitives façon shadcn/ui (Button, Card, Table, Dialog...)
      etablissement/               Composants propres à l'espace établissement (invitation, pilule)
      layout/                      Sidebar, header, garde de route par rôle
      shared/                      Toolbar, pagination, empty state, badges, jauge de score
      classes/, documents/, canevas/, livrables/, profil/, onboarding/, marketing/, admin/
      auth/                        Sélecteur de compte Google simulé
    context/auth-context.tsx      Authentification (mock)
    hooks/
      use-api-list.ts               Liste REST paginée / triée / filtrée / cherchable
      use-api-resource.ts           Ressource REST unitaire
      use-etablissement.ts          Accès mutualisé aux données de l'espace établissement
    lib/
      api.ts                        Client HTTP (_page/_limit, _sort/_order, q=)
      firebase.ts                   Module de substitution de l'auth (mock)
      etablissement.ts              Règles métier pures de l'espace établissement
      mock-ai.ts                    Génération locale des analyses / scores
    types/                          Types partagés (contrat frontend ↔ json-server)
```

## Rôles

Quatre rôles : `etudiant`, `encadrant`, `admin_etablissement` (une école administre son propre
espace) et `admin` (super-admin de l'équipe MemoAI). La garde de route
(`components/layout/route-guard.tsx`) vérifie le rôle de l'utilisateur connecté à l'entrée de
chaque espace et redirige si nécessaire.

## Espace administrateur d'établissement

Accessible depuis `/etablissement` pour le rôle `admin_etablissement`.

| Écran | Route | Contenu |
| --- | --- | --- |
| Tableau de bord | `/etablissement/dashboard` | Indicateurs de la promotion active, alerte d'inactivité, activité récente |
| Structure | `/etablissement/filieres` | Arborescence filières → niveaux → classes, avec taux de dépôt |
| Promotions | `/etablissement/promotions` | Années académiques, bascule de l'année courante |
| Créer une promotion | `/etablissement/promotions/nouvelle` | Années, filières incluses, niveaux ouverts |
| Classes | `/etablissement/classes` | Liste filtrable, création, code de rattachement |
| Professeurs | `/etablissement/professeurs` | Recherche, invitation, affectation filière / classe / groupe, activation |
| Apprenants | `/etablissement/apprenants` | Tableau filtrable, score IA, statut, fiche détaillée |
| Normes par défaut | `/etablissement/normes` | Référentiel académique appliqué à tous les encadreurs |
| Abonnement | `/etablissement/abonnement` | Forfait souscrit par l'établissement |

Points d'architecture propres à ce module :

- **Couche domaine isolée** : `lib/etablissement.ts` ne contient que des fonctions pures
  (projection du statut d'un document vers le statut lisible par l'administration, détection
  d'inactivité, période d'une promotion). Testable sans monter de composant, et partagée par
  tous les écrans — deux écrans ne peuvent pas afficher deux chiffres différents.
- **Accès aux données mutualisé** : `hooks/use-etablissement.ts` expose `useMonEtablissement`,
  `usePromotions`, `useReferentielEtablissement` et `useDocumentsEtablissement`. Les clés
  TanStack Query étant partagées, la navigation entre écrans ne relance pas les mêmes requêtes.
- **Pagination et recherche côté serveur** pour les listes volumineuses (apprenants,
  professeurs) via `useApiList` (`_page`, `_limit`, `_sort`, `q`) ; filtrage côté client
  uniquement pour les collections de petite taille déjà en cache (classes, filières).
- **Une seule promotion active** par établissement : la bascule archive l'ancienne avant
  d'activer la nouvelle, pour ne jamais laisser deux années courantes concurrentes.
- **Affectations** : `AffectationEncadrant` porte le détail organisationnel
  (filière / niveau / classe / groupe) tandis que `Classe.encadrantIds` reste la source de
  vérité pour l'accès aux documents ; les deux sont tenues synchronisées à l'affectation.

## Choix d'architecture

- **Séparation des responsabilités** : toute la logique réseau (pagination, tri, filtre,
  recherche) est centralisée dans `lib/api.ts` et le hook `useApiList`. Les écrans ne
  contiennent que de la logique de présentation / métier, jamais de logique réseau bas niveau.
- **Composants UI réutilisables** (`components/ui`) construits sur Radix UI, dans l'esprit
  shadcn/ui : chaque composant a une seule responsabilité et se personnalise par composition,
  pas par duplication.
- **API REST mock** : ressources nommées au pluriel, verbes HTTP standards
  (GET / POST / PATCH / DELETE), pagination / tri / filtre / recherche par query params. Le
  jeton d'identité est envoyé à chaque requête (sans état).
- **Contrat de données typé** : `types/index.ts` décrit la forme exacte des réponses de l'API
  mock ; c'est le contrat partagé entre les écrans et `data.json`.

## Données de démonstration

`frontend/data.json` contient un jeu cohérent : 27 utilisateurs (étudiants, encadrants,
administrateurs), 1 établissement, 2 filières, 4 classes, 3 promotions, 17 documents à des
statuts variés, plus les analyses, notifications, canevas, grilles d'évaluation, séances et
forfaits associés. `json-server` expose ces collections en API REST sur
`http://localhost:4000`. Aucune dépendance externe — tout est local et auto-contenu.
