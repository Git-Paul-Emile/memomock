"use client";

import * as React from "react";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Indicateur d'étapes + conteneur pour un parcours d'onboarding multi-étapes (spec C3/C4,
 * onboarding étudiant/encadrant). Volontairement simple (pas de navigation générique par
 * bouton précédent/suivant intégrée) : chaque écran d'onboarding gère lui-même sa logique de
 * progression, ce composant se contente d'afficher où on en est et d'encadrer le contenu.
 */
export function OnboardingWizard({
  etapes,
  etapeCourante,
  children,
}: {
  etapes: string[];
  etapeCourante: number;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-lg">
      <ol className="mb-8 flex items-center justify-between">
        {etapes.map((etape, index) => {
          const numero = index + 1;
          const complete = numero < etapeCourante;
          const active = numero === etapeCourante;
          return (
            <li key={etape} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full border text-xs font-medium transition-colors",
                    complete
                      ? "border-primary bg-primary text-primary-foreground"
                      : active
                        ? "border-primary text-primary"
                        : "border-muted-foreground/30 text-muted-foreground"
                  )}
                >
                  {complete ? <Check className="size-4" /> : numero}
                </div>
                <span
                  className={cn(
                    "hidden text-center text-[11px] sm:block",
                    active ? "font-medium text-foreground" : "text-muted-foreground"
                  )}
                >
                  {etape}
                </span>
              </div>
              {numero < etapes.length && (
                <div className={cn("mx-2 h-px flex-1", complete ? "bg-primary" : "bg-border")} />
              )}
            </li>
          );
        })}
      </ol>
      {children}
    </div>
  );
}
