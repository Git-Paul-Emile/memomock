"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Download, Eye, PenLine } from "lucide-react";

import { toast } from "sonner";

import { useApiResource } from "@/hooks/use-api-resource";
import { PanneauLivrables } from "@/components/livrables/panneau-livrables";
import { PageHeader } from "@/components/shared/page-header";
import { ScoreJauge } from "@/components/shared/score-jauge";
import { DetailScores } from "@/components/shared/detail-scores";
import { BadgeSourceIa, PointAnalyseCarte } from "@/components/documents/point-analyse";
import { FilMessagerie } from "@/components/documents/fil-messagerie";
import { LIBELLE_SCORE } from "@/lib/score";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiGet, apiList, apiPatch, apiPost } from "@/lib/api";
import { resoudreLivrables, type LivrableAffiche } from "@/lib/livrables";
import { joursRestants } from "@/lib/retards";
import { formatDate, getInitials } from "@/lib/utils";
import type {
  Analyse,
  DocumentSubmission,
  Livrable,
  PointAnalyse,
  ProfilEncadrant,
  PublicUser,
} from "@/types";

interface DonneesReception {
  document: DocumentSubmission;
  etudiant: PublicUser | null;
  points: PointAnalyse[];
  livrables: LivrableAffiche[];
  // Nombre d'analyses successives (réimports) : mesure les corrections faites avant soumission.
  nbVersions: number;
}

/**
 * Écran « Réception d'un travail soumis » côté encadrant.
 *
 * Vue d'entrée avant la correction : le document, l'étudiant, le score atteint et le résumé des
 * points d'analyse déjà produits par l'IA - le tout chargé depuis la base.
 */
export default function ReceptionPage() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading, refetch } = useApiResource<DonneesReception>(
    ["document-reception", id],
    async () => {
      const doc = await apiGet<DocumentSubmission>("documents", id);
      const [etu, analyses, profil, livrablesRes] = await Promise.all([
        apiGet<PublicUser>("users", doc.etudiantId).catch(() => null),
        apiList<Analyse>("analyses", { filtres: { documentId: id }, limite: 10 }),
        doc.profilEncadrantId
          ? apiGet<ProfilEncadrant>("profils-encadrant", doc.profilEncadrantId).catch(() => null)
          : Promise.resolve(null),
        apiList<Livrable>("livrables", { filtres: { documentId: id }, limite: 50 }),
      ]);
      const versions = await apiList<{ id: string }>("versions", { filtres: { documentId: id }, limite: 200 });
      return {
        document: doc,
        etudiant: etu,
        points: analyses.data.flatMap((a) => a.points),
        livrables: resoudreLivrables(profil?.livrablesAttendus ?? [], livrablesRes.data),
        nbVersions: versions.data.length,
      };
    }
  );

  const document = data?.document ?? null;
  const etudiant = data?.etudiant ?? null;
  const points = data?.points ?? [];
  const livrables = data?.livrables ?? [];

  const verifierLivrable = async (
    item: LivrableAffiche,
    decision: "valide" | "en_correction",
    commentaire: string
  ) => {
    if (!item.livrable || !document) return;
    const maintenant = new Date().toISOString();
    try {
      await apiPatch<Livrable>("livrables", item.livrable.id, {
        statut: decision,
        commentaireEncadrant: decision === "en_correction" ? commentaire : null,
        dateVerification: maintenant,
        updatedAt: maintenant,
      });

      await apiPost("notifications", {
        userId: document.etudiantId,
        titre: decision === "valide" ? "Livrable conforme" : "Livrable à corriger",
        message:
          decision === "valide"
            ? `« ${item.nom} » a été validé par votre encadreur.`
            : `« ${item.nom} » nécessite une correction : ${commentaire}`,
        type: "correction",
        lu: false,
        date: maintenant,
        lienDocumentId: document.id,
      });

      toast.success(decision === "valide" ? "Livrable marqué conforme." : "Correction demandée.");
      refetch();
    } catch {
      toast.error("La mise à jour du livrable a échoué.");
    }
  };

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
        description={`Version ${document.version}${document.version > 1 ? " (révisée)" : ""}${document.nomFichier ? ` · ${document.nomFichier}` : ""}`}
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/encadrant/documents/${id}/apercu`}>
                <Eye className="size-4" />
                Prévisualiser
              </Link>
            </Button>
            {document.urlFichier && (
              <Button variant="outline" size="sm" asChild>
                <a href={document.urlFichier} target="_blank" rel="noopener noreferrer">
                  <Download className="size-4" />
                  Télécharger
                </a>
              </Button>
            )}
            <BadgeSourceIa source={document.sourceAnalyse} />
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
              <div className="ml-auto text-right text-xs text-muted-foreground">
                <p>Soumis le {formatDate(document.dateSoumission)}</p>
                {document.dateSoutenancePrevue && (
                  <p className="mt-0.5 flex items-center justify-end gap-1.5">
                    Soutenance : {formatDate(document.dateSoutenancePrevue)}
                    <Badge
                      variant={
                        joursRestants(document.dateSoutenancePrevue) < 0
                          ? "destructive"
                          : joursRestants(document.dateSoutenancePrevue) <= 14
                            ? "warning"
                            : "outline"
                      }
                    >
                      {joursRestants(document.dateSoutenancePrevue) < 0
                        ? "Dépassée"
                        : `J-${joursRestants(document.dateSoutenancePrevue)}`}
                    </Badge>
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Résumé du prétraitement IA</CardTitle>
              <CardDescription>
                {points.filter((p) => p.niveau !== "succes").length} point(s) à surveiller, dont{" "}
                {points.filter((p) => p.avisEncadreur).length} relevant de votre jugement
                scientifique. Les problèmes de forme ont été traités en amont : concentrez-vous
                sur le fond.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {points.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucune analyse disponible pour ce document.
                </p>
              ) : (
                [...points]
                  .sort((a, b) => Number(!!b.avisEncadreur) - Number(!!a.avisEncadreur))
                  .filter((p) => p.niveau !== "succes")
                  .map((point) => <PointAnalyseCarte key={point.id} point={point} />)
              )}
            </CardContent>
          </Card>

          <PanneauLivrables items={livrables} role="encadrant" onVerifier={verifierLivrable} />

          <Card className="h-[420px] gap-0 overflow-hidden p-0">
            <CardHeader className="border-b py-3">
              <CardTitle className="text-sm">Messagerie avec l&apos;étudiant</CardTitle>
            </CardHeader>
            <div className="h-[360px]">
              <FilMessagerie document={document} />
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Score de conformité</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-3">
              <ScoreJauge score={document.scoreConformite} />
              <p className="text-center text-[11px] leading-tight text-muted-foreground">
                {LIBELLE_SCORE}
              </p>
              <DetailScores document={document} compact />
              <p className="w-full border-t pt-2 text-xs text-muted-foreground">
                {data?.nbVersions ?? 0} version(s) soumise(s) ·{" "}
                {(document.pointsBloquants?.length ?? 0) === 0
                  ? "aucun point bloquant"
                  : `${document.pointsBloquants!.length} point(s) bloquant(s)`}
              </p>
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
