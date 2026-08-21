"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CheckCircle2, Download, Eye, FileText, PenLine } from "lucide-react";

import { toast } from "sonner";

import { useApiResource } from "@/hooks/use-api-resource";
import { PanneauLivrables } from "@/components/livrables/panneau-livrables";
import { PageHeader } from "@/components/shared/page-header";
import { ScoreJauge } from "@/components/shared/score-jauge";
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
      return {
        document: doc,
        etudiant: etu,
        points: analyses.data.flatMap((a) => a.points),
        livrables: resoudreLivrables(profil?.livrablesAttendus ?? [], livrablesRes.data),
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
            ? `« ${item.nom} » a été validé par votre encadrant.`
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
        description={`Version ${document.version} · ${document.nomFichier}`}
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

          <PanneauLivrables items={livrables} role="encadrant" onVerifier={verifierLivrable} />
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
