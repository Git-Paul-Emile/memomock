/**
 * Annuaire public des encadreurs (collection `encadrants`) : seule liste lisible avant connexion
 * (inscription, recherche « Rejoindre un encadreur »), sans donnée sensible - contrairement à
 * `users`, qui contient les mots de passe de démonstration.
 *
 * L'annuaire est une projection de `users` : il doit être mis à jour à chaque création ou
 * modification d'un compte encadreur, et quand sa charge (nombre d'étudiants suivis) change.
 */

import { apiGet, apiList, apiPatch, apiPost } from "./api";
import type { EncadrantPublic, PublicUser } from "@/types";

async function compterEtudiants(encadrantId: string): Promise<number> {
  const res = await apiList<PublicUser>("users", {
    filtres: { encadrantId, role: "etudiant" },
    limite: 1,
  });
  return res.total;
}

export function versEncadrantPublic(user: PublicUser, nbEtudiantsSuivis: number): EncadrantPublic {
  return {
    id: user.id,
    nom: user.nom,
    prenom: user.prenom,
    filiere: user.filiere ?? null,
    domainesExpertise: user.domainesExpertise ?? [],
    // Un compte désactivé n'est plus proposé à la mise en relation.
    disponible: user.actif === false ? false : (user.disponible ?? true),
    nbEtudiantsSuivis,
  };
}

/** Crée ou met à jour la fiche publique d'un encadreur. Sans effet pour les autres rôles. */
export async function publierEncadrant(user: PublicUser): Promise<void> {
  if (user.role !== "encadrant") return;
  const fiche = versEncadrantPublic(user, await compterEtudiants(user.id));
  const existante = await apiGet<EncadrantPublic>("encadrants", user.id).catch(() => null);
  if (existante) await apiPatch("encadrants", user.id, fiche);
  else await apiPost("encadrants", fiche);
}

/** Recalcule la charge affichée d'un encadreur (après le rattachement d'un étudiant). */
export async function rafraichirCharge(encadrantId: string): Promise<void> {
  const nb = await compterEtudiants(encadrantId);
  await apiPatch("encadrants", encadrantId, { nbEtudiantsSuivis: nb }).catch(() => {});
}
