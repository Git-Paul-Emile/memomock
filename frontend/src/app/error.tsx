"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";

// Error Boundary de segment (App Router : convention de fichier `error.tsx`). Capture toute
// erreur de rendu non gérée dans un composant client de l'arborescence, pour éviter un écran
// blanc en production - remplace le comportement par défaut de React (crash silencieux vers
// une page vide) par un message clair et une action de récupération (`reset`, qui retente le
// rendu du segment sans recharger toute la page).
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // En production, cette ligne est le point d'accroche naturel pour un futur envoi vers
    // Sentry côté frontend (symétrique de lib/sentry.js côté backend) - non fait ici pour
    // rester dans le périmètre "observabilité backend" demandé, mais l'emplacement est prêt.
    console.error("Erreur non gérée côté frontend :", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="size-8 text-destructive" />
      </div>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Une erreur est survenue</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Quelque chose s&apos;est mal passé. Vous pouvez réessayer ou revenir plus tard.
        </p>
      </div>
      <Button onClick={reset}>Réessayer</Button>
    </div>
  );
}
