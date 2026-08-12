"use client";

import type { ReactNode } from "react";

import { RouteGuard } from "@/components/layout/route-guard";
import { AppShell } from "@/components/layout/app-shell";
import { NAV_ENCADRANT } from "@/lib/constants";

export default function EncadrantLayout({ children }: { children: ReactNode }) {
  return (
    <RouteGuard allow={["encadrant"]}>
      <AppShell navItems={NAV_ENCADRANT}>{children}</AppShell>
    </RouteGuard>
  );
}
