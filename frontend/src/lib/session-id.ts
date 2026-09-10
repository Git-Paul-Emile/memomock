/**
 * Id de session stable par appareil/navigateur (spec écran H8-H9, "Sessions actives"). Généré
 * une seule fois et conservé en `localStorage` : transmis à chaque requête authentifiée
 * (en-tête `X-Session-Id`, voir lib/api.ts) pour identifier l'appareil dans la liste
 * "Sessions actives" et permettre "Déconnecter les autres sessions" dans /parametres.
 *
 * Module séparé de auth-context.tsx et api.ts (qui l'utilisent tous les deux) pour éviter toute
 * dépendance circulaire entre eux.
 */
const CLE_SESSION_ID = "memoai-session-id";

export function obtenirSessionId(): string | undefined {
  if (typeof window === "undefined") return undefined;
  let id = window.localStorage.getItem(CLE_SESSION_ID);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(CLE_SESSION_ID, id);
  }
  return id;
}

/**
 * Oublie l'id de session courant, à appeler à la DÉCONNEXION.
 *
 * Sans cela, l'id survivait à la déconnexion : sur un poste partagé (salle informatique,
 * ordinateur familial, poste de démonstration), le compte suivant réutilisait la ligne
 * `SessionConnexion` du compte précédent, et la liste « Sessions actives » de /parametres
 * présentait comme une seule et même session deux connexions successives de deux personnes
 * différentes.
 *
 * Une nouvelle connexion génère donc désormais une nouvelle entrée, comme le font les listes
 * d'appareils connectés des grandes plateformes.
 */
export function oublierSessionId(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(CLE_SESSION_ID);
}
