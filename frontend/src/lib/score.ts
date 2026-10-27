/**
 * Calcul du score de conformité et de l'état « Prêt pour soumission » (spec v2, § 24-25).
 *
 * Fonctions pures, sans réseau : utilisées après chaque analyse pour enregistrer le score global
 * et les points bloquants sur le document (rôle que tiendra le serveur en production).
 */

import type { CategorieScore, CritereGrille, PointAnalyse } from "@/types";
import { LIBELLES_CATEGORIE_SCORE } from "@/types";

export type ScoresDocument = Record<CategorieScore, number>;

/** Seuils utilisés quand le profil de l'encadreur n'en définit pas. */
export const SEUIL_SOUMISSION_DEFAUT = 80;
export const SEUIL_CATEGORIE_DEFAUT = 50;

export const LIBELLE_SCORE =
  "Score estimatif de conformité aux exigences configurées";

const AXES_PRINCIPAUX: CategorieScore[] = ["forme", "structure", "fond", "coherence"];

// Mots-clés du libellé d'un critère de grille → catégorie de score. Ordre significatif : les
// sous-catégories (plus précises) passent avant les axes.
const CORRESPONDANCES: [RegExp, CategorieScore][] = [
  [/m[ée]thodo/i, "methodologie"],
  [/biblio|r[ée]f[ée]rence|source|citation|webographie/i, "bibliographie"],
  [/forme|pr[ée]sentation|r[ée]daction|orthographe|langue|mise en page/i, "forme"],
  [/structure|plan|organisation|canevas/i, "structure"],
  [/coh[ée]ren/i, "coherence"],
];

/** Catégorie de score qui alimente un critère de la grille (explicite, sinon déduite du libellé). */
export function axeDuCritere(critere: Pick<CritereGrille, "libelle" | "axe">): CategorieScore {
  if (critere.axe) return critere.axe;
  for (const [motif, categorie] of CORRESPONDANCES) {
    if (motif.test(critere.libelle)) return categorie;
  }
  // Problématique, revue de littérature, analyse, discussion, conclusion... relèvent du fond.
  return "fond";
}

/**
 * Score global : moyenne des catégories pondérée par la grille du profil ; sans grille (ou grille
 * de poids nul), moyenne simple des quatre axes.
 */
export function calculerScoreGlobal(scores: ScoresDocument, grille?: CritereGrille[] | null): number {
  const criteres = (grille ?? []).filter((c) => c.poids > 0);
  const poidsTotal = criteres.reduce((total, c) => total + c.poids, 0);
  if (poidsTotal === 0) {
    const somme = AXES_PRINCIPAUX.reduce((total, axe) => total + scores[axe], 0);
    return Math.round(somme / AXES_PRINCIPAUX.length);
  }
  const somme = criteres.reduce((total, c) => total + scores[axeDuCritere(c)] * c.poids, 0);
  return Math.round(somme / poidsTotal);
}

export interface EvaluationSoumission {
  pret: boolean;
  bloquants: string[];
}

/**
 * « Prêt pour soumission » = score global ≥ seuil, aucune catégorie sous le minimum, aucune
 * erreur bloquante (chapitre obligatoire absent, règle imposée non respectée...).
 */
export function evaluerSoumission(params: {
  scores: ScoresDocument;
  scoreGlobal: number;
  seuilSoumission?: number | null;
  seuilCategorieMinimum?: number | null;
  points: Pick<PointAnalyse, "libelle" | "niveau" | "bloquant">[];
}): EvaluationSoumission {
  const seuil = params.seuilSoumission ?? SEUIL_SOUMISSION_DEFAUT;
  const minimum = params.seuilCategorieMinimum ?? SEUIL_CATEGORIE_DEFAUT;
  const bloquants: string[] = [];

  if (params.scoreGlobal < seuil) {
    bloquants.push(`Score global de ${params.scoreGlobal} % inférieur au seuil requis (${seuil} %).`);
  }
  for (const categorie of Object.keys(LIBELLES_CATEGORIE_SCORE) as CategorieScore[]) {
    const valeur = params.scores[categorie];
    if (valeur < minimum) {
      bloquants.push(
        `${LIBELLES_CATEGORIE_SCORE[categorie]} : ${valeur} % (minimum requis : ${minimum} %).`
      );
    }
  }
  for (const point of params.points) {
    if (point.niveau === "erreur" && point.bloquant) bloquants.push(point.libelle);
  }

  return { pret: bloquants.length === 0, bloquants };
}
