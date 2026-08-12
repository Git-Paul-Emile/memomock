"use client";

import * as React from "react";
import { History } from "lucide-react";

import { useApiList } from "@/hooks/use-api-list";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Pagination } from "@/components/shared/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/utils";
import type { JournalAudit } from "@/types";

/**
 * Écran « Journal d'audit » (spec F33, distinct de F34 « Journal système » = /admin/supervision,
 * technique). Trace uniquement les actions sensibles (voir backend/src/utils/audit.js) : décision
 * finale sur un document, changement de rôle/désactivation de compte, publication/archivage d'un
 * référentiel.
 */
export default function AdminJournalAuditPage() {
  const [page, setPage] = React.useState(1);
  const { data, total, totalPages, isLoading } = useApiList<JournalAudit>("journal-audit", {
    page,
    limite: 20,
  });

  return (
    <div>
      <PageHeader
        title="Journal d'audit"
        description="Historique des actions sensibles : décisions sur les documents, changements de rôle, publication de référentiels."
      />

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : data.length === 0 ? (
            <EmptyState icon={History} title="Aucune action tracée pour l'instant" />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>Acteur</TableHead>
                    <TableHead>Cible</TableHead>
                    <TableHead>Détails</TableHead>
                    <TableHead className="text-right">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((entree) => (
                    <TableRow key={entree.id}>
                      <TableCell className="font-medium">{entree.action}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {entree.acteurId} ({entree.acteurRole})
                      </TableCell>
                      <TableCell className="text-muted-foreground">{entree.cible}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {entree.details ?? "-"}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatDateTime(entree.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination
                page={page}
                totalPages={totalPages}
                total={total}
                limite={20}
                onPageChange={setPage}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
