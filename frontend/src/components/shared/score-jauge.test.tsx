import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ScoreJauge } from "./score-jauge";

describe("ScoreJauge", () => {
  it("affiche la valeur numérique du score", () => {
    render(<ScoreJauge score={72} />);
    expect(screen.getByText("72")).toBeInTheDocument();
  });

  it("colore le score en succès au-dessus du seuil de conformité (80)", () => {
    render(<ScoreJauge score={85} />);
    expect(screen.getByText("85")).toHaveClass("text-success");
  });

  it("colore le score en avertissement entre 50 et le seuil de conformité", () => {
    render(<ScoreJauge score={65} />);
    expect(screen.getByText("65")).toHaveClass("text-warning");
  });

  it("colore le score en alerte sous 50", () => {
    render(<ScoreJauge score={30} />);
    expect(screen.getByText("30")).toHaveClass("text-destructive");
  });
});
