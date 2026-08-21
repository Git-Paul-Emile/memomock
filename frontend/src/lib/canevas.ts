import type { ChapitreCanevas, CritereChapitre, ValidationChapitre } from "@/types";

/** Ligne d'affichage résultant de la fusion chapitre (canevas) + décision (document), si prise. */
export interface ChapitreAffiche {
  chapitreId: string;
  titre: string;
  description: string | null;
  obligatoire: boolean;
  ordre: number;
  dateEcheance: string | null;
  criteres: CritereChapitre[];
  validation: ValidationChapitre | null;
  statut: ValidationChapitre["statut"];
  verrouille: boolean;
}

/**
 * Fusionne les chapitres d'un canevas avec les décisions déjà prises pour un document donné.
 * Un chapitre sans décision correspondante reste "en_attente" - aucune ligne `ValidationChapitre`
 * n'est persistée tant que l'encadrant n'a rien décidé (même convention que `resoudreLivrables`).
 */
export function resoudreChapitres(
  chapitres: ChapitreCanevas[],
  criteres: CritereChapitre[],
  validations: ValidationChapitre[]
): ChapitreAffiche[] {
  return [...chapitres]
    .sort((a, b) => a.ordre - b.ordre)
    .map((chapitre) => {
      const validation = validations.find((v) => v.chapitreId === chapitre.id) ?? null;
      return {
        chapitreId: chapitre.id,
        titre: chapitre.titre,
        description: chapitre.description ?? null,
        obligatoire: chapitre.obligatoire,
        ordre: chapitre.ordre,
        dateEcheance: chapitre.dateEcheance ?? null,
        criteres: criteres
          .filter((c) => c.chapitreId === chapitre.id)
          .sort((a, b) => a.ordre - b.ordre),
        validation,
        statut: validation?.statut ?? "en_attente",
        verrouille: validation?.verrouille ?? false,
      };
    });
}
