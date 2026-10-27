import { describe, expect, it } from "vitest";

import { axeDuCritere, calculerScoreGlobal, evaluerSoumission, type ScoresDocument } from "./score";

const SCORES: ScoresDocument = {
  forme: 92,
  structure: 88,
  fond: 78,
  coherence: 80,
  methodologie: 81,
  bibliographie: 90,
};

describe("axeDuCritere", () => {
  it("déduit la catégorie du libellé", () => {
    expect(axeDuCritere({ libelle: "Méthodologie" })).toBe("methodologie");
    expect(axeDuCritere({ libelle: "Revue de littérature" })).toBe("fond");
    expect(axeDuCritere({ libelle: "Forme" })).toBe("forme");
    expect(axeDuCritere({ libelle: "Références bibliographiques" })).toBe("bibliographie");
  });

  it("respecte un axe explicite", () => {
    expect(axeDuCritere({ libelle: "Discussion", axe: "coherence" })).toBe("coherence");
  });
});

describe("calculerScoreGlobal", () => {
  it("fait la moyenne des quatre axes sans grille", () => {
    expect(calculerScoreGlobal(SCORES)).toBe(85);
  });

  it("pondère par la grille", () => {
    const grille = [
      { id: "a", libelle: "Méthodologie", poids: 50, ordre: 1 },
      { id: "b", libelle: "Forme", poids: 50, ordre: 2 },
    ];
    expect(calculerScoreGlobal(SCORES, grille)).toBe(Math.round((81 + 92) / 2));
  });
});

describe("evaluerSoumission", () => {
  it("bloque si une catégorie est sous le minimum malgré un bon score global", () => {
    const resultat = evaluerSoumission({
      scores: { ...SCORES, methodologie: 48 },
      scoreGlobal: 87,
      seuilSoumission: 80,
      seuilCategorieMinimum: 60,
      points: [],
    });
    expect(resultat.pret).toBe(false);
    expect(resultat.bloquants).toEqual(["Méthodologie : 48 % (minimum requis : 60 %)."]);
  });

  it("bloque sur une erreur bloquante", () => {
    const resultat = evaluerSoumission({
      scores: SCORES,
      scoreGlobal: 87,
      points: [{ libelle: "Chapitre 2 absent", niveau: "erreur", bloquant: true }],
    });
    expect(resultat.bloquants).toEqual(["Chapitre 2 absent"]);
  });

  it("valide un document conforme", () => {
    expect(evaluerSoumission({ scores: SCORES, scoreGlobal: 87, points: [] }).pret).toBe(true);
  });
});
