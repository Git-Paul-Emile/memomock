"use client";

import type { ReactNode } from "react";

import { RouteGuard } from "@/components/layout/route-guard";
import { AppShell } from "@/components/layout/app-shell";
import { NAV_ADMIN } from "@/lib/constants";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <RouteGuard allow={["admin"]}>
      <AppShell navItems={NAV_ADMIN}>{children}</AppShell>
    </RouteGuard>
  );
}
