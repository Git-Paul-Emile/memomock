"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { BarChart3, Clock, Info, RefreshCw, Target } from "lucide-react";

import { useAuth } from "@/context/auth-context";
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
import { LIBELLES_TYPE_DOCUMENT } from "@/types";
import type { DocumentSubmission, PublicUser, TypeDocument } from "@/types";

// `recharts` chargé paresseusement côté client uniquement - même principe que /admin/statistiques.
const RepartitionChart = dynamic(
  () => import("@/components/admin/repartition-chart").then((mod) => mod.RepartitionChart),
  { ssr: false, loading: () => <Skeleton className="h-full w-full" /> }
);

const STATUTS_DECISION_FINALE = new Set(["valide", "rejete", "refuse"]);

function InfoCarte({ label }: { label: string }) {
  return (
    <span
      aria-label={label}
      className="inline-flex rounded-full text-muted-foreground/70"
      role="img"
      title={label}
    >
      <Info className="size-3.5" />
    </span>
  );
}

/**
 * Écran « Statistiques d'encadrement » (spec écrans E73-E77, consolidés) : temps moyen de
 * correction, cycles de révision, score moyen, répartition par type de document, par étudiant.
 * Calculé côté client à partir des listes déjà exposées et scopées par
 * `documents.service#authorize.list` (un encadrant ne voit que ses propres documents/étudiants)
 * - même approche que /admin/statistiques, pas d'endpoint d'agrégation dédié.
 */
export default function EncadrantStatistiquesPage() {
  const { user } = useAuth();
  const { data: documents, isLoading: chargementDocuments } = useApiList<DocumentSubmission>(
    "documents",
    { limite: 200 }
  );
  const { data: utilisateurs, isLoading: chargementUtilisateurs } = useApiList<PublicUser>(
    "users",
    {
      limite: 200,
    }
  );

  const etudiants = React.useMemo(
    () => utilisateurs.filter((u) => u.role === "etudiant"),
    [utilisateurs]
  );

  const scoreMoyen = React.useMemo(() => {
    if (documents.length === 0) return 0;
    const somme = documents.reduce((acc, d) => acc + d.scoreConformite, 0);
    return Math.round(somme / documents.length);
  }, [documents]);

  const cyclesMoyens = React.useMemo(() => {
    if (documents.length === 0) return 0;
    const somme = documents.reduce((acc, d) => acc + d.version, 0);
    return Math.round((somme / documents.length) * 10) / 10;
  }, [documents]);

  const tempsMoyenCorrectionJours = React.useMemo(() => {
    const traites = documents.filter((d) => STATUTS_DECISION_FINALE.has(d.statut));
    if (traites.length === 0) return null;
    const sommeJours = traites.reduce((acc, d) => {
      const debut = new Date(d.dateSoumission).getTime();
      const fin = new Date(d.dateMaj).getTime();
      return acc + Math.max(0, (fin - debut) / (1000 * 60 * 60 * 24));
    }, 0);
    return Math.round((sommeJours / traites.length) * 10) / 10;
  }, [documents]);

  const repartitionParType = React.useMemo(() => {
    const compteurs: Partial<Record<TypeDocument, number>> = {};
    documents.forEach((d) => {
      const type = d.typeDocument ?? "master";
      compteurs[type] = (compteurs[type] ?? 0) + 1;
    });
    return Object.entries(compteurs).map(([type, valeur]) => ({
      statut: LIBELLES_TYPE_DOCUMENT[type as TypeDocument],
      valeur,
    }));
  }, [documents]);

  const statsParEtudiant = React.useMemo(
    () =>
      etudiants
        .map((etu) => {
          const docsEtudiant = documents.filter((d) => d.etudiantId === etu.id);
          const score = docsEtudiant.length
            ? Math.round(
                docsEtudiant.reduce((acc, d) => acc + d.scoreConformite, 0) / docsEtudiant.length
              )
            : 0;
          return { etudiant: etu, nbDocuments: docsEtudiant.length, score };
        })
        .filter((s) => s.nbDocuments > 0)
        .sort((a, b) => b.nbDocuments - a.nbDocuments),
    [etudiants, documents]
  );

  const isLoading = chargementDocuments || chargementUtilisateurs;

  if (!user) return null;

  return (
    <div>
      <PageHeader
        title="Statistiques d'encadrement"
        description="Vue d'ensemble de votre activité d'encadrement : temps de correction, cycles de révision et progression de vos étudiants."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Target className="size-4" />
              Score moyen
              <InfoCarte label="Moyenne des scores de conformite des documents suivis." />
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {isLoading ? <Skeleton className="h-8 w-16" /> : `${scoreMoyen} %`}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <RefreshCw className="size-4" />
              <InfoCarte label="Nombre moyen de versions ou cycles de revision par document suivi." />
              Cycles de révision moyens
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {isLoading ? <Skeleton className="h-8 w-16" /> : cyclesMoyens}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Clock className="size-4" />
              <InfoCarte label="Delai moyen entre la soumission et une decision finale: validation, rejet ou refus." />
              Temps moyen jusqu&apos;à décision
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : tempsMoyenCorrectionJours === null ? (
              "-"
            ) : (
              `${tempsMoyenCorrectionJours} j`
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="size-4 text-primary" />
            Répartition par type de document
          </CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          {isLoading ? (
            <Skeleton className="h-full w-full" />
          ) : repartitionParType.length === 0 ? (
            <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Aucun type de document disponible.
            </p>
          ) : (
            <RepartitionChart data={repartitionParType} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Statistiques par étudiant</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : statsParEtudiant.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Aucun document suivi pour l&apos;instant.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Étudiant</TableHead>
                  <TableHead>Documents</TableHead>
                  <TableHead>Score moyen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statsParEtudiant.map(({ etudiant, nbDocuments, score }) => (
                  <TableRow key={etudiant.id}>
                    <TableCell className="font-medium">
                      {etudiant.prenom} {etudiant.nom}
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
