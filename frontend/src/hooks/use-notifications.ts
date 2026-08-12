"use client";

import { useQuery, type QueryKey } from "@tanstack/react-query";

import { apiList } from "@/lib/api";
import type { Notification } from "@/types";

/**
 * Clés de requête TanStack Query partagées pour les notifications.
 *
 * Racine commune `["notifications"]` : `AppShell` (badge de non-lues) et la page
 * `/notifications` (liste complète) utilisent chacun une sous-clé, mais un
 * `queryClient.invalidateQueries({ queryKey: ["notifications"] })` déclenché depuis l'un
 * invalide et rafraîchit automatiquement l'autre (correspondance par préfixe de TanStack
 * Query) - c'est ce qui corrige le badge qui ne se mettait pas à jour après avoir marqué une
 * notification comme lue.
 */
export function notificationsNonLuesCountKey(userId: string | undefined): QueryKey {
  return ["notifications", "non-lues-count", userId];
}

export function notificationsListeKey(
  userId: string | undefined,
  page: number,
  limite: number
): QueryKey {
  return ["notifications", "liste", userId, page, limite];
}

/** Nombre de notifications non lues de l'utilisateur courant (utilisé pour le badge de l'AppShell). */
export function useNotificationsNonLuesCount(userId: string | undefined) {
  const { data, ...rest } = useQuery({
    queryKey: notificationsNonLuesCountKey(userId),
    queryFn: () =>
      apiList<Notification>("notifications", { filtres: { userId, lu: false }, limite: 1 }),
    enabled: !!userId,
  });

  return { total: data?.total ?? 0, ...rest };
}
