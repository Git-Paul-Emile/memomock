import { cn } from "@/lib/utils";
import { SEUIL_SCORE_CONFORMITE } from "@/lib/constants";

function couleurScore(score: number) {
  if (score >= SEUIL_SCORE_CONFORMITE) return "text-success";
  if (score >= 50) return "text-warning";
  return "text-destructive";
}

function couleurAnneau(score: number) {
  if (score >= SEUIL_SCORE_CONFORMITE) return "stroke-success";
  if (score >= 50) return "stroke-warning";
  return "stroke-destructive";
}

/** Jauge circulaire (SVG) affichant un score de 0 à 100, utilisée pour le score de conformité. */
export function ScoreJauge({ score, taille = 96 }: { score: number; taille?: number }) {
  const rayon = 40;
  const circonference = 2 * Math.PI * rayon;
  const progression = circonference - (score / 100) * circonference;

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: taille, height: taille }}
    >
      <svg viewBox="0 0 100 100" className="-rotate-90" width={taille} height={taille}>
        <circle cx="50" cy="50" r={rayon} className="stroke-muted" strokeWidth="8" fill="none" />
        <circle
          cx="50"
          cy="50"
          r={rayon}
          className={cn("transition-all duration-700 ease-out", couleurAnneau(score))}
          strokeWidth="8"
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circonference}
          strokeDashoffset={progression}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={cn("text-xl font-semibold", couleurScore(score))}>{score}</span>
        <span className="text-[10px] text-muted-foreground">/ 100</span>
      </div>
    </div>
  );
}
