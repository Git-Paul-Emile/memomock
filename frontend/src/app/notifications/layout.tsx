import type { ReactNode } from "react";

import { SharedPageShell } from "@/components/layout/shared-page-shell";

export default function NotificationsLayout({ children }: { children: ReactNode }) {
  return <SharedPageShell>{children}</SharedPageShell>;
}
