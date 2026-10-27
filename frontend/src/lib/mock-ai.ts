/**
 * Simulation locale de l'IA : utilisée quand Gemini n'est pas configuré ou ne répond pas (quota,
 * surcharge, hors ligne). Produit des résultats de même forme que les routes /api/ia/*.
 *
 * Elle reste utile hors ligne : le contrôle de structure compare réellement le texte au canevas,
 * et l'extraction de règles repère les phrases d'exigence d'un guide. Le reste (points de forme,
 * de fond, réponses du tuteur) provient de gabarits.
 */

import type {
  ContexteAnalyse,
  PointAnalyseIA,
  RegleExtraite,
  RegleProposee,
  RequetePropositionRegles,
  ResultatAnalyseIA,
} from "@/lib/ia/contrats";
import type { AuteurMessage, CategorieRegle, TypeAnalyse } from "@/types";

const BANQUE_POINTS: Record<TypeAnalyse, PointAnalyseIA[]> = {
  forme: [
    {
      libelle: "Pagination conforme",
      detail: "Numérotation continue et correcte détectée sur l'ensemble du document.",
      niveau: "succes",
    },
    {
      libelle: "Police et interligne homogènes",
      detail: "La mise en forme respecte le gabarit attendu du début à la fin.",
      niveau: "succes",
    },
    {
      libelle: "Titres de niveau incohérents",
      detail:
        "Plusieurs titres de section utilisent une casse ou une numérotation différente du reste du document.",
      niveau: "attention",
    },
    {
      libelle: "Espacements irréguliers",
      detail: "Certains paragraphes présentent un interligne différent du reste du document.",
      niveau: "attention",
    },
    {
      libelle: "Bibliographie incomplète",
      detail:
        "Des références citées dans le texte n'apparaissent pas dans la bibliographie finale.",
      niveau: "erreur",
      sousCategorie: "bibliographie",
    },
    {
      libelle: "Sommaire absent",
      detail: "Aucune table des matières n'a été détectée en début de document.",
      niveau: "erreur",
    },
  ],
  fond: [
    {
      libelle: "Problématique clairement posée",
      detail: "La question de recherche est explicite et reformulée en conclusion.",
      niveau: "succes",
    },
    {
      libelle: "Argumentation structurée",
      detail: "Chaque partie s'appuie sur des sources identifiées.",
      niveau: "succes",
    },
    {
      libelle: "Transitions à renforcer",
      detail: "Le lien logique entre certaines sous-parties gagnerait à être explicité.",
      niveau: "attention",
    },
    {
      libelle: "Sources à diversifier",
      detail: "Une part importante des références provient d'un nombre restreint d'auteurs.",
      niveau: "attention",
      sousCategorie: "bibliographie",
    },
    {
      libelle: "Analyse critique insuffisante",
      detail: "Certains résultats sont présentés sans mise en perspective ni discussion.",
      niveau: "erreur",
      avisEncadreur: true,
    },
    {
      libelle: "Choix méthodologique à justifier",
      detail: "La méthode retenue est décrite mais son adéquation à la question de recherche n'est pas argumentée.",
      niveau: "attention",
      sousCategorie: "methodologie",
      avisEncadreur: true,
    },
  ],
  coherence: [
    {
      libelle: "Fil conducteur cohérent",
      detail:
        "Les grandes parties du document s'enchaînent logiquement autour de la problématique.",
      niveau: "succes",
    },
    {
      libelle: "Vocabulaire homogène",
      detail: "La terminologie employée reste cohérente d'une partie à l'autre.",
      niveau: "succes",
    },
    {
      libelle: "Redondances entre parties",
      detail: "Certains points sont développés à l'identique dans deux sections distinctes.",
      niveau: "attention",
    },
    {
      libelle: "Contradiction entre l'introduction et la conclusion",
      detail: "L'annonce de plan ne correspond pas exactement au déroulé final.",
      niveau: "erreur",
    },
  ],
  structure: [
    {
      libelle: "Découpage équilibré",
      detail: "La longueur des chapitres reste cohérente avec le plan attendu.",
      niveau: "succes",
    },
    {
      libelle: "Chapitre trop court",
      detail: "Une partie du document est nettement plus courte que ce qu'attend le canevas.",
      niveau: "attention",
    },
  ],
};

function tirerPoints(type: TypeAnalyse, nombre: number): PointAnalyseIA[] {
  return [...BANQUE_POINTS[type]].sort(() => Math.random() - 0.5).slice(0, nombre);
}

function calculerScore(points: PointAnalyseIA[]): number {
  const penalites = points.reduce((total, point) => {
    if (point.niveau === "erreur") return total + 15;
    if (point.niveau === "attention") return total + 6;
    return total;
  }, 0);
  return Math.max(40, Math.min(98, 95 - penalites));
}

function normaliser(texte: string): string {
  return texte
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, " ");
}

// Un titre de chapitre est « présent » si ses mots significatifs figurent dans le texte.
function titreRetrouve(titre: string, texteNormalise: string): boolean {
  const mots = normaliser(titre)
    .split(/\s+/)
    .filter((m) => m.length > 3 && !/^chapitre$|^partie$/.test(m));
  if (mots.length === 0) return true;
  return mots.filter((m) => texteNormalise.includes(m)).length >= Math.ceil(mots.length / 2);
}

