import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import type { ReponseIA } from "@/lib/ia/contrats";
import { genererTexte } from "@/lib/ia/gemini.server";
import { lireRequete, reponseErreurIa } from "@/lib/ia/route-utils.server";

export const maxDuration = 60;

const schemaRequete = z.object({
  question: z.string().min(1).max(4000),
  historique: z
    .array(z.object({ auteur: z.enum(["etudiant", "ia"]), contenu: z.string().max(6000) }))
    .max(30),
  contexte: z.object({
    titre: z.string(),
    typeDocument: z.enum(["licence", "master", "doctorat"]).nullable(),
    points: z.array(z.string()).max(60),
    regles: z.array(z.string()).max(300),
    extrait: z.string().max(40_000),
  }),
});

const SYSTEME = `Tu es le tuteur IA de l'étudiant. Tu expliques pourquoi un passage ne respecte pas les
exigences de son encadreur, quelle règle s'applique et comment s'y prendre pour l'améliorer.
Tu n'écris PAS le texte à la place de l'étudiant : au plus une phrase d'exemple courte. Si la
question relève d'un choix scientifique (méthode, résultats, positionnement), invite l'étudiant à en
discuter avec son encadreur. Réponds en 150 mots maximum, en texte simple sans Markdown.`;

export async function POST(request: NextRequest) {
  const lecture = await lireRequete(request, schemaRequete);
  if ("reponse" in lecture) return lecture.reponse;
  const { question, historique, contexte } = lecture.donnees;

  const prompt = `Document : « ${contexte.titre} » (${contexte.typeDocument ?? "type non précisé"})
Règles de l'encadreur :
${contexte.regles.map((r) => `- ${r}`).join("\n") || "- (aucune règle explicite)"}
Points relevés par la dernière analyse :
${contexte.points.map((p) => `- ${p}`).join("\n") || "- (pas encore d'analyse)"}
Extrait du document :
"""
${contexte.extrait}
"""

Échange précédent :
${historique.map((m) => `${m.auteur === "ia" ? "Tuteur" : "Étudiant"} : ${m.contenu}`).join("\n")}

Question de l'étudiant : ${question}`;

  try {
    const { resultat, modele } = await genererTexte(prompt, { systeme: SYSTEME, temperature: 0.5 });
    const corps: ReponseIA<string> = { source: "gemini", modele, resultat };
    return NextResponse.json(corps);
  } catch (err) {
    return reponseErreurIa(err);
  }
}
