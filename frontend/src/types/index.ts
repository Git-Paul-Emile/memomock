/**
 * Types partagés de l'application MemoAI Assistant.
 * Ce fichier centralise le "contrat de données" entre le frontend et l'API simulée
 * (json-server). En production, ces types correspondraient aux DTO exposés par
 * l'API REST réelle (Node/Express + PostgreSQL décrite dans le mémo de cadrage).
 */

export type Role = "etudiant" | "encadrant" | "admin";

/**
 * Rôles qu'un visiteur peut demander lui-même à l'inscription. `admin` en est volontairement
 * exclu : le rôle transite par le navigateur, l'accepter reviendrait à laisser n'importe qui
 * s'attribuer des privilèges d'administration. Le backend applique la même restriction (voir
 * `ROLES_INSCRIPTION` dans backend/src/modules/auth/auth.service.js) ; ce type n'est que le
 * garde-fou de compilation qui empêche l'interface de proposer un choix que l'API refusera.
 */
export type RoleInscription = Exclude<Role, "admin">;

export interface User {
  id: string;
  firebaseUid?: string; // Relie ce profil à un compte Firebase Authentication.
  role: Role;
  nom: string;
  prenom: string;
  email: string;
  motDePasse?: string; // DÉPRÉCIÉ (ancien système JWT/bcrypt) : jamais renvoyé par l'API.
  provider?: string; // "password" | "google.com" (fournisseur Firebase)
  avatarUrl?: string;
  encadrantId?: string; // Renseigné si role === "etudiant"
  // Programme d'études (ex. « Master 2 Informatique »), libellé libre : seul contexte académique
  // porté par le profil depuis le retrait de la notion d'établissement.
  filiere?: string;
  telephone?: string; // Format international, ex : +221772995851. Obligatoire à l'inscription,
  // mais non vérifié (l'OTP WhatsApp a été retiré).
  canalNotificationPrefere?: CanalNotification;
  // Compte désactivé par un administrateur (spec écrans F8-F11) : un compte inactif ne peut
  // plus s'authentifier (voir backend middleware/auth.js). Absent = actif (valeur par défaut).
  actif?: boolean;
  // Libellé affiché à côté du rôle technique (spec écran F14, ex. "Coordinateur pédagogique") :
  // purement cosmétique, sans effet sur les permissions RBAC - réservé à un administrateur.
  libelleRolePersonnalise?: string | null;
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

// "coherence" : cohérence croisée entre les grandes parties du document (spec section 13),
// distincte du fond - voir workers/analyse.worker.js côté backend.
export type TypeAnalyse = "forme" | "fond" | "coherence";
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

export type TypeNotification = "soumission" | "analyse" | "correction" | "validation" | "systeme";

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
