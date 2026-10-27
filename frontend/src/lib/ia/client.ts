/**
 * Appels aux routes /api/ia/* depuis les écrans, avec repli automatique sur la simulation locale
 * (lib/mock-ai.ts) si l'IA n'est pas configurée, surchargée ou injoignable. Le résultat indique
 * toujours sa source, pour que l'interface puisse l'afficher honnêtement.
 */

import { getToken } from "@/lib/api";
import {
  extraireReglesHeuristique,
  proposerReglesHeuristique,
  simulerAnalyse,
  simulerReponseTuteur,
} from "@/lib/mock-ai";
import type {
  RegleExtraite,
  RegleProposee,
  ReponseIA,
  RequeteAnalyse,
  RequeteExtractionRegles,
  RequetePropositionRegles,
  RequeteTuteur,
  ResultatAnalyseIA,
} from "./contrats";

const DELAI_CLIENT_MS = 150_000;

async function appeler<T>(chemin: string, corps: unknown, repli: () => T): Promise<ReponseIA<T>> {
  const controleur = new AbortController();
  const minuterie = setTimeout(() => controleur.abort(), DELAI_CLIENT_MS);
  try {
    const jeton = await getToken();
    const res = await fetch(`/api/ia/${chemin}`, {
      method: "POST",
      signal: controleur.signal,
      headers: {
        "Content-Type": "application/json",
        ...(jeton ? { Authorization: `Bearer ${jeton}` } : {}),
      },
      body: JSON.stringify(corps),
    });
    if (res.ok) return (await res.json()) as ReponseIA<T>;
  } catch {
    // Réseau coupé, délai dépassé : on retombe sur la simulation ci-dessous.
  } finally {
    clearTimeout(minuterie);
  }
  return { source: "simulation", resultat: repli() };
}

export function analyserAvecIa(requete: RequeteAnalyse): Promise<ReponseIA<ResultatAnalyseIA>> {
  return appeler("analyse", requete, () => simulerAnalyse(requete.texte, requete.contexte));
}

export function questionnerTuteur(requete: RequeteTuteur): Promise<ReponseIA<string>> {
  return appeler("tuteur", requete, simulerReponseTuteur);
}

export function extraireReglesAvecIa(
  requete: RequeteExtractionRegles
): Promise<ReponseIA<RegleExtraite[]>> {
  return appeler("extraire-regles", requete, () => extraireReglesHeuristique(requete.texte));
}

export function proposerReglesAvecIa(
  requete: RequetePropositionRegles
): Promise<ReponseIA<RegleProposee[]>> {
  return appeler("proposer-regles", requete, () => proposerReglesHeuristique(requete));
}

/** Libellé affiché à côté d'un résultat d'IA. */
export function libelleSourceIa(source: ReponseIA<unknown>["source"] | null | undefined): string {
  return source === "gemini" ? "Analyse Gemini" : "Analyse simulée (IA indisponible)";
}
