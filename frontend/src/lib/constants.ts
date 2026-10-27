import type {
  NiveauAlerte,
  Role,
  StatutChapitreDocument,
  StatutDocument,
  StatutFile,
  StatutLivrable,
  StatutRegle,
} from "@/types";

export const APP_NAME = "MemoAssistant AI";

export const ROLE_LABELS: Record<Role, string> = {
  etudiant: "Étudiant",
  encadrant: "Encadreur",
  admin: "Administrateur",
  admin_etablissement: "Établissement",
};

export const STATUT_DOCUMENT_LABELS: Record<StatutDocument, string> = {
  // Libellés de la spécification v2 (partie IX) : « À corriger » regroupe les deux états de la
  // boucle de correction de l'étudiant ; « En correction » désigne le travail de l'encadreur.
  brouillon: "Brouillon",
  soumis: "Déposé",
  analyse_en_cours: "Analyse IA en cours",
  analyse_terminee: "À corriger",
  en_correction: "À corriger",
  pret_pour_encadrant: "Soumis à l'encadreur",
  en_relecture: "En correction (encadreur)",
  valide: "Validé",
  rejete: "Révision demandée",
  refuse: "Refusé",
};

export const STATUT_DOCUMENT_VARIANT: Record<
  StatutDocument,
  "default" | "secondary" | "outline" | "destructive" | "success" | "warning"
> = {
  brouillon: "outline",
  soumis: "secondary",
  analyse_en_cours: "warning",
  analyse_terminee: "outline",
  en_correction: "warning",
  pret_pour_encadrant: "default",
  en_relecture: "default",
  valide: "success",
  rejete: "destructive",
  refuse: "destructive",
};

export const NIVEAU_ALERTE_VARIANT: Record<
  NiveauAlerte,
  "default" | "secondary" | "outline" | "destructive" | "success" | "warning"
> = {
  info: "outline",
  succes: "success",
  attention: "warning",
  erreur: "destructive",
};

export const STATUT_FILE_LABELS: Record<StatutFile, string> = {
  en_attente: "En attente",
  en_cours: "En cours",
  termine: "Terminé",
  echec: "Échec",
};

export const STATUT_REGLE_LABELS: Record<StatutRegle, string> = {
  proposee: "Proposée",
  adoptee: "Adoptée",
  ignoree: "Ignorée",
  desactivee: "Désactivée",
};

export const STATUT_LIVRABLE_LABELS: Record<StatutLivrable, string> = {
  a_faire: "À faire",
  en_cours: "En cours",
  soumis: "Soumis",
  en_correction: "À corriger",
  valide: "Validé",
};

export const STATUT_LIVRABLE_VARIANT: Record<
  StatutLivrable,
  "default" | "secondary" | "outline" | "destructive" | "success" | "warning"
> = {
  a_faire: "outline",
  en_cours: "secondary",
  soumis: "secondary",
  en_correction: "warning",
  valide: "success",
};

export const STATUT_CHAPITRE_LABELS: Record<StatutChapitreDocument, string> = {
  en_attente: "En attente",
  valide: "Validé",
  refuse: "Refusé",
};

export const STATUT_CHAPITRE_VARIANT: Record<
  StatutChapitreDocument,
  "default" | "secondary" | "outline" | "destructive" | "success" | "warning"
> = {
  en_attente: "outline",
  valide: "success",
  refuse: "destructive",
};

/** Seuil par défaut (profil sans seuil) à partir duquel un document peut être soumis. */
export const SEUIL_SCORE_CONFORMITE = 80;

/**
 * Statuts de document proposés dans les filtres des tableaux de bord (étudiant et encadrant) :
 * mutualisé ici (DRY) car identique dans les deux écrans.
 */
export const STATUTS_FILTRABLES: (StatutDocument | "tous")[] = [
  "tous",
  "brouillon",
  "soumis",
  "analyse_en_cours",
  "analyse_terminee",
  "en_correction",
  "pret_pour_encadrant",
  "en_relecture",
  "valide",
  "rejete",
  "refuse",
];

