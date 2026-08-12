"use client";

import { useQuery, type QueryKey } from "@tanstack/react-query";

interface UseApiResourceResult<T> {
  data: T | undefined;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Hook générique (basé sur TanStack Query) pour charger une ressource « détail » - un
 * document, un profil, ou une combinaison de plusieurs appels liés (ex : document + ses
 * commentaires + les règles apprises associées) - à la place du duo useEffect + useState +
 * fetch dupliqué dans les écrans de détail. `queryFn` peut donc être un `apiGet` simple ou
 * une fonction composite (Promise.all de plusieurs `apiGet`/`apiList`) : ce hook se contente
 * de gérer le cycle de vie (chargement, erreur, cache, refetch), pas la forme des données.
 */
export function useApiResource<T>(
  queryKey: QueryKey,
  queryFn: () => Promise<T>,
  options?: { enabled?: boolean }
): UseApiResourceResult<T> {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn,
    enabled: options?.enabled ?? true,
  });

  return {
    data,
    isLoading,
    error: error ? (error as Error).message : null,
    refetch: () => {
      void refetch();
    },
  };
}
