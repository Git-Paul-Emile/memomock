"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CheckCircle2, Download, FileText, PenLine } from "lucide-react";

import { useApiResource } from "@/hooks/use-api-resource";
import { PageHeader } from "@/components/shared/page-header";
import { ScoreJauge } from "@/components/shared/score-jauge";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiGet, apiList } from "@/lib/api";
import { formatDate, getInitials } from "@/lib/utils";
import type { Analyse, DocumentSubmission, PointAnalyse, PublicUser } from "@/types";

interface DonneesReception {
  document: DocumentSubmission;
  etudiant: PublicUser | null;
  points: PointAnalyse[];
}

/**
 * Écran « Réception d'un travail soumis » côté encadrant.
 *
 * Vue d'entrée avant la correction : le document, l'étudiant, le score atteint et le résumé des
 * points d'analyse déjà produits par l'IA - le tout chargé depuis la base.
 */
export default function ReceptionPage() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading } = useApiResource<DonneesReception>(
    ["document-reception", id],
    async () => {
      const doc = await apiGet<DocumentSubmission>("documents", id);
      const [etu, analyses] = await Promise.all([
        apiGet<PublicUser>("users", doc.etudiantId).catch(() => null),
        apiList<Analyse>("analyses", { filtres: { documentId: id }, limite: 10 }),
      ]);
      return { document: doc, etudiant: etu, points: analyses.data.flatMap((a) => a.points) };
    }
  );

  const document = data?.document ?? null;
  const etudiant = data?.etudiant ?? null;
  const points = data?.points ?? [];

  if (isLoading || !document) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title={document.titre}
        description={`Version ${document.version} · ${document.nomFichier}`}
        actions={
          <>
            {document.urlFichier && (
              <Button variant="outline" size="sm" asChild>
                <a href={document.urlFichier} target="_blank" rel="noopener noreferrer">
                  <Download className="size-4" />
                  Télécharger
                </a>
              </Button>
            )}
            <StatusBadge statut={document.statut} />
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
        <div className="space-y-6">
          <Card>
            <CardContent className="flex items-center gap-3 py-5">
              <div className="flex size-11 items-center justify-center rounded-full bg-muted text-sm font-medium">
                {etudiant ? getInitials(etudiant.nom, etudiant.prenom) : "?"}
              </div>
              <div>
                <p className="font-medium">
                  {etudiant ? `${etudiant.prenom} ${etudiant.nom}` : "-"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {etudiant?.filiere ?? etudiant?.email ?? ""}
                </p>
              </div>
              <div className="ml-auto text-xs text-muted-foreground">
                Soumis le {formatDate(document.dateSoumission)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Résumé du prétraitement IA</CardTitle>
              <CardDescription>
                Les corrections de forme sont déjà faites : concentrez-vous sur le fond.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {points.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucune analyse disponible pour ce document.
                </p>
              ) : (
                points.map((point) => (
                  <div key={point.id} className="flex items-start gap-3 rounded-lg border p-3">
                    {point.niveau === "succes" ? (
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                    ) : (
                      <FileText
                        className={`mt-0.5 size-4 shrink-0 ${
                          point.niveau === "erreur" ? "text-destructive" : "text-warning"
                        }`}
                      />
                    )}
                    <div>
                      <p className="text-sm font-medium">{point.libelle}</p>
                      <p className="text-sm text-muted-foreground">{point.detail}</p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Score de conformité</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-3">
              <ScoreJauge score={document.scoreConformite} />
              <div className="w-full space-y-1 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Forme</span>
                  <span className="font-medium text-foreground">{document.scoreForme}</span>
                </div>
                <div className="flex justify-between">
                  <span>Fond</span>
                  <span className="font-medium text-foreground">{document.scoreFond}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Button className="w-full" asChild>
            <Link href={`/encadrant/documents/${id}/correction`}>
              <PenLine className="size-4" />
              Ouvrir l&apos;éditeur de correction
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