export const NAV_ETUDIANT = [
  { href: "/etudiant/dashboard", label: "Tableau de bord", icon: "LayoutDashboard" },
  { href: "/etudiant/projet", label: "Mon projet", icon: "FolderKanban" },
  { href: "/etudiant/planning", label: "Planning", icon: "CalendarClock" },
  { href: "/etudiant/documents", label: "Mes documents", icon: "Files" },
  { href: "/etudiant/soumission", label: "Soumettre un document", icon: "UploadCloud" },
  { href: "/messagerie", label: "Messagerie", icon: "MessagesSquare" },
  { href: "/notifications", label: "Notifications", icon: "Bell" },
  { href: "/parametres", label: "Paramètres", icon: "Settings" },
  { href: "/aide", label: "Aide & support", icon: "LifeBuoy" },
] as const;

export const NAV_ENCADRANT = [
  { href: "/encadrant/dashboard", label: "Tableau de bord", icon: "LayoutDashboard" },
  { href: "/encadrant/profil", label: "Mon profil pédagogique", icon: "BookMarked" },
  { href: "/encadrant/canevas", label: "Canevas", icon: "Library" },
  { href: "/encadrant/planning", label: "Planning", icon: "CalendarClock" },
  { href: "/encadrant/contraintes", label: "Contraintes", icon: "SlidersHorizontal" },
  { href: "/encadrant/grille", label: "Grille d'évaluation", icon: "ClipboardList" },
  { href: "/encadrant/classes", label: "Mes classes", icon: "Users" },
  { href: "/encadrant/invitations", label: "Inviter des étudiants", icon: "UserPlus" },
  { href: "/messagerie", label: "Messagerie", icon: "MessagesSquare" },
  { href: "/encadrant/jumeau-numerique", label: "Ce que l'IA a appris", icon: "Wand2" },
  { href: "/encadrant/statistiques", label: "Statistiques", icon: "BarChart3" },
  { href: "/notifications", label: "Notifications", icon: "Bell" },
  { href: "/parametres", label: "Paramètres", icon: "Settings" },
  { href: "/aide", label: "Aide & support", icon: "LifeBuoy" },
] as const;

export const NAV_ETABLISSEMENT = [
  { href: "/etablissement/dashboard", label: "Tableau de bord", icon: "LayoutDashboard" },
  { href: "/etablissement/filieres", label: "Structure", icon: "GitBranch" },
  { href: "/etablissement/promotions", label: "Promotions", icon: "CalendarRange" },
  { href: "/etablissement/classes", label: "Classes", icon: "Users" },
  { href: "/etablissement/professeurs", label: "Professeurs", icon: "UserCog" },
  { href: "/etablissement/apprenants", label: "Apprenants", icon: "GraduationCap" },
  { href: "/etablissement/normes", label: "Normes par défaut", icon: "ScrollText" },
  { href: "/etablissement/abonnement", label: "Abonnement", icon: "CreditCard" },
  { href: "/notifications", label: "Notifications", icon: "Bell" },
  { href: "/parametres", label: "Paramètres", icon: "Settings" },
  { href: "/aide", label: "Aide & support", icon: "LifeBuoy" },
] as const;

export const NAV_ADMIN = [
  { href: "/admin/utilisateurs", label: "Utilisateurs", icon: "Users" },
  { href: "/admin/etablissements", label: "Établissements", icon: "Building2" },
  { href: "/admin/referentiels", label: "Disciplines", icon: "BookOpen" },
  { href: "/admin/forfaits", label: "Forfaits", icon: "CreditCard" },
  { href: "/admin/hierarchie-regles", label: "Profils méthodologiques", icon: "GitBranch" },
  { href: "/admin/statistiques", label: "Statistiques", icon: "BarChart3" },
  { href: "/admin/journal-audit", label: "Journal d'audit", icon: "History" },
  { href: "/admin/supervision", label: "Supervision technique", icon: "ServerCog" },
  { href: "/parametres", label: "Paramètres", icon: "Settings" },
] as const;
