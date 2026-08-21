"use client";

import type { ReactNode } from "react";

import { RouteGuard } from "@/components/layout/route-guard";
import { AppShell } from "@/components/layout/app-shell";
import { NAV_ETABLISSEMENT } from "@/lib/constants";

export default function EtablissementLayout({ children }: { children: ReactNode }) {
  return (
    <RouteGuard allow={["admin_etablissement"]}>
      <AppShell navItems={NAV_ETABLISSEMENT}>{children}</AppShell>
    </RouteGuard>
  );
}
