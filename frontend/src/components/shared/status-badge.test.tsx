import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StatusBadge } from "./status-badge";
import { STATUT_DOCUMENT_LABELS } from "@/lib/constants";
import type { StatutDocument } from "@/types";

describe("StatusBadge", () => {
  it.each(Object.keys(STATUT_DOCUMENT_LABELS) as StatutDocument[])(
    "affiche le libellé français correspondant au statut « %s »",
    (statut) => {
      render(<StatusBadge statut={statut} />);
      expect(screen.getByText(STATUT_DOCUMENT_LABELS[statut])).toBeInTheDocument();
    }
  );
});
