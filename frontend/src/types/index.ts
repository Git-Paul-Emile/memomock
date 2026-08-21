/**
 * Types partagés de l'application MemoAI Assistant.
 * Ce fichier centralise le "contrat de données" entre le frontend et l'API simulée
 * (json-server). En production, ces types correspondraient aux DTO exposés par
 * l'API REST réelle (Node/Express + PostgreSQL décrite dans le mémo de cadrage).
 */

// "admin_etablissement" : administrateur d'un établissement (école/université) - distinct du
// super-admin `admin` (équipe plateforme). Réintroduit avec la hiérarchie établissement/filière/
// classe/groupe (spec section 2), après un retrait antérieur de cette notion.
export type Role = "etudiant" | "encadrant" | "admin" | "admin_etablissement";

/**
 * Rôles qu'un visiteur peut demander lui-même à l'inscription. `admin` en est volontairement
 * exclu : le rôle transite par le navigateur, l'accepter reviendrait à laisser n'importe qui
 * s'attribuer des privilèges d'administration. Le backend applique la même restriction (voir
 * `ROLES_INSCRIPTION` dans backend/src/modules/auth/auth.service.js) ; ce type n'est que le
 * garde-fou de compilation qui empêche l'interface de proposer un choix que l'API refusera.
 * `admin_etablissement` reste inclus : une école crée elle-même son espace (spec section 6).
 */
export type RoleInscription = Exclude<Role, "admin">;

export interface User {
  id: string;
  role: Role;
  nom: string;
  prenom: string;
  email: string;
  motDePasse?: string; // DÉPRÉCIÉ (ancien système JWT/bcrypt) : jamais renvoyé par l'API.
  avatarUrl?: string;
  encadrantId?: string; // Renseigné si role === "etudiant"
  // Programme d'études (ex. « Master 2 Informatique »), libellé libre - reste disponible même
  // hors rattachement à un établissement (mode indépendant, spec section 95).
  filiere?: string;
  // Rattachement à la hiérarchie établissement (spec section 2) : etablissementId seul pour un
  // admin_etablissement ou un encadrant affilié ; classeId/groupeId en plus pour un étudiant
  // rejoint via un code de classe (voir /rattachement-encadrant).
  etablissementId?: string | null;
  classeId?: string | null;
  groupeId?: string | null;
  telephone?: string; // Format international, ex : +221772995851. Obligatoire à l'inscription,
  // mais non vérifié (l'OTP WhatsApp a été retiré).
  canalNotificationPrefere?: CanalNotification;
  // Compte désactivé par un administrateur (spec écrans F8-F11) : un compte inactif ne peut
  // plus s'authentifier (voir backend middleware/auth.js). Absent = actif (valeur par défaut).
  actif?: boolean;
  // Libellé affiché à côté du rôle technique (spec écran F14, ex. "Coordinateur pédagogique") :
  // purement cosmétique, sans effet sur les permissions RBAC - réservé à un administrateur.
  libelleRolePersonnalise?: string | null;
  // Réservés à role === "encadrant" (spec section 98) : utilisés pour la mise en relation.
  domainesExpertise?: string[];
  disponible?: boolean;
  createdAt: string;
}

// Canal de relais des notifications. "in_app" est toujours présent (visible sur /notifications) ;
// "email" y ajoute un envoi par e-mail (Resend). Le canal WhatsApp a été retiré.
export type CanalNotification = "email" | "in_app";

export type PublicUser = Omit<User, "motDePasse">;

/** Élément générique d'une liste de référence (guide, norme, exigence...) */
export interface ElementReference {
  id: string;
  titre: string;
  description: string;
  ajouteLe: string;
}

// Hiérarchie établissement (spec section 2) : une école/université (Etablissement) regroupe des
// filières et des classes ; une classe appartient à une filière et se divise en groupes.
export interface Etablissement {
  id: string;
  nom: string;
  adminId: string;
  createdAt: string;
}

export interface Filiere {
  id: string;
  etablissementId: string;
  nom: string;
  createdAt: string;
}

/**
 * Classe (spec sections 9, 11, 12) : `etablissementId` est nullable - un encadrant en mode
 * indépendant (spec section 95) peut créer une classe sans être rattaché à un établissement.
 * `encadrantIds` porte plusieurs encadreurs (spec section 71, ex. répartition d'étudiants entre
 * professeurs d'une même classe). `code` permet le rattachement d'un étudiant en autonomie (spec
 * section 12), même mécanisme que le code d'invitation encadrant existant.
 */
