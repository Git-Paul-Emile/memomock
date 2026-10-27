/**
 * Accès au modèle Gemini (Google AI Studio) - CÔTÉ SERVEUR UNIQUEMENT.
 *
 * La clé `GEMINI_API_KEY` (frontend/.env.local, ou variable d'environnement Vercel) n'est lue
 * qu'ici, dans les routes /api/ia/* : elle n'est jamais exposée au navigateur (pas de préfixe
 * NEXT_PUBLIC_). Ne jamais importer ce module depuis un composant client.
 *
 * Résilience : les modèles Gemini les plus récents renvoient régulièrement « 503 high demand ».
 * Chaque appel essaie donc une chaîne de modèles (GEMINI_MODEL, liste séparée par des virgules),
 * avec un délai maximal par tentative ; si tout échoue, l'erreur remonte et la route répond
 * 503 - le client bascule alors sur la simulation locale (lib/mock-ai.ts).
 */

import { GoogleGenAI } from "@google/genai";

// Ordre choisi après mesure (oct. 2026) : 3.5-flash répond en ~7 s ; 3.8-flash est souvent saturé
// ou très lent, il ne sert qu'en dernier recours. Surchargeable par GEMINI_MODEL.
const MODELES_PAR_DEFAUT = ["gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-3.8-flash"];
const DELAI_PAR_TENTATIVE_MS = 40_000;

const SYSTEME_COMMUN = `Tu es MemoAssistant AI, assistant académique pour des étudiants et encadreurs
d'universités d'Afrique de l'Ouest et centrale (système LMD : Licence, Master, Doctorat ; références
CAMES). Tu écris en français correct, AVEC les accents. Tu ne remplaces jamais l'encadreur : tu
signales les points qui relèvent de son jugement scientifique, tu n'attribues aucune note
officielle et tu ne réécris pas le document à la place de l'étudiant.`;

export class IaIndisponibleError extends Error {}

export function iaConfiguree(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

export function modelesConfigures(): string[] {
  const configures = (process.env.GEMINI_MODEL ?? "")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
  return configures.length > 0 ? configures : MODELES_PAR_DEFAUT;
}

let client: GoogleGenAI | null = null;

function obtenirClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new IaIndisponibleError("GEMINI_API_KEY absente");
  client ??= new GoogleGenAI({ apiKey });
  return client;
}

interface OptionsAppel {
  systeme?: string;
  // Schéma JSON de la réponse attendue : absent = texte libre.
  schema?: Record<string, unknown>;
  temperature?: number;
}

async function appeler(prompt: string, options: OptionsAppel): Promise<{ texte: string; modele: string }> {
  const ai = obtenirClient();
  const erreurs: string[] = [];

  for (const modele of modelesConfigures()) {
    const controleur = new AbortController();
    const minuterie = setTimeout(() => controleur.abort(), DELAI_PAR_TENTATIVE_MS);
    try {
      const reponse = await ai.models.generateContent({
        model: modele,
        contents: prompt,
        config: {
          systemInstruction: [SYSTEME_COMMUN, options.systeme].filter(Boolean).join("\n\n"),
          temperature: options.temperature ?? 0.3,
          abortSignal: controleur.signal,
          ...(options.schema
            ? { responseMimeType: "application/json", responseJsonSchema: options.schema }
            : {}),
        },
      });
      const texte = reponse.text?.trim();
      if (texte) return { texte, modele };
      erreurs.push(`${modele}: réponse vide`);
    } catch (err) {
      erreurs.push(`${modele}: ${err instanceof Error ? err.message.slice(0, 160) : "erreur"}`);
    } finally {
      clearTimeout(minuterie);
    }
  }

  throw new IaIndisponibleError(`Aucun modèle Gemini disponible (${erreurs.join(" | ")})`);
}

/** Appel à réponse structurée : le JSON renvoyé est validé par le schéma côté Gemini. */
export async function genererJson<T>(
  prompt: string,
  schema: Record<string, unknown>,
  options: Omit<OptionsAppel, "schema"> = {}
): Promise<{ resultat: T; modele: string }> {
  const { texte, modele } = await appeler(prompt, { ...options, schema });
  try {
    return { resultat: JSON.parse(texte) as T, modele };
  } catch {
    throw new IaIndisponibleError(`Réponse JSON illisible (${modele})`);
  }
}

export async function genererTexte(
  prompt: string,
  options: Omit<OptionsAppel, "schema"> = {}
): Promise<{ resultat: string; modele: string }> {
  const { texte, modele } = await appeler(prompt, options);
  return { resultat: texte, modele };
}
