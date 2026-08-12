import type { ReactNode } from "react";

import { SharedPageShell } from "@/components/layout/shared-page-shell";

export default function ParametresLayout({ children }: { children: ReactNode }) {
  return <SharedPageShell>{children}</SharedPageShell>;
}
