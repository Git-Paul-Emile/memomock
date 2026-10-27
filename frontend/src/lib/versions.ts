/**
 * Gestion des versions d'un document (spec v2, § 29, § 37) : chaque transition clé (soumission
 * de l'étudiant, décision de l'encadreur) fige un instantané - scores, statut, texte extrait.
 */

import { apiList, apiPost } from "./api";
import { chargerContenu } from "./analyse-document";
import type { CommentaireMarge, DocumentSubmission, StatutDocument, VersionDocument } from "@/types";

export async function listerVersions(documentId: string): Promise<VersionDocument[]> {
  const { data } = await apiList<VersionDocument>("versions", {
    filtres: { documentId },
    limite: 200,
    tri: "numero",
    ordre: "asc",
  });
  return data;
}

/**
 * Crée l'instantané. Une soumission de l'étudiant ouvre un nouveau numéro de version ; une
 * décision de l'encadreur fige l'état de la version en cours (même numéro).
 */
export async function creerVersion(
  document: DocumentSubmission,
  auteur: VersionDocument["auteur"],
  statut: StatutDocument = auteur === "etudiant" ? "pret_pour_encadrant" : document.statut
): Promise<VersionDocument> {
  const [versions, contenu] = await Promise.all([listerVersions(document.id), chargerContenu(document.id)]);
  const dernier = versions.reduce((max, v) => Math.max(max, v.numero), 0);
  const numero = auteur === "etudiant" ? (dernier === 0 ? Math.max(1, document.version) : dernier + 1) : Math.max(1, dernier);
  return apiPost<VersionDocument>("versions", {
    documentId: document.id,
    numero,
    statut,
    scoreConformite: document.scoreConformite,
    scoreForme: document.scoreForme,
    scoreFond: document.scoreFond,
    scoreCoherence: document.scoreCoherence ?? 0,
    urlFichier: document.urlFichier ?? null,
    texteExtrait: contenu?.texte ?? null,
    auteur,
    createdAt: new Date().toISOString(),
  });
}

/** Bilan des commentaires pour la comparaison entre deux versions (spec v2, § 37). */
export function bilanCommentaires(commentaires: CommentaireMarge[]) {
  const resolus = commentaires.filter((c) => c.resolu).length;
  return { total: commentaires.length, resolus, ouverts: commentaires.length - resolus };
}
