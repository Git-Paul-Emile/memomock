import * as React from "react";

import { PAYS } from "@/lib/afrique";
import { cn } from "@/lib/utils";

/**
 * Liste déroulante des pays d'Afrique de l'Ouest et centrale (select natif : léger, accessible et
 * compatible `register` de react-hook-form). Affiche l'indicatif téléphonique de chaque pays.
 */
export const SelectPays = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & { avecIndicatif?: boolean }
>(function SelectPays({ className, avecIndicatif = true, ...props }, ref) {
  const groupes = [
    { libelle: "Afrique de l'Ouest", pays: PAYS.filter((p) => p.region === "ouest") },
    { libelle: "Afrique centrale", pays: PAYS.filter((p) => p.region === "centre") },
  ];
  return (
    <select
      ref={ref}
      className={cn(
        "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30",
        className
      )}
      {...props}
    >
      {groupes.map((groupe) => (
        <optgroup key={groupe.libelle} label={groupe.libelle}>
          {groupe.pays.map((p) => (
            <option key={p.code} value={p.code}>
              {p.nom}
              {avecIndicatif ? ` (${p.indicatif})` : ""}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
});
