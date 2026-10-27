import data from "../../../../../data.json";
import { NextResponse, type NextRequest } from "next/server";

import { traiterRequete, type Base, type Ligne } from "@/lib/mock-db";

/**
 * API mock côté serveur (déploiement distant, quand json-server n'est pas disponible).
 *
 * Attention : sur Vercel, chaque fonction serverless a sa propre mémoire, qui disparaît au
 * redémarrage - les écritures ne sont donc pas fiables d'une requête à l'autre. En production, le
 * navigateur exécute le mock lui-même (lib/mock-navigateur.ts) et n'utilise cette route que pour
 * télécharger le jeu de données initial (`GET /api/mock`). Les autres verbes restent disponibles
 * pour les outils et les tests.
 */

const globalStore = globalThis as typeof globalThis & { __memoAiMockStore?: Base };

function base(): Base {
  globalStore.__memoAiMockStore ??= JSON.parse(JSON.stringify(data)) as Base;
  return globalStore.__memoAiMockStore;
}

async function traiter(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  const { path } = await context.params;
  const chemin = path ?? [];
  // Le jeu initial est toujours servi depuis data.json, jamais depuis la mémoire modifiée.
  // Mis en cache par le CDN : il ne change qu'au déploiement suivant (nouveau data.json).
  if (request.method === "GET" && chemin.length === 0) {
    return NextResponse.json(data, { headers: { "Cache-Control": "public, max-age=0, s-maxage=86400" } });
  }

  const corps = ["POST", "PATCH", "PUT"].includes(request.method)
    ? ((await request.json().catch(() => ({}))) as Ligne)
    : null;
  const reponse = traiterRequete(base(), request.method, chemin, request.nextUrl.searchParams, corps);
  if (reponse.status === 204) return new NextResponse(null, { status: 204 });
  return NextResponse.json(reponse.corps, { status: reponse.status, headers: reponse.entetes });
}

export const GET = traiter;
export const POST = traiter;
export const PATCH = traiter;
export const PUT = traiter;
export const DELETE = traiter;
