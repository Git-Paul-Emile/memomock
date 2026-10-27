/**
 * Orchestration de l'analyse d'un document (spec v2, § 23-25) :
 *  1. rassemble le référentiel applicable (profil, canevas, grille, normes de l'établissement,
 *     règles apprises adoptées) ;
 *  2. envoie le texte à l'IA (Gemini, ou simulation locale en repli) ;
 *  3. calcule le score global pondéré et l'état « Prêt pour soumission » ;
 *  4. enregistre les analyses et met à jour le document.
 *
 * En production, les étapes 3-4 seraient faites par le serveur ; ici l'API mock ne fait que
 * stocker, donc le client les enchaîne.
 */

import { apiDelete, apiGet, apiList, apiPatch, apiPost } from "./api";
import { analyserAvecIa } from "./ia/client";
import { simulerAnalyse } from "./mock-ai";
import type { ContexteAnalyse } from "./ia/contrats";
import { calculerScoreGlobal, evaluerSoumission, type ScoresDocument } from "./score";
import type {
  Analyse,
  ChapitreCanevas,
  ContenuDocument,
  ContraintesProfil,
  CritereChapitre,
  DocumentSubmission,
  GrilleEvaluation,
  NormesEtablissement,
  ProfilEncadrant,
  PublicUser,
  RegleApprise,
  TypeAnalyse,
} from "@/types";
import {
  LIBELLES_POSITION_PAGINATION,
  LIBELLES_STYLE_REDACTIONNEL,
  LIBELLES_VOIX_REDACTION,
} from "@/types";

export interface Referentiel {
  profil: ProfilEncadrant | null;
  grille: GrilleEvaluation | null;
  chapitres: ChapitreCanevas[];
  criteres: CritereChapitre[];
  normes: NormesEtablissement | null;
  reglesApprises: RegleApprise[];
}

/** Profil méthodologique applicable : celui enregistré sur le document, sinon le profil actif
 * de l'encadreur pour ce type de document. */
export async function resoudreProfil(
  document: Pick<DocumentSubmission, "profilEncadrantId" | "encadrantId" | "typeDocument">
): Promise<ProfilEncadrant | null> {
  if (document.profilEncadrantId) {
    const profil = await apiGet<ProfilEncadrant>("profils-encadrant", document.profilEncadrantId).catch(
      () => null
    );
    if (profil) return profil;
  }
  const { data } = await apiList<ProfilEncadrant>("profils-encadrant", {
    filtres: { encadrantId: document.encadrantId },
    limite: 50,
  });
  return (
    data.find((p) => p.actif && p.typeDocument === document.typeDocument) ??
    data.find((p) => p.actif) ??
    data[0] ??
    null
  );
}

/** Une règle apprise s'applique-t-elle à ce document, compte tenu de sa portée ? */
export function regleApplicable(
  regle: RegleApprise,
  document: Pick<DocumentSubmission, "id" | "typeDocument" | "discipline">
): boolean {
  switch (regle.niveau) {
    case "ponctuelle":
    case "projet":
      return regle.documentId === document.id;
    case "type_document":
      return !regle.typeDocument || regle.typeDocument === document.typeDocument;
    case "discipline":
      return (
        !regle.discipline ||
        regle.discipline.toLowerCase() === (document.discipline ?? "").toLowerCase()
      );
    default:
      return true;
  }
}

export async function chargerReferentiel(document: DocumentSubmission): Promise<Referentiel> {
  const profil = await resoudreProfil(document);
  const encadrant = await apiGet<PublicUser>("users", document.encadrantId).catch(() => null);

  const [grilles, chapitres, criteres, normes, regles] = await Promise.all([
    profil
      ? apiList<GrilleEvaluation>("grilles-evaluation", { filtres: { profilEncadrantId: profil.id } })
      : null,
    profil?.canevasId
      ? apiList<ChapitreCanevas>("chapitres-canevas", {
          filtres: { canevasId: profil.canevasId },
          limite: 200,
        })
      : null,
    profil?.canevasId ? apiList<CritereChapitre>("criteres-chapitre", { limite: 2000 }) : null,
    encadrant?.etablissementId
      ? apiList<NormesEtablissement>("normes-etablissement", {
          filtres: { etablissementId: encadrant.etablissementId },
        })
      : null,
    apiList<RegleApprise>("regles-apprises", {
      filtres: { encadrantId: document.encadrantId, statut: "adoptee" },
      limite: 500,
    }),
  ]);

  const idsChapitres = new Set((chapitres?.data ?? []).map((c) => c.id));
  return {
    profil,
    grille: grilles?.data[0] ?? null,
    chapitres: chapitres?.data ?? [],
    criteres: (criteres?.data ?? []).filter((c) => idsChapitres.has(c.chapitreId)),
    normes: normes?.data[0] ?? null,
    reglesApprises: regles.data.filter((r) => regleApplicable(r, document)),
  };
}

