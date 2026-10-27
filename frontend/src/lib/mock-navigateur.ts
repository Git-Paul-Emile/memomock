/**
 * Mock exécuté dans le navigateur (déploiement distant, ex. Vercel).
 *
 * Pourquoi : la route serveur `/api/mock` garde ses données dans la mémoire d'une fonction
 * serverless ; d'une requête à l'autre, Vercel peut changer d'instance ou la redémarrer, et un
 * document tout juste créé devient introuvable (404). Ici, chaque appel à `/api/mock/...` est
 * intercepté et traité localement (même moteur que json-server, lib/mock-db.ts), et les données
 * sont conservées dans le `localStorage` du navigateur : elles persistent entre les pages et les
 * rechargements.
 *
 * Limites assumées du mode démonstration : les données sont propres à chaque navigateur (un
 * étudiant et son encadreur doivent utiliser le même navigateur pour voir les échanges de l'un et
 * de l'autre), et elles sont réinitialisées quand `data.json` change au déploiement suivant.
 */

import { traiterRequete, type Base, type Ligne } from "./mock-db";

const PREFIXE = "/api/mock";
const CLE_DONNEES = "memoassistant-mock-db";
const CLE_EMPREINTE = "memoassistant-mock-db-empreinte";

let base: Base | null = null;
let chargement: Promise<Base> | null = null;
let fetchOriginal: typeof fetch | null = null;

// Empreinte courte du jeu initial : détecte un nouveau data.json déployé.
function empreinte(texte: string): string {
  let h = 0;
  for (let i = 0; i < texte.length; i++) h = (Math.imul(31, h) + texte.charCodeAt(i)) | 0;
  return `${texte.length}-${(h >>> 0).toString(36)}`;
}

function sauvegarder() {
  if (!base) return;
  try {
    localStorage.setItem(CLE_DONNEES, JSON.stringify(base));
  } catch (err) {
    // Quota dépassé ou stockage bloqué : les données restent en mémoire pour cet onglet.
    console.warn("[mock] données non sauvegardées localement", err);
  }
}

async function charger(): Promise<Base> {
  const reponse = await fetchOriginal!(PREFIXE, { headers: { Accept: "application/json" } });
  const texte = await reponse.text();
  const empreinteInitiale = empreinte(texte);
  try {
    const locales = localStorage.getItem(CLE_DONNEES);
    if (locales && localStorage.getItem(CLE_EMPREINTE) === empreinteInitiale) {
      return JSON.parse(locales) as Base;
    }
    localStorage.setItem(CLE_EMPREINTE, empreinteInitiale);
  } catch {
    // Stockage inaccessible (navigation privée stricte) : base en mémoire uniquement.
  }
  const initiale = JSON.parse(texte) as Base;
  base = initiale;
  sauvegarder();
  return initiale;
}

function obtenirBase(): Promise<Base> {
  if (base) return Promise.resolve(base);
  chargement ??= charger().then((b) => (base = b));
  return chargement;
}

function estRequeteMock(url: URL): boolean {
  return url.origin === window.location.origin && (url.pathname === PREFIXE || url.pathname.startsWith(`${PREFIXE}/`));
}

async function traiterLocalement(url: URL, init: RequestInit | undefined, requete: Request | null): Promise<Response> {
  const donnees = await obtenirBase();
  const methode = (init?.method ?? requete?.method ?? "GET").toUpperCase();
  const chemin = url.pathname.slice(PREFIXE.length).split("/").filter(Boolean).map(decodeURIComponent);
  let corps: Ligne | null = null;
  const brut = init?.body ?? (requete && methode !== "GET" ? await requete.text() : null);
  if (typeof brut === "string" && brut) {
    try {
      corps = JSON.parse(brut) as Ligne;
    } catch {
      corps = null;
    }
  }
  const reponse = traiterRequete(donnees, methode, chemin, url.searchParams, corps);
  if (methode !== "GET") sauvegarder();
  if (reponse.status === 204) return new Response(null, { status: 204 });
  return new Response(JSON.stringify(reponse.corps), {
    status: reponse.status,
    headers: { "Content-Type": "application/json", ...(reponse.entetes ?? {}) },
  });
}

/** Installe l'interception de `fetch` (une seule fois, côté navigateur uniquement). */
export function installerMockNavigateur(): void {
  if (typeof window === "undefined" || fetchOriginal) return;
  fetchOriginal = window.fetch.bind(window);
  window.fetch = (entree: RequestInfo | URL, init?: RequestInit) => {
    const requete = entree instanceof Request ? entree : null;
    const url = new URL(requete ? requete.url : String(entree), window.location.href);
    if (!estRequeteMock(url)) return fetchOriginal!(entree, init);
    return traiterLocalement(url, init, requete);
  };
  // Un autre onglet a modifié les données : on recharge la copie en mémoire.
  window.addEventListener("storage", (e) => {
    if (e.key === CLE_DONNEES && e.newValue) {
      try {
        base = JSON.parse(e.newValue) as Base;
      } catch {
        // Valeur illisible : on garde la copie actuelle.
      }
    }
  });
}

/** Repart du jeu de démonstration d'origine (data.json déployé). */
export async function reinitialiserDonneesDemo(): Promise<void> {
  try {
    localStorage.removeItem(CLE_DONNEES);
    localStorage.removeItem(CLE_EMPREINTE);
  } catch {
    // Rien à effacer.
  }
  base = null;
  chargement = null;
  await obtenirBase();
}

export function mockNavigateurActif(): boolean {
  return fetchOriginal !== null;
}
