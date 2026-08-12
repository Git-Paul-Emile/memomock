import type { DocumentSubmission } from "@/types";

/**
 * Résout l'écran étudiant pertinent pour un document selon son statut - centralisé ici (DRY)
 * car utilisé à la fois par le tableau de bord (`/etudiant/dashboard`) et la liste complète
 * (`/etudiant/documents`).
 */
export function lienDocumentEtudiant(doc: Pick<DocumentSubmission, "id" | "statut">): string {
  switch (doc.statut) {
    case "brouillon":
      return `/etudiant/soumission?documentId=${doc.id}`;
    case "soumis":
    case "analyse_en_cours":
    case "pret_pour_encadrant":
    case "en_relecture":
      return `/etudiant/documents/${doc.id}/analyse`;
    case "analyse_terminee":
    case "en_correction":
      return `/etudiant/documents/${doc.id}/correction`;
    case "valide":
    case "rejete":
    case "refuse":
      return `/etudiant/documents/${doc.id}/retour`;
    default:
      return `/etudiant/documents/${doc.id}/analyse`;
  }
}
