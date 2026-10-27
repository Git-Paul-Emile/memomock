/**
 * Verrouillage des chapitres validés (spec v2, § 35) : une fois un chapitre validé par
 * l'encadreur, l'étudiant ne peut plus le modifier - ni dans l'éditeur de la plateforme, ni en
 * réimportant un fichier - tant que l'encadreur ne l'a pas déverrouillé.
 *
 * La comparaison porte sur le texte normalisé de chaque section (titre « ## » + contenu jusqu'au
 * titre suivant) : casse, ponctuation et espaces sont ignorés, pour qu'un même chapitre réimporté
 * depuis Word ou PDF ne soit pas considéré comme modifié.
 */

import { apiGet, apiList } from "./api";
import { resoudreProfil } from "./analyse-document";
import type { ChapitreCanevas, DocumentSubmission, ValidationChapitre } from "@/types";

export function normaliserTexte(texte: string): string {
  return texte
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Découpe un texte en sections par titre « ## » : [titre normalisé, contenu normalisé]. */
export function sections(texte: string): [string, string][] {
  const resultat: [string, string][] = [];
  let titre: string | null = null;
  let contenu: string[] = [];
  const pousser = () => {
    if (titre !== null) resultat.push([normaliserTexte(titre), normaliserTexte(contenu.join(" "))]);
  };
  for (const ligne of texte.split(/\n+/)) {
    if (ligne.startsWith("## ")) {
      pousser();
      titre = ligne.slice(3);
      contenu = [];
    } else if (titre !== null) {
      contenu.push(ligne);
    }
  }
  pousser();
  return resultat;
}

// Un titre de section correspond à un chapitre si l'un contient l'autre (ex. « CHAPITRE 2 :
// MÉTHODOLOGIE » pour le chapitre « Méthodologie »).
function correspond(titreSection: string, titreChapitre: string): boolean {
  const chapitre = normaliserTexte(titreChapitre);
  return chapitre.length > 0 && (titreSection.includes(chapitre) || chapitre.includes(titreSection));
}

function contenuChapitre(liste: [string, string][], titreChapitre: string): string | null {
  const trouvee = liste.find(([titre]) => correspond(titre, titreChapitre));
  return trouvee ? trouvee[1] : null;
}

/**
 * Chapitres verrouillés dont le contenu a changé (ou disparu) entre l'ancien et le nouveau texte.
 * Un chapitre absent de l'ancien texte n'est pas contrôlé (rien à protéger).
 */
export function chapitresModifies(ancien: string, nouveau: string, titresVerrouilles: string[]): string[] {
  const avant = sections(ancien);
  const apres = sections(nouveau);
  return titresVerrouilles.filter((titre) => {
    const contenuAvant = contenuChapitre(avant, titre);
    if (contenuAvant === null) return false;
    return contenuChapitre(apres, titre) !== contenuAvant;
  });
}

/** Titres des chapitres validés et verrouillés d'un document. */
export async function titresVerrouilles(document: DocumentSubmission): Promise<string[]> {
  const [profil, validations] = await Promise.all([
    resoudreProfil(document),
    apiList<ValidationChapitre>("validations-chapitre", { filtres: { documentId: document.id }, limite: 200 }),
  ]);
  const ids = validations.data.filter((v) => v.verrouille).map((v) => v.chapitreId);
  if (!profil?.canevasId || ids.length === 0) return [];
  const chapitres = await apiList<ChapitreCanevas>("chapitres-canevas", {
    filtres: { canevasId: profil.canevasId },
    limite: 200,
  });
  return chapitres.data.filter((c) => ids.includes(c.id)).map((c) => c.titre);
}

/** Variante pratique quand seul l'identifiant du document est connu. */
export async function titresVerrouillesParId(documentId: string): Promise<string[]> {
  const document = await apiGet<DocumentSubmission>("documents", documentId);
  return titresVerrouilles(document);
}

export function messageVerrouillage(chapitres: string[]): string {
  return `Chapitre(s) validé(s) et verrouillé(s) modifié(s) : ${chapitres.join(", ")}. Restaurez leur contenu ou demandez à votre encadreur de les déverrouiller.`;
}
