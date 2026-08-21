import type { Livrable, LivrableDefinition } from "@/types";

/** Ligne d'affichage résultant de la fusion définition (profil) + dépôt (document), si présent. */
export interface LivrableAffiche {
  definitionId: string;
  nom: string;
  description: string;
  type: LivrableDefinition["type"];
  obligatoire: boolean;
  dateEcheance: string | null;
  livrable: Livrable | null;
  statut: Livrable["statut"];
}

/**
 * Fusionne les livrables attendus d'un profil pédagogique avec les dépôts déjà effectués pour un
 * document donné. Une définition sans dépôt correspondant reste "à faire" - aucune ligne
 * `Livrable` n'est persistée tant que l'étudiant n'a rien déposé (voir types/index.ts).
 */
export function resoudreLivrables(
  definitions: LivrableDefinition[],
  livrables: Livrable[]
): LivrableAffiche[] {
  return definitions.map((def) => {
    const livrable = livrables.find((l) => l.definitionId === def.id) ?? null;
    return {
      definitionId: def.id,
      nom: def.nom,
      description: def.description,
      type: def.type,
      obligatoire: def.obligatoire,
      dateEcheance: def.dateEcheance ?? null,
      livrable,
      statut: livrable?.statut ?? "a_faire",
    };
  });
}
