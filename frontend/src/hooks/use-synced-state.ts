"use client";

import * as React from "react";

/**
 * Maintient une copie locale « modifiable » d'une valeur source (typiquement la donnée d'une
 * requête TanStack Query), pour permettre des mises à jour optimistes locales (ex : ajout
 * immédiat d'un commentaire avant confirmation serveur) sans attendre un refetch réseau - tout
 * en restant synchronisée dès que la source change (nouveau chargement, invalidation...).
 *
 * Utilise le correctif recommandé par React pour « ajuster un état pendant le rendu » plutôt
 * qu'un `useEffect` + `setState` (voir
 * https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes) :
 * pas de rendu supplémentaire inutile, et conforme à la règle ESLint
 * `react-hooks/set-state-in-effect`.
 *
 * `source` à `undefined` (ex : requête pas encore résolue) n'écrase jamais la valeur locale -
 * seule une valeur définie (y compris `null`) déclenche une resynchronisation.
 */
export function useSyncedState<T>(
  source: T | undefined,
  initial: T
): [T, React.Dispatch<React.SetStateAction<T>>] {
  // Si `source` est déjà résolue dès le montage (ex : donnée déjà en cache TanStack Query),
  // on initialise directement avec elle plutôt qu'avec `initial`, pour éviter un premier rendu
  // affichant une valeur par défaut alors que la vraie donnée est déjà disponible.
  const [valeur, setValeur] = React.useState(source !== undefined ? source : initial);
  const [derniereSource, setDerniereSource] = React.useState(source);

  if (source !== undefined && source !== derniereSource) {
    setDerniereSource(source);
    setValeur(source);
  }

  return [valeur, setValeur];
}
