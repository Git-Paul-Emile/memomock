import { describe, expect, it } from "vitest";

import { calculerSegments, texteCourantDuParagraphe } from "./revision-diff";
import type { RevisionSegment } from "@/types";

describe("texteCourantDuParagraphe", () => {
  it("concatène les segments normal et ajoute, en excluant les segments supprimés", () => {
    const segments: RevisionSegment[] = [
      { id: "1", documentId: "d1", paragraphe: 0, ordre: 0, texte: "Le chat ", type: "normal" },
      { id: "2", documentId: "d1", paragraphe: 0, ordre: 1, texte: "noir ", type: "supprime" },
      { id: "3", documentId: "d1", paragraphe: 0, ordre: 2, texte: "gris ", type: "ajoute" },
      { id: "4", documentId: "d1", paragraphe: 0, ordre: 3, texte: "dort.", type: "normal" },
    ];
    expect(texteCourantDuParagraphe(segments)).toBe("Le chat gris dort.");
  });
});

describe("calculerSegments", () => {
  it("renvoie un unique segment normal quand le texte n'a pas changé", () => {
    expect(calculerSegments(0, "Texte identique.", "Texte identique.")).toEqual([
      { paragraphe: 0, ordre: 0, texte: "Texte identique.", type: "normal" },
    ]);
  });

  it("marque les mots ajoutés et supprimés séparément du texte inchangé", () => {
    const segments = calculerSegments(2, "Le chat noir dort.", "Le chat gris dort.");

    expect(segments.every((s) => s.paragraphe === 2)).toBe(true);
    expect(segments.map((s) => s.type)).toEqual(["normal", "supprime", "ajoute", "normal"]);
    expect(segments.map((s) => s.texte).join("")).toContain("gris");
    expect(segments.some((s) => s.type === "supprime" && s.texte.includes("noir"))).toBe(true);
  });

  it("ne renvoie aucun segment si les deux textes sont vides", () => {
    expect(calculerSegments(0, "", "")).toEqual([]);
  });
});
