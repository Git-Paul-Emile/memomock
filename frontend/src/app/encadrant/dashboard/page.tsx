"use client";

import * as React from "react";
import Link from "next/link";
import { ClipboardCheck, FileStack, Hourglass, Users } from "lucide-react";

import { useAuth } from "@/context/auth-context";
import { useApiList } from "@/hooks/use-api-list";
import { PageHeader } from "@/components/shared/page-header";
import { Toolbar } from "@/components/shared/toolbar";
import { Pagination } from "@/components/shared/pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { formatDate, getInitials } from "@/lib/utils";
import type { DocumentSubmission, PublicUser } from "@/types";

export default function EncadrantDashboardPage() {
  const { user } = useAuth();
  const [recherche, setRecherche] = React.useState("");
  const [statut, setStatut] = React.useState<string>("tous");
  const [page, setPage] = React.useState(1);

  const { data: etudiants } = useApiList<PublicUser>("users", {
    filtres: { encadrantId: user?.id },
    limite: 100,
  });
  const etudiantsParId = React.useMemo(
    () => Object.fromEntries(etudiants.map((e) => [e.id, e])),
    [etudiants]
  );

  const { data: tousLesDocuments } = useApiList<DocumentSubmission>("documents", {
    filtres: { encadrantId: user?.id },
    limite: 200,
  });

  const { data, total, totalPages, isLoading } = useApiList<DocumentSubmission>("documents", {
    page,
    limite: 8,
    tri: "dateMaj",
    ordre: "desc",
    recherche,
    filtres: { encadrantId: user?.id, statut: statut === "tous" ? undefined : statut },
  });

  const aTraiter = tousLesDocuments.filter((d) => d.statut === "pret_pour_encadrant").length;
  const enRelecture = tousLesDocuments.filter((d) => d.statut === "en_relecture").length;
  const valides = tousLesDocuments.filter((d) => d.statut === "valide").length;

  return (
    <div>
      <PageHeader
        title={`Bonjour ${user?.prenom}`}
        description="Vue d'ensemble des documents soumis par vos étudiants."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Users className="size-4" />
              Étudiants suivis
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{etudiants.length}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Hourglass className="size-4" />À relire
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{aTraiter}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <FileStack className="size-4" />
              En relecture
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{enRelecture}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <ClipboardCheck className="size-4" />
              Validés
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{valides}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Documents reçus</CardTitle>
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
              icon={FileStack}
              title="Aucun document trouvé"
              description="Ajustez votre recherche ou vos filtres."
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Étudiant</TableHead>
                    <TableHead>Titre</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Mise à jour</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((doc) => {
                    const etudiant = etudiantsParId[doc.etudiantId];
                    return (
                      <TableRow key={doc.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="size-7">
                              <AvatarFallback>
                                {etudiant ? getInitials(etudiant.nom, etudiant.prenom) : "?"}
                              </AvatarFallback>
                            </Avatar>
                            <span className="whitespace-nowrap text-sm">
                              {etudiant ? `${etudiant.prenom} ${etudiant.nom}` : "-"}
                            </span>
                          </div>
                        </TableCell>
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
                            <Link href={`/encadrant/documents/${doc.id}/relecture`}>Ouvrir</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <Pagination
                page={page}
                totalPages={totalPages}
                total={total}
                limite={8}
                onPageChange={setPage}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
