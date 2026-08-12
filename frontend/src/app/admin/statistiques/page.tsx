"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { BarChart3, CheckCircle2, FileText, GraduationCap, Users } from "lucide-react";

import { useApiList } from "@/hooks/use-api-list";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { STATUT_DOCUMENT_LABELS } from "@/lib/constants";
import { LIBELLES_TYPE_DOCUMENT } from "@/types";
import type { DocumentSubmission, PublicUser, StatutDocument, TypeDocument } from "@/types";

// `recharts` chargé paresseusement côté client uniquement - même principe que /admin/supervision.
const RepartitionChart = dynamic(
  () => import("@/components/admin/repartition-chart").then((mod) => mod.RepartitionChart),
  { ssr: false, loading: () => <Skeleton className="h-full w-full" /> }
);

/**
 * Écran « Statistiques de la plateforme » (spec écrans F27-F32, consolidés) : vue d'ensemble
 * de l'activité - nombre d'étudiants/encadrants, documents par statut/type/discipline,
 * classement par encadrant, taux de validation. Calculé côté client à partir des listes déjà
 * exposées (pas d'endpoint d'agrégation dédié) - un administrateur voit l'intégralité des
 * données (voir authorize.list, `estAdmin`).
 *
 * Les axes « par établissement » et « par département » n'existent plus : la notion
 * d'institution a été retirée du produit. La discipline (champ texte libre porté par le
 * document) reste le seul axe d'agrégation académique.
 */
export default function AdminStatistiquesPage() {
  const { data: utilisateurs, isLoading: chargementUtilisateurs } = useApiList<PublicUser>(
    "users",
    {
      limite: 100,
    }
  );
  const { data: documents, isLoading: chargementDocuments } = useApiList<DocumentSubmission>(
    "documents",
    { limite: 100 }
  );

  const etudiants = utilisateurs.filter((u) => u.role === "etudiant").length;
  const encadrants = utilisateurs.filter((u) => u.role === "encadrant").length;
  const valides = documents.filter((d) => d.statut === "valide").length;
  const tauxValidation = documents.length ? Math.round((valides / documents.length) * 100) : 0;

  const repartitionStatuts = React.useMemo(() => {
    const compteurs: Partial<Record<StatutDocument, number>> = {};
    documents.forEach((d) => {
      compteurs[d.statut] = (compteurs[d.statut] ?? 0) + 1;
    });
    return Object.entries(compteurs).map(([statut, valeur]) => ({
      statut: STATUT_DOCUMENT_LABELS[statut as StatutDocument],
      valeur,
    }));
  }, [documents]);

  // F32 : répartition par niveau (type de document).
  const repartitionNiveaux = React.useMemo(() => {
    const compteurs: Partial<Record<TypeDocument, number>> = {};
    documents.forEach((d) => {
      if (!d.typeDocument) return;
      compteurs[d.typeDocument] = (compteurs[d.typeDocument] ?? 0) + 1;
    });
    return Object.entries(compteurs).map(([type, valeur]) => ({
      statut: LIBELLES_TYPE_DOCUMENT[type as TypeDocument],
      valeur,
    }));
  }, [documents]);

  // F29 : répartition par formation (discipline, proxy texte libre - voir note ci-dessus).
  const repartitionDisciplines = React.useMemo(() => {
    const compteurs: Record<string, number> = {};
    documents.forEach((d) => {
      if (!d.discipline) return;
      compteurs[d.discipline] = (compteurs[d.discipline] ?? 0) + 1;
    });
    return Object.entries(compteurs)
      .map(([statut, valeur]) => ({ statut, valeur }))
      .sort((a, b) => b.valeur - a.valeur)
      .slice(0, 8);
  }, [documents]);

  // F30 : classement par encadrant.
  const statsParEncadrant = React.useMemo(() => {
    const encadrantsList = utilisateurs.filter((u) => u.role === "encadrant");
    return encadrantsList
      .map((enc) => {
        const docsEncadrant = documents.filter((d) => d.encadrantId === enc.id);
        const score = docsEncadrant.length
          ? Math.round(
              docsEncadrant.reduce((acc, d) => acc + d.scoreConformite, 0) / docsEncadrant.length
            )
          : 0;
        return { encadrant: enc, nbDocuments: docsEncadrant.length, score };
      })
      .filter((s) => s.nbDocuments > 0)
      .sort((a, b) => b.nbDocuments - a.nbDocuments);
  }, [utilisateurs, documents]);

  const isLoading = chargementUtilisateurs || chargementDocuments;

  return (
    <div>
      <PageHeader
        title="Statistiques"
        description="Vue d'ensemble de l'activité de la plateforme."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <GraduationCap className="size-4" />
              Étudiants
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{etudiants}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Users className="size-4" />
              Encadrants
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{encadrants}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <FileText className="size-4" />
              Documents suivis
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{documents.length}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <CheckCircle2 className="size-4" />
              Taux de validation
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{tauxValidation} %</CardContent>
        </Card>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="size-4 text-primary" />
              Par statut
            </CardTitle>
          </CardHeader>
          <CardContent className="h-56">
            {isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <RepartitionChart data={repartitionStatuts} />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="size-4 text-primary" />
              Par niveau
            </CardTitle>
          </CardHeader>
          <CardContent className="h-56">
            {isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <RepartitionChart data={repartitionNiveaux} />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="size-4 text-primary" />
              Par formation
            </CardTitle>
          </CardHeader>
          <CardContent className="h-56">
            {isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <RepartitionChart data={repartitionDisciplines} />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Statistiques par encadreur</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : statsParEncadrant.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Aucun document suivi.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Encadreur</TableHead>
                  <TableHead>Documents</TableHead>
                  <TableHead>Score moyen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statsParEncadrant.map(({ encadrant, nbDocuments, score }) => (
                  <TableRow key={encadrant.id}>
                    <TableCell className="font-medium">
                      {encadrant.prenom} {encadrant.nom}
                    </TableCell>
                    <TableCell>{nbDocuments}</TableCell>
                    <TableCell>{score} %</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
