/**
 * Traçabilité des actions sensibles (écran /admin/journal-audit). En production, l'écriture
 * serait faite côté serveur ; ici le client l'ajoute, sans jamais bloquer l'action tracée.
 */

import { apiPost } from "./api";
import type { JournalAudit, PublicUser } from "@/types";

function acteurCourant(): Pick<PublicUser, "id" | "role"> | null {
  if (typeof window === "undefined") return null;
  try {
    const brut = localStorage.getItem("memoai_mock_user");
    return brut ? (JSON.parse(brut) as Pick<PublicUser, "id" | "role">) : null;
  } catch {
    return null;
  }
}

export async function journaliser(action: string, cible: string, details: string | null = null): Promise<void> {
  const acteur = acteurCourant();
  await apiPost<JournalAudit>("journal-audit", {
    acteurId: acteur?.id ?? "inconnu",
    acteurRole: acteur?.role ?? "inconnu",
    action,
    cible,
    details,
    createdAt: new Date().toISOString(),
  }).catch(() => {});
}
