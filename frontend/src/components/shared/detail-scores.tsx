import { ScoreJauge } from "@/components/shared/score-jauge";
import { LIBELLE_SCORE } from "@/lib/score";
import { cn } from "@/lib/utils";
import type { DocumentSubmission } from "@/types";

type Scores = Pick<
  DocumentSubmission,
  | "scoreConformite"
  | "scoreForme"
  | "scoreFond"
  | "scoreCoherence"
  | "scoreStructure"
  | "scoreMethodologie"
  | "scoreBibliographie"
>;

/**
 * Score global et détail par catégorie (spec v2, § 24). Le libellé rappelle que le score est une
 * estimation de conformité, jamais une note.
 */
export function DetailScores({
  document,
  compact = false,
  className,
}: {
  document: Scores;
  compact?: boolean;
  className?: string;
}) {
  const categories: [string, number | undefined][] = [
    ["Forme", document.scoreForme],
    ["Structure", document.scoreStructure],
    ["Fond", document.scoreFond],
    ["Cohérence", document.scoreCoherence],
    ["dont méthodologie", document.scoreMethodologie],
    ["dont bibliographie", document.scoreBibliographie],
  ];
  const disponibles = categories.filter(([, v]) => typeof v === "number");

  if (compact) {
    return (
      <div className={cn("w-full space-y-1 text-xs text-muted-foreground", className)}>
        {disponibles.map(([libelle, valeur]) => (
          <div key={libelle} className="flex justify-between">
            <span>{libelle}</span>
            <span className="font-medium text-foreground">{valeur} %</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-center gap-4 sm:flex-row sm:justify-around", className)}>
      <div className="flex flex-col items-center gap-1">
        <ScoreJauge score={document.scoreConformite} taille={110} />
        <p className="max-w-[12rem] text-center text-[11px] leading-tight text-muted-foreground">
          {LIBELLE_SCORE}
        </p>
      </div>
      <div className="grid flex-1 grid-cols-2 gap-4 text-center sm:grid-cols-3">
        {disponibles.map(([libelle, valeur]) => (
          <div key={libelle}>
            <p className="text-lg font-semibold">{valeur} %</p>
            <p className="text-xs text-muted-foreground">{libelle}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
