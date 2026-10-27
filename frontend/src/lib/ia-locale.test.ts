import { describe, expect, it } from "vitest";

import { correctionsDepuisSegments } from "./apprentissage";
import { regleApplicable } from "./analyse-document";
import { extraireReglesHeuristique, simulerAnalyse } from "./mock-ai";
import type { ContexteAnalyse } from "./ia/contrats";
import type { RegleApprise, RevisionSegment } from "@/types";

const CONTEXTE: ContexteAnalyse = {
  titre: "Test",
  typeDocument: "master",
  discipline: "Informatique",
  regles: [],
  reglesImposees: [],
  reglesApprises: [],
  canevas: [
    { titre: "Introduction", obligatoire: true, criteres: [], sousSections: [] },
    { titre: "Méthodologie", obligatoire: true, criteres: [], sousSections: [] },
    { titre: "Annexes", obligatoire: false, criteres: [], sousSections: [] },
  ],
  grille: [],
};

describe("simulerAnalyse - contrôle de structure", () => {
  it("signale un chapitre obligatoire absent comme bloquant", () => {
    const resultat = simulerAnalyse("## Introduction\nDu texte sans la suite.", CONTEXTE);
    const bloquants = resultat.axes.structure.points.filter((p) => p.bloquant);
    expect(bloquants.map((p) => p.libelle)).toEqual(["Chapitre « Méthodologie » absent"]);
  });

  it("ne signale rien quand les chapitres obligatoires sont présents", () => {
    const resultat = simulerAnalyse("## INTRODUCTION\n...\n## Chapitre 2 : méthodologie\n...", CONTEXTE);
    expect(resultat.axes.structure.points.some((p) => p.bloquant)).toBe(false);
  });
});

describe("extraireReglesHeuristique", () => {
  it("retient les phrases d'exigence et les classe", () => {
    const regles = extraireReglesHeuristique(
      "Le mémoire doit être rédigé en Times New Roman 12. Les références doivent suivre la norme APA. Bonne chance à tous."
    );
    expect(regles.map((r) => r.categorie)).toEqual(["forme", "bibliographie"]);
  });
});

describe("correctionsDepuisSegments", () => {
  it("reconstitue le texte avant et après correction", () => {
    const segments: RevisionSegment[] = [
      { id: "1", documentId: "d", paragraphe: 0, ordre: 0, texte: "Les résultats ", type: "normal" },
      { id: "2", documentId: "d", paragraphe: 0, ordre: 1, texte: "prouvent", type: "supprime" },
      { id: "3", documentId: "d", paragraphe: 0, ordre: 2, texte: "suggèrent", type: "ajoute" },
      { id: "4", documentId: "d", paragraphe: 1, ordre: 0, texte: "Inchangé.", type: "normal" },
    ];
    expect(correctionsDepuisSegments(segments)).toEqual([
      { avant: "Les résultats prouvent", apres: "Les résultats suggèrent" },
    ]);
  });
});

describe("regleApplicable", () => {
  const base: RegleApprise = {
    id: "r",
    encadrantId: "u2",
    regle: "x",
    source: "s",
    confiance: 80,
    statut: "adoptee",
    dateApprentissage: "2026-01-01",
    niveau: "generale",
  };
  const document = { id: "doc1", typeDocument: "master" as const, discipline: "Informatique" };

  it("limite une règle ponctuelle à son document", () => {
    expect(regleApplicable({ ...base, niveau: "ponctuelle", documentId: "doc1" }, document)).toBe(true);
    expect(regleApplicable({ ...base, niveau: "ponctuelle", documentId: "doc2" }, document)).toBe(false);
  });

  it("n'applique pas une règle de Licence à un Master", () => {
    expect(regleApplicable({ ...base, niveau: "type_document", typeDocument: "licence" }, document)).toBe(false);
  });
});
