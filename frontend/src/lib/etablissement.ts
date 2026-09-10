/**
 * Règles métier de l'espace « administrateur d'établissement ».
 *
 * Choix d'architecture : ce fichier ne contient QUE des fonctions pures (aucun appel réseau,
 * aucun hook React). C'est la couche « domaine » de l'espace établissement : elle est
 * testable unitairement sans monter de composant ni simuler l'API, et elle est réutilisée à
 * l'identique par le tableau de bord, la liste des apprenants et la page structure - au lieu
 * d'être recopiée dans chaque écran (DRY).
 */

import type { DocumentSubmission, Promotion, StatutDocument, TypeDocument } from "@/types";

/** Variantes de badge exposées par `components/ui/badge.tsx`. */
type VariantBadge = "default" | "secondary" | "outline" | "destructive" | "success" | "warning";

/**
 * Identifiant impossible, utilisé comme filtre tant que l'établissement de l'administrateur
 * n'est pas résolu. Sans lui, `buildQuery` ignore un `etablissementId` à `undefined` et la
 * requête renverrait les utilisateurs de TOUS les établissements le temps du chargement.
 */
export const ETABLISSEMENT_INCONNU = "__etablissement_non_resolu__";

/** Niveaux gérés par un établissement, dans l'ordre du cursus. */
export const NIVEAUX_ETABLISSEMENT: TypeDocument[] = ["licence", "master", "doctorat"];

/**
 * Statut d'un apprenant tel que l'administration le lit : c'est une PROJECTION du statut
 * technique du document (`StatutDocument`, 10 valeurs orientées workflow) vers les 5 états
 * qui intéressent un directeur des études. La correspondance est explicite et exhaustive :
 * `Record<StatutDocument, …>` force le compilateur à signaler tout nouveau statut de document
 * oublié ici, plutôt que de le laisser filer silencieusement dans un `default`.
 */
export type StatutApprenant =
  "valide" | "attente_encadrant" | "en_revision" | "a_corriger" | "pas_de_depot";

export const LIBELLES_STATUT_APPRENANT: Record<StatutApprenant, string> = {
  valide: "Validé",
  attente_encadrant: "Attente encadreur",
  en_revision: "En révision",
  a_corriger: "À corriger",
  pas_de_depot: "Pas de dépôt",
};

export const VARIANT_STATUT_APPRENANT: Record<StatutApprenant, VariantBadge> = {
  valide: "success",
  attente_encadrant: "secondary",
  en_revision: "destructive",
  a_corriger: "warning",
  pas_de_depot: "outline",
};

const PROJECTION_STATUT: Record<StatutDocument, StatutApprenant> = {
  // « brouillon » = métadonnées saisies mais aucun fichier déposé : du point de vue de
  // l'administration, l'apprenant n'a encore rien rendu.
  brouillon: "pas_de_depot",
  soumis: "attente_encadrant",
  analyse_en_cours: "attente_encadrant",
  analyse_terminee: "a_corriger",
  en_correction: "a_corriger",
  pret_pour_encadrant: "attente_encadrant",
  en_relecture: "attente_encadrant",
  valide: "valide",
  rejete: "en_revision",
  refuse: "en_revision",
};

export function statutApprenant(document: DocumentSubmission | null | undefined): StatutApprenant {
  if (!document) return "pas_de_depot";
  return PROJECTION_STATUT[document.statut];
}

/** Seuil d'alerte du tableau de bord : au-delà, l'apprenant est signalé comme inactif. */
export const DELAI_INACTIVITE_JOURS = 15;

const MS_PAR_JOUR = 1000 * 60 * 60 * 24;

export function joursEcoules(depuis: string, maintenant: Date = new Date()): number {
  return Math.floor((maintenant.getTime() - new Date(depuis).getTime()) / MS_PAR_JOUR);
}

/**
 * Un apprenant est « inactif » s'il n'a toujours rien déposé ET que sa dernière trace
 * d'activité remonte à plus de {@link DELAI_INACTIVITE_JOURS} jours.
 *
 * `derniereActivite` est fourni par l'appelant (date de mise à jour du dernier document, ou à
 * défaut date de création du compte) : la fonction reste pure et n'a pas à connaître la forme
 * de l'utilisateur.
 */
export function estApprenantInactif(
  document: DocumentSubmission | null | undefined,
  derniereActivite: string,
  maintenant: Date = new Date()
): boolean {
  if (statutApprenant(document) !== "pas_de_depot") return false;
  return joursEcoules(derniereActivite, maintenant) > DELAI_INACTIVITE_JOURS;
}

/** Moyenne arrondie d'une série, ou `null` si la série est vide (pas de « NaN % » à l'écran). */
export function moyenneArrondie(valeurs: number[]): number | null {
  if (valeurs.length === 0) return null;
  return Math.round(valeurs.reduce((total, valeur) => total + valeur, 0) / valeurs.length);
}

/** Libellé normalisé d'une promotion à partir de ses deux années (« 2025-2026 »). */
export function libellePromotion(anneeDebut: number, anneeFin: number): string {
  return `${anneeDebut}-${anneeFin}`;
}

/** Période couverte par une promotion, en toutes lettres (« 1 oct. 2025 → 30 juin 2026 »). */
export function periodePromotion(promotion: Pick<Promotion, "dateDebut" | "dateFin">): string {
  const format = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `${format.format(new Date(promotion.dateDebut))} → ${format.format(new Date(promotion.dateFin))}`;
}

/**
 * Dates par défaut d'une année académique : rentrée au 1er octobre de l'année de début,
 * clôture au 30 juin de l'année de fin.
 */
export function datesParDefautPromotion(anneeDebut: number, anneeFin: number) {
  return {
    dateDebut: new Date(Date.UTC(anneeDebut, 9, 1)).toISOString(),
    dateFin: new Date(Date.UTC(anneeFin, 5, 30)).toISOString(),
  };
}

/** Code de rattachement lisible, partagé aux invités (même convention que les codes de classe). */
export function genererCodeInvitation(prefixe: string): string {
  return `${prefixe}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}
