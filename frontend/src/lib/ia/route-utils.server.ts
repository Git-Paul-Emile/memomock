/**
 * Utilitaires communs aux routes /api/ia/* (serveur uniquement).
 */

import { NextResponse, type NextRequest } from "next/server";
import type { z } from "zod";

import { IaIndisponibleError, iaConfiguree } from "./gemini.server";

// Plafond du texte transmis au modèle (~100 pages) : protège le quota et le délai de réponse.
export const TEXTE_MAX_CARACTERES = 150_000;

/**
 * Lit et valide le corps JSON. Renvoie une réponse d'erreur prête à retourner si la requête est
 * invalide, si l'appelant n'est pas connecté (jeton mock) ou si l'IA n'est pas configurée.
 */
export async function lireRequete<T>(
  request: NextRequest,
  schema: z.ZodType<T>
): Promise<{ donnees: T } | { reponse: NextResponse }> {
  // Garde-fou minimal en mode mock : seul un utilisateur connecté (jeton présent) consomme le
  // quota Gemini. En production, vérifier un vrai jeton signé.
  if (!request.headers.get("authorization")?.startsWith("Bearer ")) {
    return { reponse: NextResponse.json({ message: "Authentification requise" }, { status: 401 }) };
  }
  if (!iaConfiguree()) {
    return {
      reponse: NextResponse.json({ message: "IA non configurée (GEMINI_API_KEY)" }, { status: 503 }),
    };
  }
  let brut: unknown;
  try {
    brut = await request.json();
  } catch {
    return { reponse: NextResponse.json({ message: "Corps JSON invalide" }, { status: 400 }) };
  }
  const resultat = schema.safeParse(brut);
  if (!resultat.success) {
    return { reponse: NextResponse.json({ message: "Requête invalide" }, { status: 400 }) };
  }
  return { donnees: resultat.data };
}

export function reponseErreurIa(err: unknown): NextResponse {
  if (err instanceof IaIndisponibleError) {
    console.warn("[ia]", err.message);
    return NextResponse.json({ message: "IA momentanément indisponible" }, { status: 503 });
  }
  console.error("[ia]", err);
  return NextResponse.json({ message: "Erreur interne de l'IA" }, { status: 500 });
}

export function borner(valeur: unknown, min = 0, max = 100): number {
  const n = typeof valeur === "number" && Number.isFinite(valeur) ? valeur : min;
  return Math.round(Math.min(max, Math.max(min, n)));
}

export function texteOuNull(valeur: unknown): string | null {
  return typeof valeur === "string" && valeur.trim() ? valeur.trim() : null;
}
