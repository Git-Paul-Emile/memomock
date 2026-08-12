"use client";

import * as React from "react";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { AuthProvider } from "@/context/auth-context";
import { Toaster } from "@/components/ui/sonner";
import { OfflineBanner } from "@/components/layout/offline-banner";

export function Providers({ children }: { children: ReactNode }) {
  // Une seule instance de QueryClient par cycle de vie du composant (pas par rendu), pour ne
  // pas perdre le cache entre deux rendus côté client. `useState` avec initialiseur paresseux
  // garantit une seule création, y compris en présence de Strict Mode.
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <OfflineBanner />
        {children}
        <Toaster richColors closeButton />
      </AuthProvider>
    </QueryClientProvider>
  );
}
