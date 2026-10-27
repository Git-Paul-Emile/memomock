# MemoAssistant AI

Plateforme de pré-validation des mémoires et thèses selon les exigences de chaque encadreur,
pour les universités et écoles d'**Afrique francophone de l'Ouest et du Centre** (système LMD, français uniquement pour l'instant). Référence
fonctionnelle : `documents/MemoAssistant AI - Specification v2.1.pdf` (source HTML dans
`documents/sources/`), qui fusionne le document de conception v1.0, `feature.md` et la maquette.

Ce dépôt contient **une seule application** : le frontend Next.js. Il n'y a pas de backend
séparé — les données sont servies par un mock (`json-server` sur `frontend/data.json`), et
l'authentification est simulée côté client (voir plus bas). Seule l'**IA est réelle** : les
analyses, le tuteur, l'extraction des règles et le Diff Engine appellent Gemini (Google AI
Studio) depuis des routes serveur Next.js, avec repli automatique sur une simulation locale.

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

Pour activer l'IA réelle, créez `frontend/.env.local` (voir `.env.example`) avec
`GEMINI_API_KEY=...` (clé Google AI Studio). Sans clé, l'application fonctionne entièrement en
mode simulé et l'indique sur chaque analyse (« Analyse simulée »).

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
| Étudiant | `amina.diallo@etu.uad.edu.sn` | `etudiant123` |
| Encadreur | `jb.kouassi@uad.edu.sn` | `encadrant123` |
| Administrateur d'établissement | `direction@uad.edu.sn` | `etablissement123` |
| Super-admin plateforme | `admin@memoassistant.africa` | `admin123` |

Ces comptes sont liés entre eux : l'étudiante Amina Diallo est encadrée par Jean-Baptiste
Kouassi, et tous deux sont rattachés à l'_Université Atlantique de Dakar_ (établissement fictif,
Sénégal, F CFA) administrée par le troisième compte. Un second établissement fictif est situé au
Cameroun (`direction@uhpy.cm`). Le mémoire `doc1` d'Amina contient un texte réel : utilisez
« Réanalyser » pour voir une analyse Gemini complète.

Les données d'exemple sont fictives (noms, numéros, universités).

### Déploiement distant

En déploiement (Vercel, voir `vercel.json`), `json-server` n'est pas disponible. Le client HTTP
(`src/lib/api.ts`) bascule alors vers `/api/mock`, et **le mock s'exécute dans le navigateur**
(`src/lib/mock-navigateur.ts`) : le jeu initial est téléchargé une fois depuis
`GET /api/mock` (servi depuis `data.json`), puis toutes les lectures et écritures sont traitées
localement par le même moteur que json-server (`src/lib/mock-db.ts`) et conservées dans le
`localStorage`. La mémoire des fonctions serverless n'étant pas partagée entre requêtes, un mock
côté serveur perdait les données créées (404). Conséquences : les données sont propres à chaque
navigateur (un étudiant et son encadreur doivent utiliser le même navigateur pour voir leurs
échanges), et elles repartent de `data.json` à chaque nouveau déploiement qui le modifie. Le bouton
« Réinitialiser les données de démonstration » (Paramètres) restaure le jeu d'origine. Déclarez `GEMINI_API_KEY` dans les variables
d'environnement du projet Vercel (jamais avec le préfixe `NEXT_PUBLIC_`).

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

## Protection des données

La page `/confidentialite` cite la loi de protection des données de chaque pays de la zone et
les textes régionaux (Convention de Malabo, acte additionnel CEDEAO) - référentiel dans
`src/lib/afrique.ts`, à faire valider par un juriste avant production. Elle signale aussi le
transfert du texte des documents vers l'API Gemini (serveurs hors d'Afrique). Droits implémentés
côté client contre l'API mock :

- **Droit d'accès et de portabilité** : `/parametres` assemble et télécharge un
  export JSON complet des données de l'utilisateur courant (profil, documents, analyses,
  notifications).
- **Droit à l'effacement** : `/parametres` anonymise les données identifiantes (nom,
  e-mail, téléphone, avatar) et neutralise le compte. Les enregistrements académiques
  (documents, analyses) sont conservés mais détachés de l'identité — le détail est affiché
  avant confirmation.
- **Droit de rectification** : modification du profil depuis la même page.
- **Information des personnes concernées** : page `/confidentialite`, liée depuis
  l'inscription et les paramètres du compte.

## Intelligence artificielle (Gemini)

| Route serveur | Rôle |
| --- | --- |
| `POST /api/ia/analyse` | Analyse forme / structure / fond / cohérence selon le référentiel de l'encadreur |
| `POST /api/ia/tuteur` | Tuteur conversationnel (explique, ne réécrit pas) |
| `POST /api/ia/extraire-regles` | Extraction des règles d'un guide téléversé par l'encadreur |
| `POST /api/ia/proposer-regles` | Diff Engine : préférences déduites des corrections de l'encadreur |
| `GET /api/ia/statut` | IA configurée ou non (sans exposer la clé) |

- La clé n'est lue que dans `src/lib/ia/gemini.server.ts`. Les modèles sont essayés dans
  l'ordre `GEMINI_MODEL` (liste séparée par des virgules ; par défaut `gemini-3.5-flash`,
  `gemini-3.5-flash-lite`, `gemini-3.8-flash`), avec un délai maximal par tentative.
- Le client (`src/lib/ia/client.ts`) bascule sur `src/lib/mock-ai.ts` si l'IA ne répond pas ;
  le contrôle de structure simulé compare tout de même le texte au canevas.
- Le texte des fichiers .docx/.pdf est extrait dans le navigateur (`src/lib/extraction-texte.ts`)
  et stocké dans la collection `contenus-documents`.
- Le score global est pondéré par la grille de l'encadreur et l'état « Prêt pour soumission »
  (seuil global, minimum par catégorie, points bloquants) est calculé par `src/lib/score.ts`.
- Garde-fou mock : les routes exigent un jeton `Authorization` ; en production, vérifier un vrai
  jeton signé et limiter le débit pour protéger le quota.

## Adaptation à l'Afrique francophone

`src/lib/afrique.ts` centralise 16 pays francophones, indicatifs, devises (F CFA XOF/XAF, GNF, CDF,
MRU), fuseaux horaires, moyens de paiement (Orange Money, Wave, MTN MoMo, Moov, Airtel,
Free Money, carte, virement) et lois de protection des données. Il alimente l'inscription (pays +
indicatif), les paramètres, la création d'établissement, l'abonnement (paiement simulé), la
tarification et la politique de confidentialité. Calendrier académique par défaut : novembre →
juillet. Le canal préféré (WhatsApp, SMS, e-mail) est enregistré ; son relais simulé viendra plus
tard. La mise en relation étudiant / encadreur est gratuite pour tous.

## Rattachement et annuaire

- Tout code (encadreur, classe, établissement) se saisit à l'inscription, dans « Rejoindre un
  encadreur » ou dans les paramètres : `src/lib/invitations.ts` reconnaît son origine. Un code
  d'établissement est à usage unique et réservé au rôle invité.
- Le super-admin désigne l'administrateur d'un établissement (`/admin/etablissements`) : compte
  existant, ou code `ADM-…` à saisir à l'inscription avec le rôle « Établissement ».
- L'annuaire public `encadrants` (`src/lib/annuaire.ts`) est mis à jour à chaque inscription ou
  modification d'un encadreur ; il ne contient aucune donnée sensible.
- Les chapitres validés sont verrouillés (`src/lib/verrouillage.ts`) : toute modification est
  refusée dans l'éditeur et au réimport.

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
