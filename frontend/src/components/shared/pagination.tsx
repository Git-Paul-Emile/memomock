import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

export function Pagination({
  page,
  totalPages,
  total,
  limite,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  limite: number;
  onPageChange: (page: number) => void;
}) {
  if (total === 0) return null;

  const debut = (page - 1) * limite + 1;
  const fin = Math.min(page * limite, total);

  return (
    <div className="flex flex-col gap-3 border-t px-1 pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        Affichage de <span className="font-medium text-foreground">{debut}</span> à{" "}
        <span className="font-medium text-foreground">{fin}</span> sur{" "}
        <span className="font-medium text-foreground">{total}</span> résultats
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="size-4" />
          Précédent
        </Button>
        <span className="text-sm text-muted-foreground">
          Page {page} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Suivant
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
