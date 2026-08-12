/**
 * Petits utilitaires encore utilisés par l'écran de correction interactive côté étudiant.
 *
 * La génération de contenu IA elle-même (analyses forme/fond, réponses du tuteur de correction)
 * vit désormais côté backend (voir backend/src/workers/analyse.worker.js et
 * backend/src/modules/ia) - vrai LLM si OPENAI_API_KEY est configurée, gabarits simulés sinon.
 */

import type { AuteurMessage } from "@/types";

/** Calcule un nouveau score de conformité après un échange de correction (légère progression simulée). */
export function progresserScore(scoreActuel: number): number {
  const progression = 2 + Math.round(Math.random() * 5);
  return Math.min(100, scoreActuel + progression);
}

export function libelleAuteur(auteur: AuteurMessage): string {
  switch (auteur) {
    case "ia":
      return "Tuteur IA";
    case "encadrant":
      return "Encadrant";
    default:
      return "Vous";
  }
}
