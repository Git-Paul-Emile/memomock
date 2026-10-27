/**
 * Création d'un profil méthodologique complet. Centralisé ici : les écrans qui créent un profil
 * (onboarding, sélecteur de profil) envoyaient auparavant un objet partiel, sans `encadrantId`,
 * si bien que le profil n'apparaissait jamais dans les listes de son encadreur.
 */

import { apiPost } from "./api";
import { SEUIL_CATEGORIE_DEFAUT, SEUIL_SOUMISSION_DEFAUT } from "./score";
import type { ProfilEncadrant, TypeDocument } from "@/types";

export function creerProfil(
  encadrantId: string,
  champs: { typeDocument: TypeDocument; discipline: string; nom?: string | null } & Partial<ProfilEncadrant>
): Promise<ProfilEncadrant> {
  const { typeDocument, discipline, nom, ...reste } = champs;
  return apiPost<ProfilEncadrant>("profils-encadrant", {
    encadrantId,
    typeDocument,
    discipline: discipline.trim(),
    nom: nom?.trim() || null,
    actif: true,
    guidesRedaction: [],
    memoiresModeles: [],
    normes: [],
    exigences: [],
    livrablesAttendus: [],
    reglesProfil: [],
    canevasId: null,
    contraintes: null,
    seuilSoumission: SEUIL_SOUMISSION_DEFAUT,
    seuilCategorieMinimum: SEUIL_CATEGORIE_DEFAUT,
    updatedAt: new Date().toISOString(),
    ...reste,
  });
}
