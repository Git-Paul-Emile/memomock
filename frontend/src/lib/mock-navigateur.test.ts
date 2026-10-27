import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { traiterRequete, type Base } from "./mock-db";

const INITIALE: Base = {
  documents: [
    { id: "d1", titre: "Mémoire A", statut: "valide", encadrantId: "p1" },
    { id: "d2", titre: "Mémoire B", statut: "rejete", encadrantId: "p1" },
    { id: "d3", titre: "Mémoire C", statut: "valide", encadrantId: "p2" },
  ],
  grilles: [{ id: "g1", criteres: [1, 2], updatedAt: "x" }],
};

describe("moteur mock (json-server)", () => {
  it("filtre, trie, pagine et expose le total", () => {
    const base = structuredClone(INITIALE);
    const r = traiterRequete(base, "GET", ["documents"], new URLSearchParams("encadrantId=p1&_sort=titre&_order=desc&_page=1&_limit=1"), null);
    expect(r.corps).toEqual([INITIALE.documents[1]]);
    expect(r.entetes?.["X-Total-Count"]).toBe("2");
  });

  it("crée, modifie, remplace et supprime", () => {
    const base = structuredClone(INITIALE);
    const cree = traiterRequete(base, "POST", ["documents"], new URLSearchParams(), { titre: "Nouveau" });
    const id = (cree.corps as { id: string }).id;
    expect(cree.status).toBe(201);
    expect(traiterRequete(base, "PATCH", ["documents", id], new URLSearchParams(), { statut: "brouillon" }).corps).toMatchObject({ titre: "Nouveau", statut: "brouillon" });
    expect(traiterRequete(base, "PUT", ["grilles", "g1"], new URLSearchParams(), { criteres: [3] }).corps).toEqual({ id: "g1", criteres: [3] });
    expect(traiterRequete(base, "DELETE", ["documents", id], new URLSearchParams(), null).status).toBe(204);
    expect(traiterRequete(base, "GET", ["documents", id], new URLSearchParams(), null).status).toBe(404);
  });

  it("refuse un identifiant déjà utilisé", () => {
    const base = structuredClone(INITIALE);
    expect(traiterRequete(base, "POST", ["documents"], new URLSearchParams(), { id: "d1" }).status).toBe(409);
  });
});

describe("mock dans le navigateur", () => {
  const fetchReseau = vi.fn(async () => new Response(JSON.stringify(INITIALE)));
  const fetchInitial = window.fetch;

  beforeEach(() => {
    localStorage.clear();
    window.fetch = fetchReseau as unknown as typeof fetch;
    fetchReseau.mockClear();
    vi.resetModules();
  });

  afterEach(() => {
    window.fetch = fetchInitial;
  });

  async function nouvellePage() {
    // Simule un chargement de page : module neuf, fetch réseau d'origine.
    window.fetch = fetchReseau as unknown as typeof fetch;
    vi.resetModules();
    const mock = await import("./mock-navigateur");
    mock.installerMockNavigateur();
    return mock;
  }

  it("conserve un document créé d'une page à l'autre (plus de 404)", async () => {
    await nouvellePage();
    const cree = await (await fetch("/api/mock/documents", { method: "POST", body: JSON.stringify({ titre: "Créé" }) })).json();
    expect(fetchReseau).toHaveBeenCalledTimes(1); // seul le jeu initial vient du réseau

    await nouvellePage();
    const relu = await fetch(`/api/mock/documents/${cree.id}`);
    expect(relu.status).toBe(200);
    expect(await relu.json()).toMatchObject({ titre: "Créé" });
  });

  it("expose X-Total-Count comme json-server", async () => {
    await nouvellePage();
    const res = await fetch("/api/mock/documents?_page=1&_limit=2");
    expect(res.headers.get("X-Total-Count")).toBe("3");
    expect(await res.json()).toHaveLength(2);
  });

  it("laisse passer les autres requêtes (IA, ressources externes)", async () => {
    await nouvellePage();
    await fetch("/api/ia/statut");
    expect(fetchReseau).toHaveBeenLastCalledWith("/api/ia/statut", undefined);
  });

  it("réinitialise les données de démonstration", async () => {
    const mock = await nouvellePage();
    await fetch("/api/mock/documents/d1", { method: "DELETE" });
    await mock.reinitialiserDonneesDemo();
    expect((await fetch("/api/mock/documents/d1")).status).toBe(200);
  });
});
