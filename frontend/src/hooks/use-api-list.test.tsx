import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useApiList } from "@/hooks/use-api-list";
import { apiList } from "@/lib/api";

// `lib/api` importe `lib/firebase` (initialisation du SDK Firebase) : on le mocke entièrement
// pour tester la logique du hook (TanStack Query) de façon isolée, sans dépendance réseau ni
// SDK externe.
vi.mock("@/lib/api", () => ({
  apiList: vi.fn(),
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe("useApiList", () => {
  beforeEach(() => {
    vi.mocked(apiList).mockReset();
  });

  it("expose un état de chargement initial, puis les données une fois la requête résolue", async () => {
    vi.mocked(apiList).mockResolvedValue({
      data: [{ id: "1" }, { id: "2" }],
      total: 2,
      page: 1,
      limite: 10,
      totalPages: 1,
    });

    const { result } = renderHook(() => useApiList<{ id: string }>("documents", { limite: 10 }), {
      wrapper,
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toEqual([]);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toEqual([{ id: "1" }, { id: "2" }]);
    expect(result.current.total).toBe(2);
    expect(apiList).toHaveBeenCalledWith("documents", { limite: 10 });
  });

  it("expose le message d'erreur si la requête échoue, sans planter", async () => {
    vi.mocked(apiList).mockRejectedValue(new Error("Erreur réseau"));

    const { result } = renderHook(() => useApiList<{ id: string }>("documents", {}), { wrapper });

    await waitFor(() => expect(result.current.error).toBe("Erreur réseau"));
    expect(result.current.data).toEqual([]);
  });
});