export interface Classe {
  id: string;
  etablissementId: string | null;
  filiereId: string | null;
  nom: string;
  niveau: TypeDocument;
  code: string;
  encadrantIds: string[];
  createdAt: string;
}

export interface Groupe {
  id: string;
  classeId: string;
  nom: string;
  createdAt: string;
}

// Écran /encadrant/contraintes - règles formelles complémentaires au profil pédagogique.
export interface ContraintesProfil {
  norme?: string;
  ton?: string;
  pagesMinimum?: number;
  police?: string;
  interligne?: string;
  marges?: string;
  sectionsObligatoires?: string[];
  consignesLibres?: string;
}

// Type de mémoire (spec section 7). Conditionne le profil méthodologique applicable.
export type TypeDocument = "licence" | "master" | "doctorat";

export const LIBELLES_TYPE_DOCUMENT: Record<TypeDocument, string> = {
  licence: "Licence",
  master: "Master",
  doctorat: "Doctorat",
};

// Nature attendue d'un livrable (spec section 20) : un fichier déposé, ou un lien externe
// (dépôt Git, application déployée...) - voir section 24-25.
export type TypeLivrable = "fichier" | "lien";

/**
 * Livrable attendu, défini par l'encadrant au niveau du profil pédagogique (spec section 20) :
 * s'applique à tous les documents rattachés à ce profil (même convention que guidesRedaction /
 * normes / exigences, plutôt qu'une définition répétée par étudiant).
 */
export interface LivrableDefinition {
  id: string;
  nom: string;
  description: string;
  type: TypeLivrable;
  obligatoire: boolean;
  // Date limite indicative (spec section 76, ex. « Cahier des charges → 20 août »), appliquée à
  // tous les documents du profil - pas de déclinaison par étudiant pour rester simple.
  dateEcheance?: string | null;
  ajouteLe: string;
}

// Un encadrant possède plusieurs profils (spec section 8) : un par type de document × discipline.
export interface ProfilEncadrant {
  id: string;
  encadrantId: string;
  typeDocument: TypeDocument;
  discipline: string;
  nom: string | null;
  actif: boolean;
  guidesRedaction: ElementReference[];
  memoiresModeles: ElementReference[];
  normes: ElementReference[];
  exigences: ElementReference[];
  livrablesAttendus: LivrableDefinition[];
  // Canevas structuré (chapitres/critères) associé à ce profil (spec section 17) - distinct de
  // `contraintes.sectionsObligatoires` (checklist plate de mise en forme, conservée telle quelle).
  canevasId?: string | null;
  contraintes: ContraintesProfil | null;
  // Seuil de conformité (%) exigé pour transmettre un document, et seuil minimal par catégorie
  // (forme/fond/cohérence) en dessous duquel la soumission reste bloquée même si le score global
  // est atteint - voir écran /encadrant/grille (Phase 3) et utils/conformite.js côté backend.
  seuilSoumission: number;
  seuilCategorieMinimum: number;
  updatedAt: string;
}

// Grille d'évaluation pondérée d'un profil (spec section 8.5) - une par profil.
export interface CritereGrille {
  id: string;
  libelle: string;
  poids: number;
  ordre: number;
}

export interface GrilleEvaluation {
  id: string;
  profilEncadrantId: string;
  criteres: CritereGrille[];
  updatedAt: string;
}

/**
 * Canevas / template de mémoire (spec sections 14-21) : structure en chapitres, chacun portant
 * ses propres critères obligatoires/optionnels. Entité indépendante (pas embarquée dans
 * `ProfilEncadrant`) pour permettre la duplication/réutilisation (spec section 16, ex. « Canevas
 * Master Informatique 2025 » → « ...2026 ») avant réattribution à un profil.
 */
