/**
 * Boucle d'apprentissage (spec v2, § 38) : après une décision de l'encadreur, le « Diff Engine »
 * compare la version analysée par l'IA et la version corrigée (segments barrés/ajoutés) ainsi que
 * les commentaires catégorisés, et PROPOSE des préférences. Aucune règle n'est appliquée sans que
 * l'encadreur l'adopte et en choisisse la portée (écran « Ce que l'IA a appris »).
 */

import { apiList, apiPost } from "./api";
import { proposerReglesAvecIa } from "./ia/client";
import type {
  CommentaireMarge,
  DocumentSubmission,
  RegleApprise,
  RevisionSegment,
} from "@/types";

/** Paires « avant → après » reconstituées paragraphe par paragraphe depuis les segments. */
export function correctionsDepuisSegments(segments: RevisionSegment[]): { avant: string; apres: string }[] {
  const parParagraphe = new Map<number, RevisionSegment[]>();
  for (const s of segments) {
    parParagraphe.set(s.paragraphe, [...(parParagraphe.get(s.paragraphe) ?? []), s]);
  }
  const corrections: { avant: string; apres: string }[] = [];
  for (const liste of parParagraphe.values()) {
    if (!liste.some((s) => s.type !== "normal")) continue;
    const tries = [...liste].sort((a, b) => a.ordre - b.ordre);
    corrections.push({
      avant: tries.filter((s) => s.type !== "ajoute").map((s) => s.texte).join("").trim(),
      apres: tries.filter((s) => s.type !== "supprime").map((s) => s.texte).join("").trim(),
    });
  }
  return corrections;
}

/**
 * Lance la détection et enregistre les règles proposées. Renvoie le nombre de propositions ;
 * une erreur ici ne doit jamais bloquer la décision de l'encadreur (l'appelant l'ignore).
 */
export async function declencherApprentissage(document: DocumentSubmission): Promise<number> {
  const [segments, commentaires, existantes] = await Promise.all([
    apiList<RevisionSegment>("revisions", { filtres: { documentId: document.id }, limite: 2000 }),
    apiList<CommentaireMarge>("commentaires-marge", { filtres: { documentId: document.id }, limite: 500 }),
    apiList<RegleApprise>("regles-apprises", { filtres: { encadrantId: document.encadrantId }, limite: 500 }),
  ]);

  const { resultat } = await proposerReglesAvecIa({
    typeDocument: document.typeDocument ?? null,
    discipline: document.discipline ?? null,
    corrections: correctionsDepuisSegments(segments.data).slice(0, 60),
    commentaires: commentaires.data.map((c) => ({ categorie: c.categorie ?? null, texte: c.texte })),
    reglesExistantes: existantes.data.map((r) => r.regle),
  });

  const maintenant = new Date().toISOString();
  await Promise.all(
    resultat.map((proposition) =>
      apiPost<RegleApprise>("regles-apprises", {
        encadrantId: document.encadrantId,
        regle: proposition.regle,
        source: `Comparaison IA / encadreur - « ${document.titre} » (V${document.version})`,
        confiance: proposition.confiance,
        statut: "proposee",
        dateApprentissage: maintenant,
        niveau: proposition.niveau,
        documentId: document.id,
        typeDocument: document.typeDocument ?? null,
        discipline: document.discipline ?? null,
      })
    )
  );

  if (resultat.length > 0) {
    await apiPost("notifications", {
      userId: document.encadrantId,
      titre: "Nouvelles préférences détectées",
      message: `${resultat.length} préférence(s) déduite(s) de vos corrections sur « ${document.titre} » attendent votre validation.`,
      type: "systeme",
      lu: false,
      date: maintenant,
    });
  }
  return resultat.length;
}
