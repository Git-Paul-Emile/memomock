import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import type { RegleExtraite, ReponseIA } from "@/lib/ia/contrats";
import { genererJson } from "@/lib/ia/gemini.server";
import {
  TEXTE_MAX_CARACTERES,
  lireRequete,
  reponseErreurIa,
  texteOuNull,
} from "@/lib/ia/route-utils.server";
import type { CategorieRegle } from "@/types";

export const maxDuration = 120;

const schemaRequete = z.object({
  texte: z.string().min(1).max(TEXTE_MAX_CARACTERES * 2),
  titreRessource: z.string().max(300),
  typeDocument: z.enum(["licence", "master", "doctorat"]).nullable(),
  discipline: z.string().nullable(),
});

const CATEGORIES: CategorieRegle[] = ["forme", "bibliographie", "methodologie", "structure", "evaluation"];

const SCHEMA_REPONSE = {
  type: "object",
  properties: {
    regles: {
      type: "array",
      items: {
        type: "object",
        properties: {
          categorie: { type: "string", enum: CATEGORIES },
          libelle: {
            type: "string",
            description: "Règle vérifiable, formulée comme une exigence (ex. « Police Times New Roman 12 pt »).",
          },
          detail: { type: "string", description: "Précision ou citation du guide ; vide sinon." },
        },
        required: ["categorie", "libelle", "detail"],
      },
    },
  },
  required: ["regles"],
};

const SYSTEME = `Tu lis une ressource fournie par un encadreur (guide de rédaction, modèle, grille,
consignes) et tu en extrais les règles VÉRIFIABLES qu'il attend de ses étudiants. Classe chaque
règle : forme (police, marges, pagination, style), bibliographie (norme, nombre et type de
sources), methodologie (démarche, méthodes, justification), structure (parties et sections
attendues), evaluation (critères et barème). N'invente aucune règle absente du texte ; ignore les
généralités sans exigence concrète.`;

export async function POST(request: NextRequest) {
  const lecture = await lireRequete(request, schemaRequete);
  if ("reponse" in lecture) return lecture.reponse;
  const { texte, titreRessource, typeDocument, discipline } = lecture.donnees;

  const prompt = `Ressource : « ${titreRessource} » - profil ${typeDocument ?? "non précisé"}, discipline ${discipline ?? "non précisée"}.
"""
${texte.slice(0, TEXTE_MAX_CARACTERES)}
"""`;

  try {
    const { resultat, modele } = await genererJson<{ regles: Record<string, unknown>[] }>(
      prompt,
      SCHEMA_REPONSE,
      { systeme: SYSTEME, temperature: 0.1 }
    );
    const regles: RegleExtraite[] = (Array.isArray(resultat.regles) ? resultat.regles : [])
      .map((r) => ({
        categorie: CATEGORIES.includes(r.categorie as CategorieRegle)
          ? (r.categorie as CategorieRegle)
          : "forme",
        libelle: texteOuNull(r.libelle) ?? "",
        detail: texteOuNull(r.detail),
      }))
      .filter((r) => r.libelle)
      .slice(0, 60);
    const corps: ReponseIA<RegleExtraite[]> = { source: "gemini", modele, resultat: regles };
    return NextResponse.json(corps);
  } catch (err) {
    return reponseErreurIa(err);
  }
}
