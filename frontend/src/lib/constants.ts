import type { NiveauAlerte, Role, StatutDocument, StatutFile, StatutRegle } from "@/types";

export const APP_NAME = "MemoAI Assistant";

export const ROLE_LABELS: Record<Role, string> = {
  etudiant: "Étudiant",
  encadrant: "Encadrant",
  admin: "Administrateur",
};

export const STATUT_DOCUMENT_LABELS: Record<StatutDocument, string> = {
  brouillon: "Brouillon",
  soumis: "Soumis",
  analyse_en_cours: "Analyse en cours",
  analyse_terminee: "Analyse terminée",
  en_correction: "En correction",
  pret_pour_encadrant: "Prêt pour l'encadrant",
  en_relecture: "En relecture",
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
};

/** Seuil à partir duquel un document est considéré prêt à être transmis à l'encadrant. */
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
  { href: "/etudiant/documents", label: "Mes documents", icon: "Files" },
  { href: "/etudiant/soumission", label: "Soumettre un document", icon: "UploadCloud" },
  { href: "/notifications", label: "Notifications", icon: "Bell" },
  { href: "/parametres", label: "Paramètres", icon: "Settings" },
  { href: "/aide", label: "Aide & support", icon: "LifeBuoy" },
] as const;

export const NAV_ENCADRANT = [
  { href: "/encadrant/dashboard", label: "Tableau de bord", icon: "LayoutDashboard" },
  { href: "/encadrant/profil", label: "Mon profil pédagogique", icon: "BookMarked" },
  { href: "/encadrant/contraintes", label: "Contraintes", icon: "SlidersHorizontal" },
  { href: "/encadrant/grille", label: "Grille d'évaluation", icon: "ClipboardList" },
  { href: "/encadrant/invitations", label: "Inviter des étudiants", icon: "UserPlus" },
  { href: "/encadrant/jumeau-numerique", label: "Jumeau numérique", icon: "Wand2" },
  { href: "/encadrant/statistiques", label: "Statistiques", icon: "BarChart3" },
  { href: "/notifications", label: "Notifications", icon: "Bell" },
  { href: "/parametres", label: "Paramètres", icon: "Settings" },
  { href: "/aide", label: "Aide & support", icon: "LifeBuoy" },
] as const;

export const NAV_ADMIN = [
  { href: "/admin/utilisateurs", label: "Utilisateurs", icon: "Users" },
  { href: "/admin/hierarchie-regles", label: "Profils méthodologiques", icon: "GitBranch" },
  { href: "/admin/statistiques", label: "Statistiques", icon: "BarChart3" },
  { href: "/admin/journal-audit", label: "Journal d'audit", icon: "History" },
  { href: "/admin/supervision", label: "Supervision technique", icon: "ServerCog" },
  { href: "/parametres", label: "Paramètres", icon: "Settings" },
] as const;
