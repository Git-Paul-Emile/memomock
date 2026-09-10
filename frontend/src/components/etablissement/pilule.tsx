"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Bouton-pilule pour les sélections multiples ou exclusives (filières, niveaux, types de
 * sources, style rédactionnel…).
 *
 * C'est un `<button aria-pressed>` et non un `<input type="checkbox">` masqué : l'état est
 * ainsi annoncé correctement par les lecteurs d'écran, et le composant reste utilisable au
 * clavier sans code supplémentaire. Mutualisé ici car les écrans Promotions et Normes
 * l'utilisent à l'identique (DRY).
 */
export function Pilule({
  actif,
  onClick,
  children,
}: {
  actif: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={actif}
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-sm transition-colors",
        actif
          ? "border-primary bg-primary/10 text-primary"
          : "border-input text-muted-foreground hover:bg-accent"
      )}
    >
      {children}
    </button>
  );
}
