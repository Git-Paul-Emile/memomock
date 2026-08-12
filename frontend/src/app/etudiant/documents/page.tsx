"use client";

import * as React from "react";
import Link from "next/link";
import { FilePlus2, Files } from "lucide-react";

import { useAuth } from "@/context/auth-context";
import { useApiList } from "@/hooks/use-api-list";
import { PageHeader } from "@/components/shared/page-header";
import { Toolbar } from "@/components/shared/toolbar";
import { Pagination } from "@/components/shared/pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { STATUT_DOCUMENT_LABELS, STATUTS_FILTRABLES } from "@/lib/constants";
import { lienDocumentEtudiant } from "@/lib/document-routing";
import { formatDate } from "@/lib/utils";
import { LIBELLES_TYPE_DOCUMENT } from "@/types";
import type { DocumentSubmission, TypeDocument } from "@/types";

const TYPES_FILTRABLES: (TypeDocument | "tous")[] = ["tous", "licence", "master", "doctorat"];

/** Écran « Mes documents » (spec D4) : liste complète, filtrable par type et statut. */
export default function MesDocumentsPage() {
  const { user } = useAuth();
  const [recherche, setRecherche] = React.useState("");
  const [statut, setStatut] = React.useState<string>("tous");
  const [type, setType] = React.useState<string>("tous");
  const [page, setPage] = React.useState(1);

  const { data, total, totalPages, isLoading } = useApiList<DocumentSubmission>("documents", {
    page,
    limite: 10,
    tri: "dateMaj",
    ordre: "desc",
    recherche,
    filtres: {
      etudiantId: user?.id,
      statut: statut === "tous" ? undefined : statut,
      typeDocument: type === "tous" ? undefined : type,
    },
  });

  return (
    <div>
      <PageHeader
        title="Mes documents"
        description="Tous vos mémoires, brouillons compris."
        actions={
          <Button asChild>
            <Link href="/etudiant/documents/nouveau">
              <FilePlus2 className="size-4" />
              Nouveau document
            </Link>
          </Button>
        }
      />

      <Card>
        <CardContent className="pt-6">
          <Toolbar
            recherche={recherche}
            onRechercheChange={(v) => {
              setRecherche(v);
              setPage(1);
            }}
            placeholderRecherche="Rechercher un document…"
          >
            <Select
              value={type}
              onValueChange={(v) => {
                setType(v);
                setPage(1);
              }}
            >
              <SelectTrigger size="sm" className="w-40">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                {TYPES_FILTRABLES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t === "tous" ? "Tous les types" : LIBELLES_TYPE_DOCUMENT[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={statut}
              onValueChange={(v) => {
                setStatut(v);
                setPage(1);
              }}
            >
              <SelectTrigger size="sm" className="w-52">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                {STATUTS_FILTRABLES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s === "tous" ? "Tous les statuts" : STATUT_DOCUMENT_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Toolbar>

          {!isLoading && data.length === 0 ? (
            <EmptyState
              icon={Files}
              title="Aucun document trouvé"
              description="Ajustez votre recherche ou créez votre premier document."
              action={
                <Button asChild size="sm">
                  <Link href="/etudiant/documents/nouveau">Nouveau document</Link>
                </Button>
              }
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Titre</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Dernière mise à jour</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="max-w-xs truncate font-medium">{doc.titre}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {doc.typeDocument ? LIBELLES_TYPE_DOCUMENT[doc.typeDocument] : "-"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge statut={doc.statut} />
                      </TableCell>
                      <TableCell>
                        {doc.statut === "brouillon" ? "-" : `${doc.scoreConformite} / 100`}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(doc.dateMaj)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={lienDocumentEtudiant(doc)}>
                            {doc.statut === "brouillon" ? "Importer le fichier" : "Ouvrir"}
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination
                page={page}
                totalPages={totalPages}
                total={total}
                limite={10}
                onPageChange={setPage}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
