import { Quote, Scale, UserCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { NIVEAU_ALERTE_VARIANT } from "@/lib/constants";
import type { PointAnalyse, SourceIA } from "@/types";

const LIBELLES_NIVEAU = {
  erreur: "À corriger",
  attention: "À vérifier",
  succes: "Conforme",
  info: "Info",
} as const;

/** Un point d'analyse IA : constat, règle de l'encadreur concernée, passage visé (spec v2, § 23). */
export function PointAnalyseCarte({ point }: { point: PointAnalyse }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border p-3">
      <Badge variant={NIVEAU_ALERTE_VARIANT[point.niveau]} className="mt-0.5 shrink-0">
        {point.bloquant ? "Bloquant" : LIBELLES_NIVEAU[point.niveau]}
      </Badge>
      <div className="min-w-0 space-y-1">
        <p className="text-sm font-medium">{point.libelle}</p>
        {point.detail && <p className="text-sm text-muted-foreground">{point.detail}</p>}
        {point.regle && (
          <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <Scale className="mt-0.5 size-3.5 shrink-0" />
            <span>
              Règle : <span className="text-foreground">{point.regle}</span>
            </span>
          </p>
        )}
        {point.passage && (
          <p className="flex items-start gap-1.5 text-xs italic text-muted-foreground">
            <Quote className="mt-0.5 size-3.5 shrink-0" />« {point.passage} »
          </p>
        )}
        {point.avisEncadreur && (
          <p className="flex items-center gap-1.5 text-xs font-medium text-primary">
            <UserCheck className="size-3.5" />
            Point nécessitant l&apos;avis de votre encadreur
          </p>
        )}
      </div>
    </div>
  );
}

/** Indique honnêtement si l'analyse vient de Gemini ou de la simulation locale. */
export function BadgeSourceIa({ source }: { source?: SourceIA | null }) {
  if (!source) return null;
  return (
    <Badge variant={source === "gemini" ? "secondary" : "outline"} className="font-normal">
      {source === "gemini" ? "Analyse Gemini" : "Analyse simulée (IA indisponible)"}
    </Badge>
  );
}
