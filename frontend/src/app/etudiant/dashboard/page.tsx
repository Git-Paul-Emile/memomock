"use client";

import * as React from "react";
import Link from "next/link";
import { FileText, MessageSquareText, TrendingUp, UploadCloud } from "lucide-react";

import { useAuth } from "@/context/auth-context";
import { useApiList } from "@/hooks/use-api-list";
import { PageHeader } from "@/components/shared/page-header";
import { Toolbar } from "@/components/shared/toolbar";
import { Pagination } from "@/components/shared/pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import type { DocumentSubmission } from "@/types";

export default function EtudiantDashboardPage() {
  const { user } = useAuth();
  const [recherche, setRecherche] = React.useState("");
  const [statut, setStatut] = React.useState<string>("tous");
  const [page, setPage] = React.useState(1);

  const { data: tousLesDocuments } = useApiList<DocumentSubmission>("documents", {
    filtres: { etudiantId: user?.id },
    limite: 100,
  });

  const { data, total, totalPages, isLoading } = useApiList<DocumentSubmission>("documents", {
    page,
    limite: 6,
    tri: "dateMaj",
    ordre: "desc",
    recherche,
    filtres: { etudiantId: user?.id, statut: statut === "tous" ? undefined : statut },
  });

  const enCours = tousLesDocuments.filter(
    (d) => !["valide", "rejete", "refuse"].includes(d.statut)
  ).length;
  const valides = tousLesDocuments.filter((d) => d.statut === "valide").length;
  const scoreMoyen = tousLesDocuments.length
    ? Math.round(
        tousLesDocuments.reduce((acc, d) => acc + d.scoreConformite, 0) / tousLesDocuments.length
      )
    : 0;

  return (
    <div>
      <PageHeader
        title={`Bonjour ${user?.prenom}`}
        description="Suivez ici l'état de vos soumissions et l'avancement de vos corrections."
        actions={
          <Button asChild>
            <Link href="/etudiant/soumission">
              <UploadCloud className="size-4" />
              Soumettre un document
            </Link>
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <FileText className="size-4" />
              Documents en cours
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{enCours}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <MessageSquareText className="size-4" />
              Mémoires validés
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{valides}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <TrendingUp className="size-4" />
              Score de conformité moyen
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{scoreMoyen} / 100</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historique de mes soumissions</CardTitle>
        </CardHeader>
        <CardContent>
          <Toolbar
            recherche={recherche}
            onRechercheChange={(v) => {
              setRecherche(v);
              setPage(1);
            }}
            placeholderRecherche="Rechercher un document…"
          >
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
              icon={FileText}
              title="Aucun document trouvé"
              description="Ajustez votre recherche ou soumettez votre premier document."
              action={
                <Button asChild size="sm">
                  <Link href="/etudiant/soumission">Soumettre un document</Link>
                </Button>
              }
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Titre</TableHead>
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
                      <TableCell>
                        <StatusBadge statut={doc.statut} />
                      </TableCell>
                      <TableCell>{doc.scoreConformite} / 100</TableCell>
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
                limite={6}
                onPageChange={setPage}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
