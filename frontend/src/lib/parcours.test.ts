/**
 * Tests de parcours sur une API mock en mémoire : vérifient l'enchaînement des modules métier
 * (analyse → score → soumission bloquée ou non, rattachement par code d'établissement) sans
 * navigateur ni serveur.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

type Ligne = Record<string, unknown> & { id: string };
const db: Record<string, Ligne[]> = {};
let compteur = 0;

function filtrer(collection: string, filtres: Record<string, unknown> = {}) {
  return (db[collection] ?? []).filter((l) =>
    Object.entries(filtres).every(([k, v]) => v === undefined || String(l[k]) === String(v))
  );
}

vi.mock("./api", () => ({
  apiGet: async (c: string, id: string) => {
    const ligne = (db[c] ?? []).find((l) => l.id === id);
    if (!ligne) throw new Error("404");
    return structuredClone(ligne);
  },
  apiList: async (c: string, o: { filtres?: Record<string, unknown> } = {}) => {
    const data = structuredClone(filtrer(c, o.filtres));
    return { data, total: data.length, page: 1, limite: data.length, totalPages: 1 };
  },
  apiPost: async (c: string, corps: Record<string, unknown>) => {
    const ligne = { id: (corps.id as string) ?? `id${++compteur}`, ...corps };
    (db[c] ??= []).push(ligne);
    return structuredClone(ligne);
  },
  apiPatch: async (c: string, id: string, corps: Record<string, unknown>) => {
    const ligne = (db[c] ?? []).find((l) => l.id === id);
    if (!ligne) throw new Error("404");
    Object.assign(ligne, corps);
    return structuredClone(ligne);
  },
  apiDelete: async (c: string, id: string) => {
    db[c] = (db[c] ?? []).filter((l) => l.id !== id);
  },
  getToken: async () => null,
}));

// L'IA répond de façon déterministe : un chapitre obligatoire manque.
vi.mock("./ia/client", () => ({
  analyserAvecIa: async () => ({
    source: "gemini",
    resultat: {
      axes: {
        forme: { score: 90, points: [] },
        structure: {
          score: 85,
          points: [{ libelle: "Chapitre « Discussion » absent", detail: "", niveau: "erreur", bloquant: true }],
        },
        fond: { score: 88, points: [] },
        coherence: { score: 86, points: [] },
      },
      sousScores: { methodologie: 84, bibliographie: 80 },
    },
  }),
  proposerReglesAvecIa: async () => ({ source: "gemini", resultat: [] }),
}));

const { lancerAnalyseDocument } = await import("./analyse-document");
const { utiliserCode } = await import("./invitations");

beforeEach(() => {
  for (const cle of Object.keys(db)) delete db[cle];
  Object.assign(db, {
    documents: [{ id: "d1", etudiantId: "e1", encadrantId: "p1", titre: "Mémoire", statut: "analyse_en_cours", typeDocument: "master", discipline: "Informatique", version: 1, scoreConformite: 0, scoreForme: 0, scoreFond: 0 }],
    "contenus-documents": [{ id: "d1", documentId: "d1", texte: "## Introduction\nTexte", origine: "import" }],
    "profils-encadrant": [{ id: "pf1", encadrantId: "p1", typeDocument: "master", discipline: "Informatique", actif: true, seuilSoumission: 80, seuilCategorieMinimum: 50, guidesRedaction: [], memoiresModeles: [], normes: [], exigences: [], livrablesAttendus: [], contraintes: null }],
    "grilles-evaluation": [],
    users: [
      { id: "p1", role: "encadrant", nom: "K", prenom: "J", email: "p@x.sn", etablissementId: null },
      { id: "e1", role: "etudiant", nom: "D", prenom: "A", email: "e@x.sn" },
    ],
    "regles-apprises": [],
    analyses: [],
  });
});

describe("parcours d'analyse", () => {
  it("enregistre les analyses, le score et bloque la soumission sur un point bloquant", async () => {
    await lancerAnalyseDocument("d1");
    const document = db.documents[0];
    expect(document.statut).toBe("analyse_terminee");
    expect(document.sourceAnalyse).toBe("gemini");
    expect(document.scoreConformite).toBe(Math.round((90 + 85 + 88 + 86) / 4));
    expect(document.pretPourSoumission).toBe(false);
    expect(document.pointsBloquants).toEqual(["Chapitre « Discussion » absent"]);
    expect(db.analyses).toHaveLength(4);
    expect(document.profilEncadrantId).toBe("pf1");
  });

  it("remplace les analyses précédentes lors d'une réanalyse", async () => {
    await lancerAnalyseDocument("d1");
    await lancerAnalyseDocument("d1");
    expect(db.analyses).toHaveLength(4);
  });
});

describe("rattachement par code d'établissement", () => {
  beforeEach(() => {
    Object.assign(db, {
      etablissements: [{ id: "et1", nom: "Université test", adminId: "a1" }],
      classes: [{ id: "c1", nom: "Master Info", etablissementId: "et1", encadrantIds: ["p1"], code: "CLASSE-X" }],
      "invitations-etablissement": [
        { id: "i1", etablissementId: "et1", email: "e@x.sn", role: "etudiant", classeId: "c1", code: "ETU-ABC123", statut: "en_attente" },
        { id: "i2", etablissementId: "et1", email: "n@x.sn", role: "admin_etablissement", classeId: null, code: "ADM-XYZ789", statut: "en_attente" },
      ],
      invitations: [],
      encadrants: [{ id: "p1", nbEtudiantsSuivis: 0 }],
      notifications: [],
    });
  });

  it("rattache l'étudiant à la classe, à l'établissement et à l'encadreur", async () => {
    const etudiant = db.users.find((u) => u.id === "e1")!;
    const { utilisateur } = await utiliserCode(etudiant as never, "etu-abc123");
    expect(utilisateur).toMatchObject({ classeId: "c1", etablissementId: "et1", encadrantId: "p1" });
    expect(db["invitations-etablissement"][0].statut).toBe("acceptee");
    expect(db.encadrants[0].nbEtudiantsSuivis).toBe(1);
  });

  it("refuse un code destiné à un autre rôle", async () => {
    const etudiant = db.users.find((u) => u.id === "e1")!;
    await expect(utiliserCode(etudiant as never, "ADM-XYZ789")).rejects.toThrow(/autre type de compte/);
  });

  it("désigne l'administrateur d'un établissement créé par le super-admin", async () => {
    db.users.push({ id: "n1", role: "admin_etablissement", nom: "N", prenom: "N", email: "n@x.sn" });
    await utiliserCode(db.users.at(-1) as never, "ADM-XYZ789");
    expect(db.etablissements[0].adminId).toBe("n1");
  });

  it("un code déjà utilisé est refusé", async () => {
    const etudiant = db.users.find((u) => u.id === "e1")!;
    await utiliserCode(etudiant as never, "ETU-ABC123");
    await expect(utiliserCode(etudiant as never, "ETU-ABC123")).rejects.toThrow(/déjà été utilisé/);
  });
});