/** Contrôle réel de la structure : chapitres obligatoires du canevas retrouvés dans le texte. */
function pointsStructure(texte: string, contexte: ContexteAnalyse | null): PointAnalyseIA[] {
  if (!texte || !contexte || contexte.canevas.length === 0) return tirerPoints("structure", 2);
  const texteNormalise = normaliser(texte);
  const absents = contexte.canevas.filter((c) => c.obligatoire && !titreRetrouve(c.titre, texteNormalise));
  const points: PointAnalyseIA[] = absents.map((c) => ({
    libelle: `Chapitre « ${c.titre} » absent`,
    detail: "Ce chapitre est obligatoire dans le canevas de votre encadreur mais n'a pas été retrouvé dans le document.",
    niveau: "erreur",
    regle: `Canevas : « ${c.titre} » obligatoire`,
    bloquant: true,
  }));
  if (absents.length === 0) {
    points.push({
      libelle: "Chapitres attendus présents",
      detail: "Toutes les parties obligatoires du canevas de l'encadreur ont été retrouvées.",
      niveau: "succes",
    });
  }
  return [...points, ...tirerPoints("structure", 1)];
}

/** Analyse simulée (forme, structure, fond, cohérence) - même forme que /api/ia/analyse. */
export function simulerAnalyse(texte: string, contexte: ContexteAnalyse | null): ResultatAnalyseIA {
  const axes = {} as ResultatAnalyseIA["axes"];
  for (const type of ["forme", "fond", "coherence"] as TypeAnalyse[]) {
    const points = tirerPoints(type, 2 + Math.round(Math.random()));
    axes[type] = { score: calculerScore(points), points };
  }
  const structure = pointsStructure(texte, contexte);
  axes.structure = { score: calculerScore(structure), points: structure };

  const scoreSous = (cat: "methodologie" | "bibliographie", base: number) => {
    const penalite = Object.values(axes)
      .flatMap((a) => a.points)
      .filter((p) => p.sousCategorie === cat && p.niveau !== "succes").length;
    return Math.max(40, Math.min(98, base - penalite * 10));
  };
  return {
    axes,
    sousScores: {
      methodologie: scoreSous("methodologie", axes.fond.score + 3),
      bibliographie: scoreSous("bibliographie", axes.forme.score),
    },
  };
}

const REPONSES_TUTEUR = [
  "C'est une bonne piste : essayez de reformuler cette idée en une phrase unique avant de la développer sur un paragraphe complet.",
  "Pensez à appuyer cette affirmation par une référence bibliographique précise plutôt qu'une généralité.",
  "Cette partie gagnerait à mieux relier vos résultats à votre problématique de départ.",
  "Attention à la cohérence des temps verbaux : privilégiez le présent de l'indicatif pour vos analyses.",
  "Une transition explicite entre ce paragraphe et le suivant aiderait le lecteur à suivre votre raisonnement.",
  "Essayez de nuancer cette conclusion : quelles sont les limites de votre démonstration ? C'est un point à discuter avec votre encadreur.",
  "Bonne remarque - n'oubliez pas de citer vos sources pour les chiffres que vous avancez ici.",
];

/** Réponse gabarit du tuteur IA (repli quand Gemini ne répond pas). */
export function simulerReponseTuteur(): string {
  return REPONSES_TUTEUR[Math.floor(Math.random() * REPONSES_TUTEUR.length)];
}

const MOTIFS_CATEGORIE: [RegExp, CategorieRegle][] = [
  [/apa|iso ?690|chicago|vancouver|mla|biblio|r[ée]f[ée]rence|source|citation/i, "bibliographie"],
  [/m[ée]thod|d[ée]marche|enqu[êe]te|[ée]chantillon|hypoth[èe]se/i, "methodologie"],
  [/bar[èe]me|not[ée]|crit[èe]re|[ée]valu|pond[ée]r|%/i, "evaluation"],
  [/chapitre|partie|section|introduction|conclusion|r[ée]sum[ée]|abstract|annexe|sommaire|plan/i, "structure"],
];

/**
 * Extraction heuristique des règles d'un guide : phrases contenant une marque d'exigence
 * (« doit », « obligatoire », « exigé »...) ou une valeur de mise en forme.
 */
export function extraireReglesHeuristique(texte: string): RegleExtraite[] {
  const exigence =
    /\b(doit|doivent|obligatoire|exig[ée]|imp[ée]ratif|requis|interdit|minimum|maximum|au moins|police|interligne|marges?|pagination)\b/i;
  const vues = new Set<string>();
  return texte
    .split(/(?<=[.;:!?])\s+|\n+/)
    .map((phrase) => phrase.replace(/^[#\-•*\d.)\s]+/, "").trim())
    .filter((phrase) => phrase.length >= 15 && phrase.length <= 220 && exigence.test(phrase))
    .filter((phrase) => {
      const cle = normaliser(phrase);
      if (vues.has(cle)) return false;
      vues.add(cle);
      return true;
    })
    .slice(0, 40)
    .map((phrase) => ({
      categorie: MOTIFS_CATEGORIE.find(([motif]) => motif.test(phrase))?.[1] ?? "forme",
      libelle: phrase,
      detail: null,
    }));
}

/**
 * Proposition heuristique de règles à partir des commentaires de l'encadreur : un commentaire
 * méthodologique ou scientifique exprime plus souvent une exigence générale qu'une remarque de forme.
 */
export function proposerReglesHeuristique(requete: RequetePropositionRegles): RegleProposee[] {
  const connues = new Set(requete.reglesExistantes.map(normaliser));
  return requete.commentaires
    .filter((c) => c.texte.trim().length >= 12 && !connues.has(normaliser(c.texte)))
    .slice(0, 6)
    .map((c) => ({
      regle: c.texte.trim(),
      confiance: c.categorie === "methodologique" || c.categorie === "scientifique" ? 62 : 45,
      niveau: c.categorie === "methodologique" || c.categorie === "scientifique" ? "type_document" : "ponctuelle",
    }));
}

export function libelleAuteur(auteur: AuteurMessage): string {
  switch (auteur) {
    case "ia":
      return "Tuteur IA";
    case "encadrant":
      return "Encadreur";
    default:
      return "Vous";
  }
}
