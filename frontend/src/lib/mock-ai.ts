/**
 * Simulation locale de l'IA (aucun backend/LLM réel dans ce projet - voir frontend/data.json et
 * lib/api.ts) : génération d'analyses forme/fond/cohérence/structure et de réponses du tuteur de
 * correction, à partir de gabarits.
 */

import { apiPatch, apiPost } from "./api";
import { sleep } from "./utils";
import type { Analyse, AuteurMessage, NiveauAlerte, PointAnalyse, TypeAnalyse } from "@/types";

interface PointGabarit {
  libelle: string;
  detail: string;
  niveau: NiveauAlerte;
}

const BANQUE_POINTS: Record<TypeAnalyse, PointGabarit[]> = {
  forme: [
    { libelle: "Pagination conforme", detail: "Numérotation continue et correcte détectée sur l'ensemble du document.", niveau: "succes" },
    { libelle: "Police et interligne homogènes", detail: "La mise en forme respecte le gabarit attendu du début à la fin.", niveau: "succes" },
    { libelle: "Titres de niveau incohérents", detail: "Plusieurs titres de section utilisent une casse ou une numérotation différente du reste du document.", niveau: "attention" },
    { libelle: "Espacements irréguliers", detail: "Certains paragraphes présentent un interligne différent du reste du document.", niveau: "attention" },
    { libelle: "Bibliographie incomplète", detail: "Des références citées dans le texte n'apparaissent pas dans la bibliographie finale.", niveau: "erreur" },
    { libelle: "Sommaire absent", detail: "Aucune table des matières n'a été détectée en début de document.", niveau: "erreur" },
  ],
  fond: [
    { libelle: "Problématique clairement posée", detail: "La question de recherche est explicite et reformulée en conclusion.", niveau: "succes" },
    { libelle: "Argumentation structurée", detail: "Chaque partie s'appuie sur des sources identifiées.", niveau: "succes" },
    { libelle: "Transitions à renforcer", detail: "Le lien logique entre certaines sous-parties gagnerait à être explicité.", niveau: "attention" },
    { libelle: "Sources à diversifier", detail: "Une part importante des références provient d'un nombre restreint d'auteurs.", niveau: "attention" },
    { libelle: "Analyse critique insuffisante", detail: "Certains résultats sont présentés sans mise en perspective ni discussion.", niveau: "erreur" },
  ],
  coherence: [
    { libelle: "Fil conducteur cohérent", detail: "Les grandes parties du document s'enchaînent logiquement autour de la problématique.", niveau: "succes" },
    { libelle: "Vocabulaire homogène", detail: "La terminologie employée reste cohérente d'une partie à l'autre.", niveau: "succes" },
    { libelle: "Redondances entre parties", detail: "Certains points sont développés à l'identique dans deux sections distinctes.", niveau: "attention" },
    { libelle: "Contradiction entre l'introduction et la conclusion", detail: "L'annonce de plan ne correspond pas exactement au déroulé final.", niveau: "erreur" },
  ],
  structure: [
    { libelle: "Chapitres attendus présents", detail: "Toutes les parties du canevas de l'encadrant ont été identifiées dans le document.", niveau: "succes" },
    { libelle: "Découpage équilibré", detail: "La longueur des chapitres reste cohérente avec le plan attendu.", niveau: "succes" },
    { libelle: "Chapitre trop court", detail: "Une partie du document est nettement plus courte que ce qu'attend le canevas.", niveau: "attention" },
    { libelle: "Chapitre manquant", detail: "Une partie attendue par le canevas de l'encadrant n'a pas été retrouvée dans le document.", niveau: "erreur" },
  ],
};

function tirerPoints(type: TypeAnalyse, nombre: number, prefixeId: string): PointAnalyse[] {
  const melange = [...BANQUE_POINTS[type]].sort(() => Math.random() - 0.5);
  return melange.slice(0, nombre).map((point, index) => ({
    id: `${prefixeId}-${type}-${index}`,
    ...point,
  }));
}

function calculerScore(points: PointAnalyse[]): number {
  const penalites = points.reduce((total, point) => {
    if (point.niveau === "erreur") return total + 15;
    if (point.niveau === "attention") return total + 6;
    return total;
  }, 0);
  return Math.max(40, Math.min(98, 95 - penalites));
}

export interface AnalysesGenerees {
  analyses: Array<Omit<Analyse, "id">>;
  scoreForme: number;
  scoreFond: number;
  scoreCoherence: number;
  scoreConformite: number;
}

/** Génère un jeu d'analyses forme/fond/cohérence/structure simulées pour un document. */
export function genererAnalyses(documentId: string): AnalysesGenerees {
  const dateAnalyse = new Date().toISOString();
  const prefixeId = `${documentId}-${Date.now()}`;
  const types: TypeAnalyse[] = ["forme", "fond", "coherence", "structure"];

  const analyses = types.map((type) => {
    const points = tirerPoints(type, 2 + Math.round(Math.random()), prefixeId);
    return { documentId, type, score: calculerScore(points), points, dateAnalyse };
  });

  const scoreDe = (type: TypeAnalyse) => analyses.find((a) => a.type === type)?.score ?? 80;
  const scoreForme = scoreDe("forme");
  const scoreFond = scoreDe("fond");
  const scoreCoherence = scoreDe("coherence");
  const scoreConformite = Math.round((scoreForme + scoreFond + scoreCoherence) / 3);

  return { analyses, scoreForme, scoreFond, scoreCoherence, scoreConformite };
}

/**
 * Génère puis persiste une analyse simulée pour un document (à appeler sans `await` juste après
 * avoir mis le document en `analyse_en_cours` : le polling déjà en place sur l'écran d'analyse
 * détecte la fin du traitement).
 */
export async function lancerAnalyseSimulee(documentId: string): Promise<void> {
  await sleep(3000 + Math.round(Math.random() * 2000));
  const { analyses, scoreForme, scoreFond, scoreCoherence, scoreConformite } =
    genererAnalyses(documentId);
  await Promise.all(analyses.map((analyse) => apiPost("analyses", analyse)));
  await apiPatch("documents", documentId, {
    statut: "analyse_terminee",
    scoreForme,
    scoreFond,
    scoreCoherence,
    scoreConformite,
    dateMaj: new Date().toISOString(),
  });
}

const REPONSES_TUTEUR = [
  "C'est une bonne piste : essayez de reformuler cette idée en une phrase unique avant de la développer sur un paragraphe complet.",
  "Pensez à appuyer cette affirmation par une référence bibliographique précise plutôt qu'une généralité.",
  "Cette partie gagnerait à mieux relier vos résultats à votre problématique de départ.",
  "Attention à la cohérence des temps verbaux : privilégiez le présent de l'indicatif pour vos analyses.",
  "Une transition explicite entre ce paragraphe et le suivant aiderait le lecteur à suivre votre raisonnement.",
  "Essayez de nuancer cette conclusion : quelles sont les limites de votre démonstration ?",
  "Bonne remarque - n'oubliez pas de citer vos sources pour les chiffres que vous avancez ici.",
];

/** Choisit une réponse gabarit du tuteur IA (pas de vrai LLM dans ce projet). */
export function genererReponseTuteur(): string {
  return REPONSES_TUTEUR[Math.floor(Math.random() * REPONSES_TUTEUR.length)];
}

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