/** Normes de l'établissement mises en phrases, séparées entre imposées et valeurs par défaut. */
export function phrasesNormes(normes: NormesEtablissement | null): { imposees: string[]; defaut: string[] } {
  if (!normes) return { imposees: [], defaut: [] };
  const imposes = new Set(normes.champsImposes ?? []);
  const phrases: [keyof NormesEtablissement, string][] = [
    ["formatCitation", `Norme de citation : ${normes.formatCitation}`],
    ["sourcesMinimum", `Au moins ${normes.sourcesMinimum} sources bibliographiques`],
    ["positionPagination", `Pagination ${LIBELLES_POSITION_PAGINATION[normes.positionPagination].toLowerCase()}`],
    ["styleRedactionnel", `Style rédactionnel : ${LIBELLES_STYLE_REDACTIONNEL[normes.styleRedactionnel].toLowerCase()}`],
    ["voix", `Voix : ${LIBELLES_VOIX_REDACTION[normes.voix].toLowerCase()}`],
    ["police", `Police : ${normes.police}`],
    ["taillePolice", `Taille de police : ${normes.taillePolice}`],
    ["interligne", `Interligne : ${normes.interligne}`],
    ["margesCm", `Marges : ${normes.margesCm} cm`],
  ];
  const resultat = { imposees: [] as string[], defaut: [] as string[] };
  for (const [champ, phrase] of phrases) {
    (imposes.has(champ as never) ? resultat.imposees : resultat.defaut).push(phrase);
  }
  if (normes.typesSourcesAcceptees.length > 0) {
    resultat.defaut.push(`Types de sources acceptées : ${normes.typesSourcesAcceptees.join(", ")}`);
  }
  if (normes.partiesIntroduction > 0) {
    resultat.defaut.push(`Introduction en ${normes.partiesIntroduction} parties`);
  }
  return resultat;
}

export function phrasesContraintes(c: ContraintesProfil | null): string[] {
  if (!c) return [];
  return [
    c.norme && `Norme de citation : ${c.norme}`,
    c.ton && `Ton : ${c.ton}`,
    c.pagesMinimum && `Au moins ${c.pagesMinimum} pages`,
    c.police && `Police : ${c.police}`,
    c.interligne && `Interligne : ${c.interligne}`,
    c.marges && `Marges : ${c.marges}`,
    c.sectionsObligatoires?.length && `Sections obligatoires : ${c.sectionsObligatoires.join(", ")}`,
    c.consignesLibres && `Consignes : ${c.consignesLibres}`,
  ].filter((p): p is string => Boolean(p));
}

export function construireContexte(document: DocumentSubmission, ref: Referentiel): ContexteAnalyse {
  const profil = ref.profil;
  const normes = phrasesNormes(ref.normes);
  const premierNiveau = ref.chapitres.filter((c) => !c.parentId).sort((a, b) => a.ordre - b.ordre);
  return {
    titre: document.titre,
    typeDocument: document.typeDocument ?? profil?.typeDocument ?? null,
    discipline: document.discipline ?? profil?.discipline ?? null,
    sujet: document.sujet ?? null,
    problematique: document.problematique ?? null,
    regles: [
      ...normes.defaut.map((r) => `${r} (norme par défaut de l'établissement)`),
      ...phrasesContraintes(profil?.contraintes ?? null),
      ...(profil?.exigences ?? []).map((e) => `${e.titre}${e.description ? ` : ${e.description}` : ""}`),
      ...(profil?.normes ?? []).map((n) => `Norme : ${n.titre}`),
      ...(profil?.reglesProfil ?? [])
        .filter((r) => r.statut === "confirmee")
        .map((r) => `[${r.categorie}] ${r.libelle}`),
    ],
    reglesImposees: normes.imposees,
    reglesApprises: ref.reglesApprises.map((r) => r.regle),
    canevas: premierNiveau.map((c) => ({
      titre: c.titre,
      obligatoire: c.obligatoire,
      criteres: ref.criteres
        .filter((cr) => cr.chapitreId === c.id)
        .map((cr) => `${cr.libelle}${cr.obligatoire ? " (obligatoire)" : " (recommandé)"}`),
      sousSections: ref.chapitres.filter((s) => s.parentId === c.id).map((s) => s.titre),
    })),
    grille: (ref.grille?.criteres ?? []).map((c) => ({ libelle: c.libelle, poids: c.poids })),
  };
}

