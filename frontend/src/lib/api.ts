/**
 * Client HTTP pour l'API REST (json-server mock - data.json).
 *
 * Choix d'architecture : toute la logique de pagination / tri / filtre / recherche est
 * centralisée ici, pour respecter DRY et pour que les écrans (composants React) restent
 * uniquement responsables de l'affichage (séparation des responsabilités).
 *
 * Authentification : chaque requête embarque le jeton d'identité de l'utilisateur courant (voir
 * `getToken` ci-dessous), stocké localement en mode mock.
 *
 * Conventions REST respectées :
 *  - Client-serveur : le frontend ne connaît que l'URL de l'API (json-server sur :4000).
 *  - Sans état : chaque requête transporte tout le contexte nécessaire (jeton dans le header).
 *  - Interface uniforme : ressources nommées au pluriel (/documents, /users...), verbes HTTP
 *    standards (GET/POST/PATCH/DELETE), pagination/tri/filtre/recherche via query params.
 *  - json-server gère automatiquement la pagination et le filtrage via _page, _limit, _sort, _order.
 */

import { obtenirSessionId } from "./session-id";

// API json-server : mock local, données dans frontend/data.json
function resolveApiRootUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  if (typeof window === "undefined") return configuredUrl;

  const isRemoteApp = !["localhost", "127.0.0.1"].includes(window.location.hostname);
  const targetsLocalApi = configuredUrl.includes("localhost") || configuredUrl.includes("127.0.0.1");
  if (isRemoteApp && targetsLocalApi) return "/api/mock";

  return configuredUrl;
}

const API_ROOT_URL = resolveApiRootUrl();
export const API_BASE_URL = API_ROOT_URL;
// Health check (json-server /db endpoint)
export const API_HEALTH_URL = `${API_ROOT_URL}`;

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

/**
 * json-server retourne directement les données (tableau ou objet), sans enveloppe.
 * Les erreurs (erreur réseau, 404, etc.) sont signalées par un status HTTP.
 */
async function erreurDepuisReponse(res: Response): Promise<ApiError> {
  let message = res.statusText;
  try {
    const body = (await res.json()) as any;
    // json-server retourne parfois un message d'erreur en JSON
    if (body?.message) message = body.message;
  } catch {
    // Si le JSON n'est pas parsable, utiliser le statusText
  }
  return new ApiError(message, res.status);
}

/**
 * Jeton d'identité mock de l'utilisateur courant, ou `null` si personne n'est connecté.
 * Stocké en localStorage lors de la connexion.
 */
async function getToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("memoai_mock_user");
  if (!raw) return null;
  try {
    const user = JSON.parse(raw) as { id: string };
    return `mock-token-${user.id}`;
  } catch {
    return null;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getToken();
  const sessionId = obtenirSessionId();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(sessionId ? { "X-Session-Id": sessionId } : {}),
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) throw await erreurDepuisReponse(res);

  if (res.status === 204) return undefined as T;
  // json-server retourne directement les données, pas d'enveloppe
  return (await res.json()) as T;
}

export interface QueryOptions {
  page?: number;
  limite?: number;
  tri?: string; // nom du champ
  ordre?: "asc" | "desc";
  recherche?: string; // recherche plein texte (q=)
  filtres?: Record<string, string | number | boolean | undefined>;
}

export interface PageResult<T> {
  data: T[];
  total: number;
  page: number;
  limite: number;
  totalPages: number;
}

function buildQuery(options: QueryOptions = {}): string {
  const params = new URLSearchParams();
  const { page = 1, limite = 10, tri, ordre = "asc", recherche, filtres } = options;

  params.set("_page", String(page));
  params.set("_limit", String(limite));
  if (tri) {
    params.set("_sort", tri);
    params.set("_order", ordre);
  }
  if (recherche) params.set("q", recherche);
  if (filtres) {
    for (const [key, value] of Object.entries(filtres)) {
      if (value !== undefined && value !== "" && value !== "tous") {
        params.set(key, String(value));
      }
    }
  }
  return params.toString();
}

/** Liste paginée, triable, filtrable et cherchable d'une ressource REST. */
export async function apiList<T>(
  resource: string,
  options: QueryOptions = {}
): Promise<PageResult<T>> {
  const token = await getToken();
  const sessionId = obtenirSessionId();
  const query = buildQuery(options);
  const res = await fetch(`${API_BASE_URL}/${resource}?${query}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(sessionId ? { "X-Session-Id": sessionId } : {}),
    },
  });
  if (!res.ok) throw await erreurDepuisReponse(res);

  // json-server retourne directement le tableau
  const data = (await res.json()) as T[];
  // json-server expose le count total dans X-Total-Count
  const total = Number(res.headers.get("X-Total-Count") ?? data.length);
  const limite = options.limite ?? 10;
  return {
    data,
    total,
    page: options.page ?? 1,
    limite,
    totalPages: Math.max(1, Math.ceil(total / limite)),
  };
}

export function apiGet<T>(resource: string, id: string): Promise<T> {
  return request<T>(`/${resource}/${id}`);
}

/**
 * GET d'un endpoint public (pour les ressources accessibles avant toute authentification).
 * Actuellement, les FAQ et la liste des encadrants sont accessibles publiquement.
 * json-server retourne directement les données.
 */
export async function apiPublic<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}/${path}`, {
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw await erreurDepuisReponse(res);
  // json-server retourne directement les données
  return (await res.json()) as T;
}

export function apiPost<T>(resource: string, body: unknown): Promise<T> {
  return request<T>(`/${resource}`, { method: "POST", body: JSON.stringify(body) });
}

/**
 * Envoi de données (généralement pour créer une ressource avec données complexes).
 * Pour les vrais uploads de fichiers, voir apiPost avec FormData.
 */
export async function apiUpload<T>(resource: string, formData: FormData): Promise<T> {
  const token = await getToken();
  const sessionId = obtenirSessionId();
  const res = await fetch(`${API_BASE_URL}/${resource}`, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(sessionId ? { "X-Session-Id": sessionId } : {}),
    },
    body: formData,
  });

  if (!res.ok) throw await erreurDepuisReponse(res);

  // json-server retourne directement les données
  return (await res.json()) as T;
}

export function apiPatch<T>(resource: string, id: string, body: unknown): Promise<T> {
  return request<T>(`/${resource}/${id}`, { method: "PATCH", body: JSON.stringify(body) });
}

export function apiPut<T>(resource: string, id: string, body: unknown): Promise<T> {
  return request<T>(`/${resource}/${id}`, { method: "PUT", body: JSON.stringify(body) });
}

export function apiDelete(resource: string, id: string): Promise<void> {
  return request<void>(`/${resource}/${id}`, { method: "DELETE" });
}
