"use client";

import type { ReactNode } from "react";

import { RouteGuard } from "@/components/layout/route-guard";
import { AppShell } from "@/components/layout/app-shell";
import { NAV_ETUDIANT } from "@/lib/constants";

export default function EtudiantLayout({ children }: { children: ReactNode }) {
  return (
    <RouteGuard allow={["etudiant"]}>
      <AppShell navItems={NAV_ETUDIANT}>{children}</AppShell>
    </RouteGuard>
  );
}
