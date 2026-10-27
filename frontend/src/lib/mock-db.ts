/**
 * Moteur de l'API mock (comportement de json-server) indépendant du transport : utilisé par la
 * route serveur `/api/mock` et par le mock exécuté dans le navigateur en production
 * (lib/mock-navigateur.ts). Aucune dépendance à Next.js ni au DOM.
 */

export type Ligne = Record<string, unknown>;
export type Base = Record<string, Ligne[]>;

export interface ReponseMock {
  status: number;
  corps: unknown;
  entetes?: Record<string, string>;
}

function collection(base: Base, ressource: string): Ligne[] | null {
  const valeur = base[ressource];
  return Array.isArray(valeur) ? valeur : null;
}

function correspond(ligne: Ligne, params: URLSearchParams): boolean {
  for (const [cle, valeur] of params.entries()) {
    if (cle.startsWith("_") || cle === "q") continue;
    if (String(ligne[cle]) !== valeur) return false;
  }
  return true;
}

export function appliquerRequete(lignes: Ligne[], params: URLSearchParams): { lignes: Ligne[]; total: number } {
  let resultat = lignes.filter((l) => correspond(l, params));
  const recherche = params.get("q")?.trim().toLowerCase();
  if (recherche) resultat = resultat.filter((l) => JSON.stringify(l).toLowerCase().includes(recherche));

  const tri = params.get("_sort");
  if (tri) {
    const sens = params.get("_order") === "desc" ? -1 : 1;
    resultat = [...resultat].sort((a, b) => {
      const gauche = a[tri] as string | number;
      const droite = b[tri] as string | number;
      if (gauche === droite) return 0;
      return gauche > droite ? sens : -sens;
    });
  }

  const total = resultat.length;
  const page = Number(params.get("_page"));
  const limite = Number(params.get("_limit"));
  if (Number.isFinite(page) && page > 0 && Number.isFinite(limite) && limite > 0) {
    resultat = resultat.slice((page - 1) * limite, page * limite);
  }
  return { lignes: resultat, total };
}

function nouvelId(ressource: string, base: Base): string {
  const n = (collection(base, ressource)?.length ?? 0) + 1;
  return `${ressource}-${Date.now().toString(36)}-${n}-${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * Traite une requête REST sur la base (modifiée en place pour les écritures).
 * `chemin` : segments après le préfixe de l'API, ex. ["documents", "doc1"].
 */
export function traiterRequete(
  base: Base,
  methode: string,
  chemin: string[],
  params: URLSearchParams,
  corps: Ligne | null
): ReponseMock {
  const [ressource, id, action] = chemin.filter(Boolean);
  const verbe = methode.toUpperCase();

  if (verbe === "GET") {
    if (!ressource) return { status: 200, corps: base };
    if (ressource === "users" && id === "me" && action === "sessions") return { status: 200, corps: [] };
    const lignes = collection(base, ressource);
    if (!lignes) return { status: 404, corps: { message: "Ressource introuvable." } };
    if (id) {
      const ligne = lignes.find((l) => String(l.id) === id);
      return ligne ? { status: 200, corps: ligne } : { status: 404, corps: { message: "Élément introuvable." } };
    }
    const { lignes: resultat, total } = appliquerRequete(lignes, params);
    return { status: 200, corps: resultat, entetes: { "X-Total-Count": String(total) } };
  }

  if (verbe === "POST") {
    if (ressource === "public" || action === "anonymiser" || action === "revoquer-sessions") {
      return { status: 201, corps: { ok: true, id: nouvelId(ressource ?? "mock", base) } };
    }
    if (ressource === "documents" && id && action === "relancer-analyse") return { status: 200, corps: { ok: true } };
    const lignes = ressource ? collection(base, ressource) : null;
    if (!ressource || !lignes) return { status: 404, corps: { message: "Ressource introuvable." } };
    const cree: Ligne = {
      id: corps?.id ?? nouvelId(ressource, base),
      createdAt: corps?.createdAt ?? new Date().toISOString(),
      ...(corps ?? {}),
    };
    if (lignes.some((l) => String(l.id) === String(cree.id))) {
      return { status: 409, corps: { message: "Identifiant déjà utilisé." } };
    }
    lignes.push(cree);
    return { status: 201, corps: cree };
  }

  if (verbe === "PATCH" || verbe === "PUT") {
    const lignes = ressource ? collection(base, ressource) : null;
    if (!ressource || !id || !lignes) return { status: 404, corps: { message: "Ressource introuvable." } };
    const index = lignes.findIndex((l) => String(l.id) === id);
    if (index === -1) return { status: 404, corps: { message: "Élément introuvable." } };
    lignes[index] = verbe === "PUT" ? { ...(corps ?? {}), id: lignes[index].id } : { ...lignes[index], ...(corps ?? {}) };
    return { status: 200, corps: lignes[index] };
  }

  if (verbe === "DELETE") {
    const lignes = ressource ? collection(base, ressource) : null;
    if (!ressource || !id || !lignes) return { status: 404, corps: { message: "Ressource introuvable." } };
    const index = lignes.findIndex((l) => String(l.id) === id);
    if (index === -1) return { status: 404, corps: { message: "Élément introuvable." } };
    lignes.splice(index, 1);
    return { status: 204, corps: null };
  }

  return { status: 405, corps: { message: "Méthode non prise en charge." } };
}