export interface Canevas {
  id: string;
  encadrantId: string;
  nom: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChapitreCanevas {
  id: string;
  canevasId: string;
  titre: string;
  description?: string | null;
  obligatoire: boolean;
  ordre: number;
  // Date limite indicative (spec section 76, ex. « Chapitre 1 → 5 septembre »).
  dateEcheance?: string | null;
}

export interface CritereChapitre {
  id: string;
  chapitreId: string;
  libelle: string;
  obligatoire: boolean;
  ordre: number;
}

// Cycle de vie de la validation d'un chapitre pour un document donné (spec section 50).
// "en_attente" n'est jamais persisté (état par défaut d'un chapitre sans décision, voir
// lib/canevas.ts), même convention que StatutLivrable.
export type StatutChapitreDocument = "en_attente" | "valide" | "refuse";

/**
 * Décision de l'encadrant sur un chapitre d'un document (spec sections 50, 53-54).
 * `verrouille` passe à `true` dès la validation - seul un déverrouillage explicite de
 * l'encadrant (spec section 54) le repasse à `false` avec le statut réinitialisé.
 */
export interface ValidationChapitre {
  id: string;
  documentId: string;
  chapitreId: string;
  statut: StatutChapitreDocument;
  verrouille: boolean;
  commentaire?: string | null;
  dateDecision?: string | null;
  createdAt: string;
  updatedAt: string;
}

// Instantané d'un document à une transition clé (spec section 29, D69-D72).
export interface VersionDocument {
  id: string;
  documentId: string;
  numero: number;
  statut: StatutDocument;
  scoreConformite: number;
  scoreForme: number;
  scoreFond: number;
  scoreCoherence: number;
  urlFichier: string | null;
  // Texte extrait au moment de la capture (spec écran D70, comparateur) - voir lib/diff.ts.
  texteExtrait: string | null;
  auteur: "etudiant" | "encadrant";
  createdAt: string;
}

// Session de connexion active (spec écran H8-H9, "Sessions actives"). Alimentée à chaque
// POST /auth/sync - voir lib/session-id.ts (obtenirSessionId).
export interface SessionConnexion {
  id: string;
  userId: string;
  appareil: string | null;
  ip: string | null;
  derniereActivite: string;
  creeLe: string;
}

export type StatutDocument =
  // Créé sans fichier (métadonnées seules - sujet, type, discipline...), voir
  // POST /documents/brouillon. Transitionne vers analyse_en_cours dès l'import du fichier.
  | "brouillon"
  | "soumis"
  | "analyse_en_cours"
  | "analyse_terminee"
  | "en_correction"
  | "pret_pour_encadrant"
  | "en_relecture"
  | "valide"
  // "Demander une révision" (le libellé écran) - conservé tel quel, voir schema.prisma backend.
  | "rejete"
  // Décision "Refuser" de l'encadrant, distincte d'une simple demande de révision.
  | "refuse";

export interface DocumentSubmission {
  id: string;
  etudiantId: string;
  encadrantId: string;
  titre: string;
  // Absents tant que le document est en statut `brouillon` (créé sans fichier).
  nomFichier?: string | null;
  tailleOctets?: number | null;
  // Fichier réel hébergé sur Cloudinary (voir backend POST /documents/upload).
  urlFichier?: string;
  cloudinaryId?: string;
  statut: StatutDocument;
  scoreConformite: number; // 0-100
  scoreForme: number;
  scoreFond: number;
  scoreCoherence?: number;
  // Type de mémoire, discipline, et profil méthodologique effectivement résolu à la création
  // (spec sections 7-8) - voir backend documents.service#resoudreProfilEncadrant.
  typeDocument?: TypeDocument | null;
  discipline?: string | null;
  profilEncadrantId?: string | null;
  // Métadonnées du "projet" (écran D2 "Mon projet") - voir schema.prisma, Document.
  sujet?: string | null;
  problematique?: string | null;
  objectifs?: string | null;
  dateSoutenancePrevue?: string | null;
  // Retour final de l'encadrant (écran de validation) : renseignés une fois le document validé.
  note?: string | null;
  appreciation?: string | null;
  dateSoumission: string;
  dateMaj: string;
  version: number;
  // Calculés côté backend (voir utils/conformite.js), uniquement sur GET /documents/:id - pas
  // sur les listes. Absents tant que le document n'a pas été chargé via cette route.
  pretPourSoumission?: boolean;
  pointsBloquants?: string[];
}

// Cycle de vie d'un dépôt de livrable (spec section 59) : "a_faire" n'est jamais persisté (c'est
// l'état par défaut d'une définition sans dépôt correspondant, voir lib/livrables.ts).
export type StatutLivrable = "a_faire" | "soumis" | "en_correction" | "valide";

/**
 * Dépôt effectif d'un livrable par l'étudiant, rattaché à un document (spec sections 57-59).
 * `definitionId` référence `ProfilEncadrant.livrablesAttendus[].id` ; `nom`/`type`/`obligatoire`
 * sont dupliqués depuis la définition au moment du dépôt pour ne pas changer rétroactivement si
 * l'encadrant modifie ensuite son profil.
 */
export interface Livrable {
  id: string;
  documentId: string;
  definitionId: string;
  nom: string;
  type: TypeLivrable;
  obligatoire: boolean;
  statut: StatutLivrable;
  nomFichier?: string | null;
  tailleOctets?: number | null;
  urlExterne?: string | null;
  commentaireEncadrant?: string | null;
  dateDepot?: string | null;
  dateVerification?: string | null;
  createdAt: string;
  updatedAt: string;
}

// "coherence" : cohérence croisée entre les grandes parties du document (spec section 13),
// distincte du fond - voir workers/analyse.worker.js côté backend.
// "structure" : présence des chapitres attendus par le canevas associé (spec sections 29-30).
export type TypeAnalyse = "forme" | "fond" | "coherence" | "structure";
export type NiveauAlerte = "info" | "succes" | "attention" | "erreur";

export interface PointAnalyse {
  id: string;
  libelle: string;
  detail: string;
  niveau: NiveauAlerte;
}

export interface Analyse {
  id: string;
  documentId: string;
  type: TypeAnalyse;
  score: number;
  points: PointAnalyse[];
  dateAnalyse: string;
}

export type AuteurMessage = "etudiant" | "ia" | "encadrant";

export interface MessageCorrection {
  id: string;
  documentId: string;
  auteur: AuteurMessage;
  contenu: string;
  date: string;
}

// "retard" : alerte de délai dépassé (spec sections 78-79) - créée explicitement (bouton
// "Relancer"), pas par une tâche de fond (aucun scheduler serveur dans ce projet).
export type TypeNotification =
  | "soumission"
  | "analyse"
  | "correction"
  | "validation"
  | "systeme"
  | "retard";

export interface Notification {
  id: string;
  userId: string;
  titre: string;
  message: string;
  type: TypeNotification;
  lu: boolean;
  date: string;
  lienDocumentId?: string;
}

// Cycle de vie d'une séance de suivi (spec sections 72-73, 78 "séance non effectuée").
export type StatutSeance = "planifiee" | "effectuee" | "annulee";

/**
 * Séance de suivi encadrant/étudiant (spec sections 72-73, 80). `tache` porte la proposition de
 * travail associée à la séance (spec section 80) - remplie manuellement ou par la génération
 * automatique de planning (spec section 75, voir lib/planning.ts).
 */
export interface Seance {
  id: string;
  encadrantId: string;
  etudiantId: string;
  documentId?: string | null;
  titre: string;
  tache?: string | null;
  dateHeure: string;
  dureeMinutes?: number;
  statut: StatutSeance;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Créneau hebdomadaire récurrent déclaré par l'encadrant (spec section 74). */
export interface DisponibiliteEncadrant {
  id: string;
  encadrantId: string;
  jourSemaine: number; // 0 (dimanche) - 6 (samedi), convention `Date.getDay()`
  heureDebut: string; // "HH:mm"
  heureFin: string; // "HH:mm"
}

/**
 * Forfait/abonnement (spec section 96) : offre du catalogue plateforme, gérée par le
 * super-admin. `miseEnRelationPayante` (spec section 97) indique, à titre informatif, si la mise
 * en relation étudiant/encadreur est facturée sur ce forfait - le modèle économique exact n'étant
 * pas arrêté dans le cahier des charges, aucune logique de facturation réelle n'y est attachée.
 */
export interface Forfait {
  id: string;
  nom: string;
  description: string;
  prixMensuel: number;
  maxEtudiants: number | null;
  maxEncadrants: number | null;
  fonctionnalites: string[];
  miseEnRelationPayante: boolean;
  ordre: number;
}

export type StatutAbonnement = "actif" | "expire" | "annule";

/** Abonnement d'un établissement à un forfait - un seul actif à la fois. */
export interface Abonnement {
  id: string;
  etablissementId: string;
  forfaitId: string;
  statut: StatutAbonnement;
  dateDebut: string;
  dateRenouvellement: string | null;
}

export type StatutInvitation = "en_attente" | "acceptee" | "expiree";

export interface Invitation {
  id: string;
  encadrantId: string;
  email: string;
  code: string;
  statut: StatutInvitation;
  date: string;
}

export type TypeSegment = "normal" | "supprime" | "ajoute";

/** Segment de texte du suivi des modifications de l'encadrant (barré / souligné). */
export interface RevisionSegment {
  id: string;
  documentId: string;
  paragraphe: number;
  ordre: number;
  texte: string;
  type: TypeSegment;
}

/** Commentaire ponctuel laissé par l'encadrant en marge d'un passage. */
export interface CommentaireMarge {
  id: string;
  documentId: string;
  numero: number;
  texte: string;
  date: string;
}

/** Entrée de FAQ affichée sur l'écran d'aide (contenu public). */
export interface FaqEntry {
  id: string;
  question: string;
  reponse: string;
  ordre: number;
}

/** Témoignage affiché sur la page d'accueil publique (spec écran A1). */
export interface Temoignage {
  id: string;
  nom: string;
  role: string;
  citation: string;
  ordre: number;
}

// Demande de support (spec écrans H18-H20) : soumise via /faq, /contact ou /aide.
export type StatutDemandeSupport = "nouvelle" | "en_cours" | "resolue";

export const LIBELLES_STATUT_DEMANDE_SUPPORT: Record<StatutDemandeSupport, string> = {
  nouvelle: "Nouvelle",
  en_cours: "En cours",
  resolue: "Résolue",
};

export interface DemandeSupport {
  id: string;
  userId: string | null;
  email: string;
  sujet: string;
  message: string;
  statut: StatutDemandeSupport;
  reponse: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Encadrant exposé publiquement (choix à l'inscription / rattachement), sans donnée sensible. */
export interface EncadrantPublic {
  id: string;
  nom: string;
  prenom: string;
  filiere?: string | null;
  // Spec section 98 : critères de mise en relation (domaine, charge actuelle, disponibilité).
  domainesExpertise?: string[];
  disponible?: boolean;
  nbEtudiantsSuivis?: number;
}

export type StatutDemandeEncadrement = "en_attente" | "acceptee" | "refusee";

/**
 * Demande d'encadrement initiée par un étudiant (spec section 63) auprès d'un encadrant qu'il ne
 * connaît pas encore (mode "recherche" de /rattachement-encadrant) - contrairement aux modes
 * "code" (encadrant/classe), qui rattachent immédiatement car c'est l'encadrant/l'établissement
 * qui a initié le contact. L'encadrant accepte ou refuse (spec section 65).
 */
export interface DemandeEncadrement {
  id: string;
  etudiantId: string;
  encadrantId: string;
  message?: string | null;
  statut: StatutDemandeEncadrement;
  createdAt: string;
  dateReponse?: string | null;
}

/** Réponse de l'étudiant ou de l'encadrant à un commentaire en marge (spec section 47). */
export interface ReponseCommentaire {
  id: string;
  commentaireMargeId: string;
  documentId: string;
  auteur: "etudiant" | "encadrant";
  texte: string;
  date: string;
}

export type StatutRegle = "proposee" | "adoptee" | "ignoree";

// Portée d'application d'une règle apprise (spec section 23-24), de la plus étroite à la plus
// large.
export type NiveauRegle = "ponctuelle" | "projet" | "type_document" | "discipline" | "generale";

export const LIBELLES_NIVEAU_REGLE: Record<NiveauRegle, string> = {
  ponctuelle: "Ce document uniquement",
  projet: "Ce projet",
  type_document: "Ce type de document",
  discipline: "Cette discipline",
  generale: "Tous mes documents",
};

export interface RegleApprise {
  id: string;
  encadrantId: string;
  regle: string;
  source: string; // ex : "Comparaison document #124"
  confiance: number; // 0-100
  statut: StatutRegle;
  dateApprentissage: string;
  niveau: NiveauRegle;
  documentId?: string | null;
  typeDocument?: TypeDocument | null;
  discipline?: string | null;
}

export type StatutFile = "en_attente" | "en_cours" | "termine" | "echec";

export interface TacheFile {
  id: string;
  documentId: string;
  type: string;
  statut: StatutFile;
  tentatives: number;
  dureeMs?: number;
  createdAt: string;
}

export type NiveauLog = "info" | "warning" | "error";

export interface LogErreur {
  id: string;
  niveau: NiveauLog;
  message: string;
  contexte: string;
  date: string;
}

/** Enveloppe générique pour les réponses paginées façon json-server (_page/_limit). */
export interface ReponsePaginee<T> {
  data: T[];
  total: number;
  page: number;
  limite: number;
  totalPages: number;
}

// Audit des actions sensibles (spec écran F33) - voir backend/src/utils/audit.js.
export interface JournalAudit {
  id: string;
  acteurId: string;
  acteurRole: string;
  action: string;
  cible: string;
  details: string | null;
  createdAt: string;
}
