/**
 * Effets communs à toute décision de l'encadreur sur un document (valider, demander une
 * révision, refuser) : instantané de version et déclenchement de la boucle d'apprentissage.
 */

import { declencherApprentissage } from "./apprentissage";
import { journaliser } from "./audit";
import { creerVersion } from "./versions";
import type { DocumentSubmission, StatutDocument } from "@/types";

export async function finaliserDecision(
  document: DocumentSubmission,
  statut: Extract<StatutDocument, "valide" | "rejete" | "refuse">
): Promise<void> {
  await creerVersion(document, "encadrant", statut);
  await journaliser(
    statut === "valide" ? "Validation de document" : statut === "rejete" ? "Demande de révision" : "Refus de document",
    document.titre,
    `Version ${document.version}, score estimatif ${document.scoreConformite} %`
  );
  // Détection des préférences en arrière-plan : elle ne doit jamais retarder ni faire échouer
  // la décision (appel IA potentiellement long).
  void declencherApprentissage(document).catch(() => {});
}
