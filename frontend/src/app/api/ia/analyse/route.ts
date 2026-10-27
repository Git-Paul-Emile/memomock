import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import type { PointAnalyseIA, ReponseIA, ResultatAnalyseIA } from "@/lib/ia/contrats";
import { genererJson } from "@/lib/ia/gemini.server";
import {
  TEXTE_MAX_CARACTERES,
  borner,
  lireRequete,
  reponseErreurIa,
  texteOuNull,
} from "@/lib/ia/route-utils.server";
import type { NiveauAlerte, TypeAnalyse } from "@/types";

export const maxDuration = 120;

const schemaRequete = z.object({
  texte: z.string().min(1).max(TEXTE_MAX_CARACTERES * 2),
  contexte: z.object({
    titre: z.string(),
    typeDocument: z.enum(["licence", "master", "doctorat"]).nullable(),
    discipline: z.string().nullable(),
    sujet: z.string().nullable().optional(),
    problematique: z.string().nullable().optional(),
    regles: z.array(z.string()).max(300),
    reglesImposees: z.array(z.string()).max(100),
    reglesApprises: z.array(z.string()).max(200),
    canevas: z
      .array(
        z.object({
          titre: z.string(),
          obligatoire: z.boolean(),
          criteres: z.array(z.string()),
          sousSections: z.array(z.string()),
        })
      )
      .max(60),
    grille: z.array(z.object({ libelle: z.string(), poids: z.number() })).max(30),
  }),
});

const SCHEMA_POINT = {
  type: "object",
  properties: {
    libelle: { type: "string", description: "Constat court (moins de 12 mots)." },
    detail: {
      type: "string",
      description: "Explication concrète et conseil d'amélioration, sans réécrire le passage.",
    },
    niveau: { type: "string", enum: ["succes", "info", "attention", "erreur"] },
    regle: {
      type: "string",
      description: "Règle de l'encadreur ou de l'établissement concernée, mot pour mot ; vide sinon.",
    },
    passage: {
      type: "string",
      description: "Court extrait (moins de 25 mots) ou intitulé de section visé ; vide sinon.",
    },
    avisEncadreur: {
      type: "boolean",
      description: "Vrai si le point relève du jugement scientifique de l'encadreur.",
    },
    bloquant: {
      type: "boolean",
      description:
        "Vrai seulement pour une erreur majeure : chapitre obligatoire absent, critère obligatoire manquant, règle imposée non respectée, problème méthodologique majeur.",
    },
    sousCategorie: { type: "string", enum: ["methodologie", "bibliographie", "aucune"] },
  },
  required: ["libelle", "detail", "niveau", "regle", "passage", "avisEncadreur", "bloquant", "sousCategorie"],
};

const SCHEMA_AXE = {
  type: "object",
  properties: {
    score: { type: "integer", minimum: 0, maximum: 100 },
    // Pas de minItems/maxItems : au-delà d'une certaine complexité, Gemini rejette le schéma
    // (400 INVALID_ARGUMENT). Le nombre de points est cadré par le prompt et tronqué au retour.
    points: { type: "array", items: SCHEMA_POINT },
  },
  required: ["score", "points"],
};

const SCHEMA_REPONSE = {
  type: "object",
  properties: {
    axes: {
      type: "object",
      properties: { forme: SCHEMA_AXE, structure: SCHEMA_AXE, fond: SCHEMA_AXE, coherence: SCHEMA_AXE },
      required: ["forme", "structure", "fond", "coherence"],
    },
    sousScores: {
      type: "object",
      properties: {
        methodologie: { type: "integer", minimum: 0, maximum: 100 },
        bibliographie: { type: "integer", minimum: 0, maximum: 100 },
      },
      required: ["methodologie", "bibliographie"],
    },
  },
  required: ["axes", "sousScores"],
};

const SYSTEME = `Tu analyses un mémoire ou une thèse AVANT qu'il soit soumis à l'encadreur, selon les
exigences de CET encadreur (règles fournies), et non selon des règles génériques.
Quatre axes :
- forme : orthographe, grammaire, ponctuation, registre académique, citations, bibliographie, mise en
  forme décrite par le texte (titres, pagination, sommaire...) ;
- structure : présence des chapitres du canevas et de leurs critères (un chapitre ou critère
  OBLIGATOIRE absent = erreur bloquante) ;
- fond : argumentation, pertinence, méthodologie, qualité de l'analyse ;
- coherence : cohérence entre les parties (objectifs vs résultats, question de recherche vs
  méthodologie, annonce du plan vs déroulé).
Donne entre 2 et 6 points par axe. Le score de chaque axe (0-100) mesure la conformité estimée aux exigences configurées : ce n'est pas
une note. Les règles imposées par l'établissement priment sur toutes les autres. Cite la règle
concernée quand un point en découle. Mentionne aussi des points positifs (niveau "succes").
Le texte peut provenir d'une extraction PDF/Word imparfaite : ne signale pas les artefacts
d'extraction (coupures de mots, numéros de page isolés) comme des fautes.`;

const NIVEAUX: NiveauAlerte[] = ["succes", "info", "attention", "erreur"];
const AXES: TypeAnalyse[] = ["forme", "structure", "fond", "coherence"];

function normaliserPoint(brut: Record<string, unknown>): PointAnalyseIA {
  const niveau = NIVEAUX.includes(brut.niveau as NiveauAlerte) ? (brut.niveau as NiveauAlerte) : "info";
  const sous = brut.sousCategorie;
  return {
    libelle: texteOuNull(brut.libelle) ?? "Point d'analyse",
    detail: texteOuNull(brut.detail) ?? "",
    niveau,
    regle: texteOuNull(brut.regle),
    passage: texteOuNull(brut.passage),
    avisEncadreur: brut.avisEncadreur === true,
    bloquant: niveau === "erreur" && brut.bloquant === true,
    sousCategorie: sous === "methodologie" || sous === "bibliographie" ? sous : null,
  };
}

export async function POST(request: NextRequest) {
  const lecture = await lireRequete(request, schemaRequete);
  if ("reponse" in lecture) return lecture.reponse;
  const { texte, contexte } = lecture.donnees;

  const prompt = `RÉFÉRENTIEL DE L'ENCADREUR (JSON) :
${JSON.stringify(contexte, null, 1)}

DOCUMENT DE L'ÉTUDIANT (texte extrait${texte.length > TEXTE_MAX_CARACTERES ? ", tronqué" : ""}) :
"""
${texte.slice(0, TEXTE_MAX_CARACTERES)}
"""`;

  try {
    const { resultat, modele } = await genererJson<{
      axes: Record<string, { score: unknown; points: Record<string, unknown>[] }>;
      sousScores: Record<string, unknown>;
    }>(prompt, SCHEMA_REPONSE, { systeme: SYSTEME, temperature: 0.2 });

    const axes = Object.fromEntries(
      AXES.map((axe) => {
        const brut = resultat.axes?.[axe];
        return [
          axe,
          {
            score: borner(brut?.score),
            points: (Array.isArray(brut?.points) ? brut.points : []).slice(0, 8).map(normaliserPoint),
          },
        ];
      })
    ) as ResultatAnalyseIA["axes"];

    const corps: ReponseIA<ResultatAnalyseIA> = {
      source: "gemini",
      modele,
      resultat: {
        axes,
        sousScores: {
          methodologie: borner(resultat.sousScores?.methodologie),
          bibliographie: borner(resultat.sousScores?.bibliographie),
        },
      },
    };
    return NextResponse.json(corps);
  } catch (err) {
    return reponseErreurIa(err);
  }
}
