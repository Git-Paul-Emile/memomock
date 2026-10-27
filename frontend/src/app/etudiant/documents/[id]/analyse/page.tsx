"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  FileSearch,
  History,
  Loader2,
  MessageSquareText,
  PenLine,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { DetailScores } from "@/components/shared/detail-scores";
import { BadgeSourceIa, PointAnalyseCarte } from "@/components/documents/point-analyse";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { apiGet, apiList, apiPatch } from "@/lib/api";
import { lancerAnalyseDocument } from "@/lib/analyse-document";
import { formatDateTime } from "@/lib/utils";
import type { Analyse, DocumentSubmission, TypeAnalyse } from "@/types";

const ONGLET_LABELS: Record<TypeAnalyse, string> = {
  forme: "Forme",
  fond: "Fond",
  coherence: "Cohérence",
  structure: "Structure",
};
const TYPES_ANALYSE: TypeAnalyse[] = ["structure", "forme", "fond", "coherence"];

interface DonneesAnalyse {
  document: DocumentSubmission;
  analyses: Analyse[];
}

export default function AnalyseDocumentPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [analyseEnCours, setAnalyseEnCours] = React.useState(false);

  // Utilise directement useQuery (plutôt que useApiResource) pour son option `refetchInterval` :
  // l'analyse simulée est lancée à la soumission du document (voir /etudiant/soumission,
  // `lancerAnalyseSimulee`). Cet écran se contente de RECHARGER périodiquement, via le polling
  // natif de TanStack Query, tant que le document est "analyse_en_cours" sans résultat visible.
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["document-analyse-etudiant", id],
    queryFn: async (): Promise<DonneesAnalyse> => {
      const [doc, listeAnalyses] = await Promise.all([
        apiGet<DocumentSubmission>("documents", id),
        apiList<Analyse>("analyses", { filtres: { documentId: id }, limite: 10 }),
      ]);
      return { document: doc, analyses: listeAnalyses.data };
    },
    refetchInterval: (query) => {
      const etat = query.state.data;
      if (etat && etat.document.statut === "analyse_en_cours") return 3000;
      return false;
    },
  });

  const document = data?.document ?? null;
  const analyses = data?.analyses ?? [];

  // Filet de sécurité si l'analyse automatique n'a jamais démarré ou est restée bloquée.
  const relancerAnalyse = async () => {
    if (!document) return;
    setAnalyseEnCours(true);
    try {
      await apiPatch("documents", document.id, {
        statut: "analyse_en_cours",
        dateMaj: new Date().toISOString(),
      });
      void lancerAnalyseDocument(document.id).catch(() => {});
      toast.success("Analyse relancée.");
      await refetch();
    } catch {
      toast.error("Impossible de relancer l'analyse pour le moment.");
    } finally {
      setAnalyseEnCours(false);
    }
  };

  // La soumission officielle passe par l'écran de confirmation, qui crée la version (spec v2, § 28).
  const soumettreEncadreur = () => router.push(`/etudiant/documents/${document?.id}/confirmation`);

  if (isLoading || !document) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const analyseDisponible = analyses.length > 0;
  // État calculé à chaque analyse (lib/score.ts) : seuil global, minimum par catégorie, aucun
  // point bloquant.
  const scoreSuffisant = document.pretPourSoumission === true;
  const enAnalyse = document.statut === "analyse_en_cours";
  // « Déposé » (statut hérité) : fichier reçu mais jamais analysé - on propose l'analyse.
  const aAnalyser = !analyseDisponible || enAnalyse || document.statut === "soumis";

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title={document.titre}
        description={`Version ${document.version}${document.nomFichier ? ` · ${document.nomFichier}` : ""}`}
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/etudiant/documents/${document.id}/redaction`}>
                <PenLine className="size-4" />
                Rédiger
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/etudiant/documents/${document.id}/versions`}>
                <History className="size-4" />
                Historique
              </Link>
            </Button>
            {document.urlFichier && (
              <Button variant="outline" size="sm" asChild>
                <a href={document.urlFichier} target="_blank" rel="noopener noreferrer">
                  Télécharger le fichier
                </a>
              </Button>
            )}
            {!aAnalyser && ["analyse_terminee", "en_correction"].includes(document.statut) && (
              <Button variant="outline" size="sm" onClick={relancerAnalyse} disabled={analyseEnCours}>
                {analyseEnCours ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />}
                Réanalyser
              </Button>
            )}
            <BadgeSourceIa source={document.sourceAnalyse} />
            <StatusBadge statut={document.statut} />
          </>
        }
      />

      {aAnalyser && (
        <Card className="mb-6">
          <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-accent">
              {document.statut === "analyse_en_cours" ? (
                <Loader2 className="size-7 animate-spin text-primary" />
              ) : (
                <FileSearch className="size-7 text-primary" />
              )}
            </div>
            <div>
              <p className="font-medium">
                {document.statut === "analyse_en_cours"
                  ? "Analyse automatique en cours…"
                  : "L'analyse automatique n'a pas encore démarré"}
              </p>
              <p className="text-sm text-muted-foreground">
                {document.statut === "analyse_en_cours"
                  ? "Cette page se met à jour automatiquement dès que le résultat est prêt."
                  : "Elle vérifie la forme et le fond de votre document."}
              </p>
            </div>
            <Button onClick={relancerAnalyse} disabled={analyseEnCours} variant="outline">
              {analyseEnCours && <Loader2 className="size-4 animate-spin" />}
              {document.statut === "analyse_en_cours"
                ? "Ça prend trop de temps ? Relancer"
                : "Lancer l'analyse"}
            </Button>
          </CardContent>
        </Card>
      )}

      {!aAnalyser && (
        <>
          <Card className="mb-6">
            <CardContent className="py-6">
              <DetailScores document={document} />
            </CardContent>
          </Card>

          {!scoreSuffisant && (document.pointsBloquants?.length ?? 0) > 0 && (
            <Card className="mb-6 border-warning/40 bg-warning/5">
              <CardContent className="space-y-2 pt-6">
                <p className="text-sm font-medium">
                  {document.pointsBloquants?.some((p) => p.startsWith("Score global"))
                    ? "Points à corriger avant de pouvoir soumettre votre document"
                    : "Votre document atteint le score global requis, mais certains points critiques doivent être corrigés avant la soumission."}
                </p>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {document.pointsBloquants?.map((point, i) => (
                    <li key={i}>• {point}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <Tabs defaultValue="forme" className="mb-6">
            <TabsList>
              {TYPES_ANALYSE.map((type) => (
                <TabsTrigger key={type} value={type}>
                  {ONGLET_LABELS[type]}
                </TabsTrigger>
              ))}
            </TabsList>
            {TYPES_ANALYSE.map((type) => {
              const analyse = analyses.find((a) => a.type === type);
              return (
                <TabsContent key={type} value={type}>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">
                        Analyse de {ONGLET_LABELS[type].toLowerCase()}
                      </CardTitle>
                      <CardDescription>
                        {analyse
                          ? `Réalisée le ${formatDateTime(analyse.dateAnalyse)}`
                          : "Non disponible"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {analyse?.points.map((point) => (
                        <PointAnalyseCarte key={point.id} point={point} />
                      ))}
                    </CardContent>
                  </Card>
                </TabsContent>
              );
            })}
          </Tabs>

          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-6 text-center sm:flex-row sm:justify-between sm:text-left">
              {["analyse_terminee", "en_correction"].includes(document.statut) && !scoreSuffisant && (
                <>
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="size-8 text-warning" />
                    <div>
                      <p className="font-medium">Document pas encore prêt pour la soumission</p>
                      <p className="text-sm text-muted-foreground">
                        Corrigez les points relevés (le tuteur IA peut vous les expliquer), puis
                        réimportez votre fichier pour une nouvelle analyse.
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => router.push(`/etudiant/documents/${document.id}/correction`)}
                  >
                    <MessageSquareText className="size-4" />
                    Corriger avec le tuteur IA
                  </Button>
                </>
              )}

              {["analyse_terminee", "en_correction"].includes(document.statut) && scoreSuffisant && (
                <>
                  <div className="flex items-center gap-3">
                    <Wand2 className="size-8 text-success" />
                    <div>
                      <p className="font-medium">Prêt pour la soumission</p>
                      <p className="text-sm text-muted-foreground">
                        Seuils atteints et aucun point bloquant : vous pouvez soumettre ce document
                        à votre encadreur, ou continuer à l&apos;améliorer.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => router.push(`/etudiant/documents/${document.id}/correction`)}
                    >
                      Continuer la correction
                    </Button>
                    <Button onClick={soumettreEncadreur}>Soumettre à l&apos;encadreur</Button>
                  </div>
                </>
              )}

              {["pret_pour_encadrant", "en_relecture"].includes(document.statut) && (
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="size-8 text-primary" />
                  <div>
                    <p className="font-medium">En attente de votre encadreur</p>
                    <p className="text-sm text-muted-foreground">
                      Votre document a été transmis et est en cours de relecture.
                    </p>
                  </div>
                </div>
              )}

              {document.statut === "valide" && (
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="size-8 text-success" />
                  <div>
                    <p className="font-medium">Mémoire validé</p>
                    <p className="text-sm text-muted-foreground">
                      Félicitations, votre encadreur a validé ce document.
                    </p>
                  </div>
                </div>
              )}

              {["rejete", "refuse"].includes(document.statut) && (
                <div className="flex items-center gap-3">
                  <AlertTriangle className="size-8 text-destructive" />
                  <div>
                    <p className="font-medium">Document à retravailler</p>
                    <p className="text-sm text-muted-foreground">
                      Votre encadreur a demandé une révision. Consultez ses retours puis soumettez
                      une nouvelle version.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
