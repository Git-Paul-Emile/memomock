"use client";

import * as React from "react";
import { WifiOff } from "lucide-react";

// Écran H24 (spec "Mode hors ligne / connexion") : bandeau global, monté une seule fois dans
// Providers, visible sur n'importe quel écran dès que le navigateur perd la connexion -
// `navigator.onLine` + événements `online`/`offline`, sans dépendance supplémentaire.
export function OfflineBanner() {
  // Initialiseur paresseux (jamais exécuté côté serveur) plutôt qu'un effect + setState :
  // l'effet ci-dessous ne sert qu'à s'abonner aux événements online/offline, pas à lire l'état
  // initial (voir react-hooks/set-state-in-effect).
  //
  // On teste `typeof window` et non `typeof navigator` : depuis Node 21+, un `navigator` global
  // partiel existe côté serveur (userAgent, etc.) mais sans `onLine`, ce qui donnait
  // `!undefined === true` pendant le SSR et un mismatch d'hydratation systématique. `window`,
  // lui, reste exclusivement défini dans un vrai navigateur.
  const [horsLigne, setHorsLigne] = React.useState(() =>
    typeof window === "undefined" ? false : !navigator.onLine
  );

  React.useEffect(() => {
    const surConnexion = () => setHorsLigne(false);
    const surDeconnexion = () => setHorsLigne(true);
    window.addEventListener("online", surConnexion);
    window.addEventListener("offline", surDeconnexion);
    return () => {
      window.removeEventListener("online", surConnexion);
      window.removeEventListener("offline", surDeconnexion);
    };
  }, []);

  if (!horsLigne) return null;

  return (
    <div className="flex items-center justify-center gap-2 bg-destructive px-4 py-2 text-center text-sm font-medium text-destructive-foreground">
      <WifiOff className="size-4" />
      Vous êtes hors ligne. Certaines actions seront indisponibles tant que la connexion n&apos;est
      pas rétablie.
    </div>
  );
}
