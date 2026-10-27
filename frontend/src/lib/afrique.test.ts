import { describe, expect, it } from "vitest";

import { PAYS, formaterMontant, paysDepuisTelephone, trouverPays } from "./afrique";
import { versEncadrantPublic } from "./annuaire";
import { normaliserCode } from "./invitations";
import type { PublicUser } from "@/types";

describe("référentiel Afrique francophone", () => {
  it("ne contient que des pays francophones de l'Ouest et du Centre", () => {
    expect(PAYS).toHaveLength(16);
    expect(trouverPays("GH")).toBeUndefined();
    expect(trouverPays("sn")?.devise).toBe("XOF");
    expect(trouverPays("CM")?.devise).toBe("XAF");
  });

  it("retrouve le pays depuis un numéro international", () => {
    expect(paysDepuisTelephone("+221 77 123 45 67")?.code).toBe("SN");
    expect(paysDepuisTelephone("+237677412530")?.code).toBe("CM");
    expect(paysDepuisTelephone("+33612345678")).toBeUndefined();
  });

  it("formate les montants en franc CFA sans décimales", () => {
    expect(formaterMontant(150000, "XOF").replace(/\s/g, " ")).toMatch(/^150\s000\sF\sCFA$/);
  });

  it("propose le mobile money courant de chaque pays", () => {
    expect(trouverPays("SN")?.paiements).toContain("wave");
    expect(trouverPays("CM")?.paiements).toContain("mtn_momo");
  });
});

describe("annuaire des encadreurs", () => {
  const base: PublicUser = {
    id: "u2",
    role: "encadrant",
    nom: "Kouassi",
    prenom: "Jean-Baptiste",
    email: "jb@exemple.sn",
    createdAt: "2026-01-01",
    domainesExpertise: ["IA"],
  };

  it("n'expose que des données publiques", () => {
    const fiche = versEncadrantPublic(base, 4);
    expect(fiche).toEqual({
      id: "u2",
      nom: "Kouassi",
      prenom: "Jean-Baptiste",
      filiere: null,
      domainesExpertise: ["IA"],
      disponible: true,
      nbEtudiantsSuivis: 4,
    });
    expect(fiche).not.toHaveProperty("email");
  });

  it("rend indisponible un compte désactivé", () => {
    expect(versEncadrantPublic({ ...base, actif: false }, 0).disponible).toBe(false);
  });
});

describe("codes d'invitation", () => {
  it("normalise la saisie", () => {
    expect(normaliserCode("  master-info-26 ")).toBe("MASTER-INFO-26");
  });
});
