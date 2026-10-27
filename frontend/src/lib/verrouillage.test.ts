import { describe, expect, it } from "vitest";

import { chapitresModifies, normaliserTexte, sections } from "./verrouillage";

const TEXTE = `## Introduction
Contexte du mémoire.
## CHAPITRE 2 : MÉTHODOLOGIE
Enquête auprès de 120 étudiants.
## Résultats
68 % des répondants.`;

describe("sections", () => {
  it("découpe le texte par titre normalisé", () => {
    expect(sections(TEXTE).map(([titre]) => titre)).toEqual([
      "introduction",
      "chapitre 2 methodologie",
      "resultats",
    ]);
  });
});

describe("chapitresModifies", () => {
  it("accepte une modification d'un chapitre non verrouillé", () => {
    const nouveau = TEXTE.replace("68 %", "72 %");
    expect(chapitresModifies(TEXTE, nouveau, ["Méthodologie"])).toEqual([]);
  });

  it("refuse la modification d'un chapitre verrouillé", () => {
    const nouveau = TEXTE.replace("120 étudiants", "200 étudiants");
    expect(chapitresModifies(TEXTE, nouveau, ["Méthodologie"])).toEqual(["Méthodologie"]);
  });

  it("refuse la suppression d'un chapitre verrouillé", () => {
    const nouveau = TEXTE.replace("## CHAPITRE 2 : MÉTHODOLOGIE\nEnquête auprès de 120 étudiants.\n", "");
    expect(chapitresModifies(TEXTE, nouveau, ["Méthodologie"])).toEqual(["Méthodologie"]);
  });

  it("ignore casse, accents et ponctuation (réimport Word/PDF)", () => {
    const nouveau = TEXTE.replace("Enquête auprès de 120 étudiants.", "enquete aupres de 120 etudiants");
    expect(normaliserTexte("Enquête auprès")).toBe("enquete aupres");
    expect(chapitresModifies(TEXTE, nouveau, ["Méthodologie"])).toEqual([]);
  });
});
