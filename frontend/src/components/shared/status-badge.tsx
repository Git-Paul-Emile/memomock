import { Badge } from "@/components/ui/badge";
import { STATUT_DOCUMENT_LABELS, STATUT_DOCUMENT_VARIANT } from "@/lib/constants";
import type { StatutDocument } from "@/types";

export function StatusBadge({ statut }: { statut: StatutDocument }) {
  return <Badge variant={STATUT_DOCUMENT_VARIANT[statut]}>{STATUT_DOCUMENT_LABELS[statut]}</Badge>;
}
