import * as React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { RouteGuard, espaceParDefaut } from "./route-guard";
import { useAuth } from "@/context/auth-context";
import type { PublicUser } from "@/types";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));
vi.mock("@/context/auth-context", () => ({
  useAuth: vi.fn(),
}));

import { useRouter } from "next/navigation";

const replace = vi.fn();

function utilisateur(role: PublicUser["role"]): PublicUser {
  return { id: "u1", role, nom: "Ba", prenom: "Awa", email: "awa@memoai.fr" } as PublicUser;
}

describe("RouteGuard", () => {
  beforeEach(() => {
    replace.mockReset();
    vi.mocked(useRouter).mockReturnValue({ replace } as unknown as ReturnType<typeof useRouter>);
  });

  it("redirige vers /login quand personne n'est authentifié", async () => {
    vi.mocked(useAuth).mockReturnValue({ user: null, isLoading: false } as ReturnType<
      typeof useAuth
    >);

    render(
      <RouteGuard allow={["etudiant"]}>
        <p>Contenu protégé</p>
      </RouteGuard>
    );

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login"));
    expect(screen.queryByText("Contenu protégé")).not.toBeInTheDocument();
  });

  it("redirige vers /acces-refuse (écran H22) si l'espace visité ne lui est pas autorisé", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: utilisateur("etudiant"),
      isLoading: false,
    } as ReturnType<typeof useAuth>);

    render(
      <RouteGuard allow={["admin"]}>
        <p>Supervision admin</p>
      </RouteGuard>
    );

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/acces-refuse"));
    expect(screen.queryByText("Supervision admin")).not.toBeInTheDocument();
  });

  it("affiche les enfants sans redirection quand le rôle est autorisé", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: utilisateur("encadrant"),
      isLoading: false,
    } as ReturnType<typeof useAuth>);

    render(
      <RouteGuard allow={["encadrant"]}>
        <p>Tableau de bord encadrant</p>
      </RouteGuard>
    );

    expect(await screen.findByText("Tableau de bord encadrant")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("n'effectue aucune redirection tant que l'état d'authentification est en cours de chargement", () => {
    vi.mocked(useAuth).mockReturnValue({ user: null, isLoading: true } as ReturnType<
      typeof useAuth
    >);

    render(
      <RouteGuard allow={["etudiant"]}>
        <p>Contenu protégé</p>
      </RouteGuard>
    );

    expect(replace).not.toHaveBeenCalled();
    expect(screen.queryByText("Contenu protégé")).not.toBeInTheDocument();
  });
});

describe("espaceParDefaut", () => {
  it("associe chaque rôle à son espace d'accueil", () => {
    expect(espaceParDefaut("etudiant")).toBe("/etudiant/dashboard");
    expect(espaceParDefaut("encadrant")).toBe("/encadrant/dashboard");
    expect(espaceParDefaut("admin")).toBe("/admin/supervision");
  });
});
