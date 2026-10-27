import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import type { RegleProposee, ReponseIA } from "@/lib/ia/contrats";
import { genererJson } from "@/lib/ia/gemini.server";
import { borner, lireRequete, reponseErreurIa, texteOuNull } from "@/lib/ia/route-utils.server";
import type { NiveauRegle } from "@/types";

export const maxDuration = 60;

const schemaRequete = z.object({
  typeDocument: z.enum(["licence", "master", "doctorat"]).nullable(),
  discipline: z.string().nullable(),
  corrections: z.array(z.object({ avant: z.string().max(3000), apres: z.string().max(3000) })).max(80),
  commentaires: z
    .array(
      z.object({
        categorie: z.enum(["forme", "methodologique", "scientifique", "general"]).nullable(),
        texte: z.string().max(3000),
      })
    )
    .max(80),
  reglesExistantes: z.array(z.string()).max(300),
});

const NIVEAUX: NiveauRegle[] = ["ponctuelle", "projet", "type_document", "discipline", "generale"];

const SCHEMA_REPONSE = {
  type: "object",
  properties: {
    regles: {
      type: "array",
      items: {
        type: "object",
        properties: {
          regle: { type: "string", description: "Préférence formulée en une phrase (ex. « Exige une source pour toute affirmation statistique »)." },
          confiance: { type: "integer", minimum: 0, maximum: 100 },
          niveau: { type: "string", enum: NIVEAUX },
        },
        required: ["regle", "confiance", "niveau"],
      },
    },
  },
  required: ["regles"],
};

const SYSTEME = `Tu compares le texte analysé par l'IA et la version corrigée par l'encadreur, ainsi que
ses commentaires, pour détecter ses PRÉFÉRENCES RÉCURRENTES (Diff Engine). Toute correction n'est
pas une règle : une correction ponctuelle (faute isolée, cas propre au sujet) a le niveau
"ponctuelle" et une confiance faible. Ne propose une portée large ("type_document", "discipline",
"generale") que si la correction exprime clairement une exigence générale. N'invente rien et ne
reprends pas une règle déjà connue.`;

export async function POST(request: NextRequest) {
  const lecture = await lireRequete(request, schemaRequete);
  if ("reponse" in lecture) return lecture.reponse;
  const donnees = lecture.donnees;
  if (donnees.corrections.length === 0 && donnees.commentaires.length === 0) {
    const vide: ReponseIA<RegleProposee[]> = { source: "gemini", resultat: [] };
    return NextResponse.json(vide);
  }

  const prompt = `Profil : ${donnees.typeDocument ?? "non précisé"} - ${donnees.discipline ?? "discipline non précisée"}
Règles déjà connues :
${donnees.reglesExistantes.map((r) => `- ${r}`).join("\n") || "- (aucune)"}
Corrections de l'encadreur (avant → après) :
${donnees.corrections.map((c) => `- « ${c.avant} » → « ${c.apres} »`).join("\n") || "- (aucune)"}
Commentaires de l'encadreur :
${donnees.commentaires.map((c) => `- [${c.categorie ?? "non classé"}] ${c.texte}`).join("\n") || "- (aucun)"}`;

  try {
    const { resultat, modele } = await genererJson<{ regles: Record<string, unknown>[] }>(
      prompt,
      SCHEMA_REPONSE,
      { systeme: SYSTEME, temperature: 0.2 }
    );
    const regles: RegleProposee[] = (Array.isArray(resultat.regles) ? resultat.regles : [])
      .map((r) => ({
        regle: texteOuNull(r.regle) ?? "",
        confiance: borner(r.confiance),
        niveau: NIVEAUX.includes(r.niveau as NiveauRegle) ? (r.niveau as NiveauRegle) : "ponctuelle",
      }))
      .filter((r) => r.regle)
      .slice(0, 8);
    const corps: ReponseIA<RegleProposee[]> = { source: "gemini", modele, resultat: regles };
    return NextResponse.json(corps);
  } catch (err) {
    return reponseErreurIa(err);
  }
}
