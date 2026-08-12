"use client";

import * as React from "react";
import { Search } from "lucide-react";
import type { ReactNode } from "react";

import { useSyncedState } from "@/hooks/use-synced-state";
import { Input } from "@/components/ui/input";

const DELAI_DEBOUNCE_RECHERCHE_MS = 300;

export function Toolbar({
  recherche,
  onRechercheChange,
  placeholderRecherche = "Rechercher…",
  children,
}: {
  recherche: string;
  onRechercheChange: (valeur: string) => void;
  placeholderRecherche?: string;
  children?: ReactNode;
}) {
  // La saisie reste instantanée à l'écran (état local `valeurLocale`), mais `onRechercheChange`
  // - qui déclenche une requête réseau côté parent (via useApiList) - n'est appelé qu'après
  // 300 ms de silence clavier, pour éviter une requête à chaque frappe. `valeurLocale` se
  // resynchronise si la valeur contrôlée change depuis l'extérieur (ex : réinitialisation des
  // filtres par le parent).
  const [valeurLocale, setValeurLocale] = useSyncedState(recherche, recherche);

  React.useEffect(() => {
    if (valeurLocale === recherche) return;
    const timer = setTimeout(() => onRechercheChange(valeurLocale), DELAI_DEBOUNCE_RECHERCHE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valeurLocale]);

  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1 sm:max-w-xs">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={valeurLocale}
          onChange={(e) => setValeurLocale(e.target.value)}
          placeholder={placeholderRecherche}
          className="pl-8"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}
