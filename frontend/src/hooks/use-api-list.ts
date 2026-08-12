"use client";

import * as React from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { apiList, type PageResult, type QueryOptions } from "@/lib/api";

interface UseApiListResult<T> {
  data: T[];
  total: number;
  totalPages: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Hook générique pour consommer une ressource REST paginée/triable/filtrable/cherchable.
 * Toute la logique réseau est mutualisée ici (DRY) : les écrans se contentent de fournir
 * la ressource et les options de requête, et reçoivent un état prêt à afficher.
 *
 * En interne, s'appuie sur TanStack Query (`useQuery`) : mise en cache par clé de requête,
 * dédoublonnage des appels concurrents, et `keepPreviousData` pour éviter un flash de
 * chargement lors d'un changement de page/tri/filtre (l'ancienne page reste affichée pendant
 * que la nouvelle se charge). L'API publique du hook (forme du retour) est inchangée pour ne
 * pas impacter les écrans qui l'utilisent déjà.
 */
export function useApiList<T>(resource: string, options: QueryOptions = {}): UseApiListResult<T> {
  const optionsKey = JSON.stringify(options);

  const { data, isLoading, isPlaceholderData, error, refetch } = useQuery({
    queryKey: ["api-list", resource, optionsKey],
    queryFn: () => apiList<T>(resource, JSON.parse(optionsKey)),
    placeholderData: keepPreviousData,
  });

  const fallback = React.useMemo<PageResult<T>>(
    () => ({
      data: [],
      total: 0,
      page: options.page ?? 1,
      limite: options.limite ?? 10,
      totalPages: 1,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [optionsKey]
  );

  const result = data ?? fallback;

  return {
    data: result.data,
    total: result.total,
    totalPages: result.totalPages,
    // Chargement initial uniquement (pas lors d'un simple rafraîchissement de données déjà
    // affichées) - comportement équivalent à l'ancien `isLoading` basé sur useEffect.
    isLoading: isLoading && !isPlaceholderData,
    error: error ? (error as Error).message : null,
    refetch: () => {
      void refetch();
    },
  };
}
