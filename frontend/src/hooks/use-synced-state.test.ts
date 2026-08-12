import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useSyncedState } from "@/hooks/use-synced-state";

describe("useSyncedState", () => {
  it("expose la valeur initiale tant que la source est undefined", () => {
    const { result } = renderHook(({ source }) => useSyncedState<string[]>(source, []), {
      initialProps: { source: undefined as string[] | undefined },
    });

    expect(result.current[0]).toEqual([]);
  });

  it("se resynchronise dès que la source (ex : donnée TanStack Query) devient définie ou change", () => {
    const premiereSource = ["a"];
    const { result, rerender } = renderHook(
      ({ source }: { source: string[] | undefined }) => useSyncedState<string[]>(source, []),
      { initialProps: { source: undefined as string[] | undefined } }
    );

    rerender({ source: premiereSource });
    expect(result.current[0]).toBe(premiereSource);

    const nouvelleSource = ["a", "b"];
    rerender({ source: nouvelleSource });
    expect(result.current[0]).toBe(nouvelleSource);
  });

  it("permet une mise à jour locale optimiste sans être écrasée tant que la source ne change pas", () => {
    const source = ["a"];
    const { result, rerender } = renderHook(
      ({ source }: { source: string[] | undefined }) => useSyncedState<string[]>(source, []),
      { initialProps: { source } }
    );

    act(() => {
      result.current[1]((prev) => [...prev, "b"]);
    });
    expect(result.current[0]).toEqual(["a", "b"]);

    // Un re-rendu avec la même référence de source ne doit pas écraser la mise à jour locale.
    rerender({ source });
    expect(result.current[0]).toEqual(["a", "b"]);
  });
});
