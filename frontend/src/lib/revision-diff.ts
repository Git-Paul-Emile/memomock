import { diffWords } from "diff";

import type { RevisionSegment, TypeSegment } from "@/types";

/**
 * Reconstitue le texte "actuel" d'un paragraphe à partir de ses segments de révision : les
 * segments "normal" et "ajoute" forment le texte de travail, les segments "supprime" restent
 * visibles dans l'écran de retour (barrés) mais ne font plus partie du texte que l'encadrant
 * continue de corriger.
 */
export function texteCourantDuParagraphe(segments: RevisionSegment[]): string {
  return segments
    .filter((s) => s.type !== "supprime")
    .map((s) => s.texte)
    .join("");
}

/**
 * Calcule les segments de révision (barré/souligné/normal) entre le texte précédent d'un
 * paragraphe et sa nouvelle version éditée dans TipTap - c'est la "capture de l'écart" du mémo
 * de cadrage : chaque mot supprimé reste visible barré, chaque mot ajouté est souligné, le reste
 * est inchangé.
 */
export function calculerSegments(
  paragraphe: number,
  ancienTexte: string,
  nouveauTexte: string
): Array<{ paragraphe: number; ordre: number; texte: string; type: TypeSegment }> {
  if (ancienTexte === nouveauTexte) {
    return nouveauTexte ? [{ paragraphe, ordre: 0, texte: nouveauTexte, type: "normal" }] : [];
  }

  const parties = diffWords(ancienTexte, nouveauTexte);
  return parties.map((partie, index) => ({
    paragraphe,
    ordre: index,
    texte: partie.value,
    type: partie.added ? "ajoute" : partie.removed ? "supprime" : "normal",
  }));
}