/** Enregistre (création ou remplacement) le texte d'un document. */
export async function enregistrerContenu(
  documentId: string,
  contenu: Pick<ContenuDocument, "texte" | "origine"> & { html?: string | null }
): Promise<void> {
  const maintenant = new Date().toISOString();
  const existant = await apiGet<ContenuDocument>("contenus-documents", documentId).catch(() => null);
  if (existant) {
    await apiPatch("contenus-documents", documentId, { ...contenu, updatedAt: maintenant });
  } else {
    await apiPost("contenus-documents", { id: documentId, documentId, ...contenu, updatedAt: maintenant });
  }
}

export async function chargerContenu(documentId: string): Promise<ContenuDocument | null> {
  return apiGet<ContenuDocument>("contenus-documents", documentId).catch(() => null);
}

/**
 * Lance l'analyse complète et met à jour le document. À appeler sans `await` après avoir passé
 * le document en `analyse_en_cours` : les écrans d'analyse surveillent la fin du traitement.
 */
export async function lancerAnalyseDocument(documentId: string): Promise<void> {
  const document = await apiGet<DocumentSubmission>("documents", documentId);
  try {
    const [referentiel, contenu] = await Promise.all([
      chargerReferentiel(document),
      chargerContenu(documentId),
    ]);
    const contexte = construireContexte(document, referentiel);
    const texte = contenu?.texte ?? "";

    // Sans texte exploitable (ancien .doc, données de démonstration), l'analyse réelle est
    // impossible : on passe directement par la simulation, qui l'indique comme telle.
    const { source, resultat } = texte
      ? await analyserAvecIa({ texte, contexte })
      : { source: "simulation" as const, resultat: simulerAnalyse("", contexte) };

    const scores: ScoresDocument = {
      forme: resultat.axes.forme.score,
      structure: resultat.axes.structure.score,
      fond: resultat.axes.fond.score,
      coherence: resultat.axes.coherence.score,
      methodologie: resultat.sousScores.methodologie,
      bibliographie: resultat.sousScores.bibliographie,
    };
    const scoreGlobal = calculerScoreGlobal(scores, referentiel.grille?.criteres);
    const tousLesPoints = Object.values(resultat.axes).flatMap((a) => a.points);
    const evaluation = evaluerSoumission({
      scores,
      scoreGlobal,
      seuilSoumission: referentiel.profil?.seuilSoumission,
      seuilCategorieMinimum: referentiel.profil?.seuilCategorieMinimum,
      points: tousLesPoints,
    });

    // Seule la dernière analyse compte : les précédentes sont remplacées.
    const anciennes = await apiList<Analyse>("analyses", { filtres: { documentId }, limite: 100 });
    // Tolérant : une analyse concurrente du même document a pu les supprimer entre-temps
    // (json-server répond alors 500).
    await Promise.all(anciennes.data.map((a) => apiDelete("analyses", a.id).catch(() => {})));

    const dateAnalyse = new Date().toISOString();
    await Promise.all(
      (Object.keys(resultat.axes) as TypeAnalyse[]).map((type) =>
        apiPost("analyses", {
          documentId,
          type,
          score: resultat.axes[type].score,
          dateAnalyse,
          source,
          points: resultat.axes[type].points.map((p, i) => ({ id: `${documentId}-${type}-${Date.now()}-${i}`, ...p })),
        })
      )
    );

    await apiPatch("documents", documentId, {
      statut: "analyse_terminee",
      scoreForme: scores.forme,
      scoreFond: scores.fond,
      scoreCoherence: scores.coherence,
      scoreStructure: scores.structure,
      scoreMethodologie: scores.methodologie,
      scoreBibliographie: scores.bibliographie,
      scoreConformite: scoreGlobal,
      pretPourSoumission: evaluation.pret,
      pointsBloquants: evaluation.bloquants,
      sourceAnalyse: source,
      profilEncadrantId: document.profilEncadrantId ?? referentiel.profil?.id ?? null,
      dateMaj: dateAnalyse,
    });
  } catch (err) {
    // Ne jamais laisser un document bloqué en « analyse en cours » : l'écran propose de relancer.
    await apiPatch("documents", documentId, { statut: "analyse_terminee", dateMaj: new Date().toISOString() }).catch(
      () => {}
    );
    throw err;
  }
}
