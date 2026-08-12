"use client";

import type { ReactNode } from "react";

import { useAuth } from "@/context/auth-context";
import { RouteGuard } from "@/components/layout/route-guard";
import { AppShell } from "@/components/layout/app-shell";
import { NAV_ADMIN, NAV_ENCADRANT, NAV_ETUDIANT } from "@/lib/constants";

/**
 * Enveloppe pour les écrans transverses (notifications, paramètres) accessibles quel que
 * soit le rôle : la navigation affichée s'adapte au rôle de l'utilisateur connecté.
 */
export function SharedPageShell({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  const navItems =
    user?.role === "encadrant" ? NAV_ENCADRANT : user?.role === "admin" ? NAV_ADMIN : NAV_ETUDIANT;

  return (
    <RouteGuard allow={["etudiant", "encadrant", "admin"]}>
      <AppShell navItems={navItems}>{children}</AppShell>
    </RouteGuard>
  );
}
