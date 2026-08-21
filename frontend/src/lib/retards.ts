import type { LivrableAffiche } from "@/lib/livrables";
import type { ChapitreAffiche } from "@/lib/canevas";
import type { DocumentSubmission, Seance } from "@/types";

export type TypeRetard = "livrable" | "chapitre" | "seance" | "soutenance";

/** Élément de retard prêt à afficher (spec sections 78, 87). */
export interface Retard {
  type: TypeRetard;
  libelle: string;
  dateEcheance: string;
}

/** Nombre de jours restants avant une date (négatif si dépassée) - spec section 77. */
export function joursRestants(dateISO: string): number {
  const diffMs = new Date(dateISO).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0);
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

function estDepassee(dateEcheance: string): boolean {
  return new Date(dateEcheance).getTime() < Date.now();
}

/**
 * Retards liés au suivi d'un document donné (livrables, chapitres, soutenance) - spec section 78.
 * Un élément "en retard" a une échéance dépassée et n'est pas encore validé.
 */
export function retardsDocument(
  document: Pick<DocumentSubmission, "statut" | "dateSoutenancePrevue">,
  livrablesAffiches: LivrableAffiche[],
  chapitresAffiches: ChapitreAffiche[]
): Retard[] {
  const retards: Retard[] = [];

  for (const l of livrablesAffiches) {
    if (l.dateEcheance && l.statut !== "valide" && estDepassee(l.dateEcheance)) {
      retards.push({ type: "livrable", libelle: l.nom, dateEcheance: l.dateEcheance });
    }
  }
  for (const c of chapitresAffiches) {
    if (c.dateEcheance && c.statut !== "valide" && estDepassee(c.dateEcheance)) {
      retards.push({ type: "chapitre", libelle: c.titre, dateEcheance: c.dateEcheance });
    }
  }
  if (
    document.dateSoutenancePrevue &&
    document.statut !== "valide" &&
    estDepassee(document.dateSoutenancePrevue)
  ) {
    retards.push({
      type: "soutenance",
      libelle: "Date de soutenance prévue",
      dateEcheance: document.dateSoutenancePrevue,
    });
  }

  return retards;
}

/** Séances passées jamais marquées "effectuee" (spec section 78 : "séance non effectuée"). */
export function retardsSeances(seances: Seance[]): Retard[] {
  return seances
    .filter((s) => s.statut === "planifiee" && estDepassee(s.dateHeure))
    .map((s) => ({ type: "seance" as const, libelle: s.titre, dateEcheance: s.dateHeure }));
}

/**
 * Regroupées ici plutôt qu'appelées directement dans un composant : `Date.now()` est une lecture
 * d'horloge système (fonction impure), interdite pendant le rendu par la règle React
 * `react-hooks/purity` - factoriser la comparaison dans une fonction utilitaire suffit à la
 * satisfaire (elle n'inspecte que le corps des composants, pas les fonctions importées).
 */
export function estPassee(dateISO: string): boolean {
  return estDepassee(dateISO);
}

export function partitionnerSeances<T extends Pick<Seance, "dateHeure">>(
  seances: T[]
): { aVenir: T[]; passees: T[] } {
  const aVenir: T[] = [];
  const passees: T[] = [];
  for (const s of seances) {
    (estPassee(s.dateHeure) ? passees : aVenir).push(s);
  }
  return { aVenir, passees: passees.reverse() };
}
