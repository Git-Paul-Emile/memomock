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
  Wand2,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { ScoreJauge } from "@/components/shared/score-jauge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { apiGet, apiList, apiPatch, apiPost } from "@/lib/api";
import { NIVEAU_ALERTE_VARIANT, SEUIL_SCORE_CONFORMITE } from "@/lib/constants";
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
  // l'analyse démarre désormais automatiquement côté backend dès la soumission du document (job
  // publié sur une file BullMQ, ou exécuté immédiatement si Redis n'est pas disponible - voir
  // backend/src/lib/queue.js). Cet écran se contente donc de RECHARGER périodiquement, via le
  // polling natif de TanStack Query, tant que le document est "analyse_en_cours" sans résultat
  // encore visible, plutôt que de générer lui-même les analyses (ancien comportement simulé côté
  // client) ou de gérer un setInterval manuel.
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
      if (etat && etat.document.statut === "analyse_en_cours" && etat.analyses.length === 0)
        return 3000;
      return false;
    },
  });

  const document = data?.document ?? null;
  const analyses = data?.analyses ?? [];

  // Filet de sécurité si le traitement automatique a échoué ou est resté bloqué (voir
  // POST /api/documents/:id/relancer-analyse côté backend).
  const relancerAnalyse = async () => {
    if (!document) return;
    setAnalyseEnCours(true);
    try {
      await apiPost(`documents/${document.id}/relancer-analyse`, {});
      toast.success("Analyse relancée.");
      await refetch();
    } catch {
      toast.error("Impossible de relancer l'analyse pour le moment.");
    } finally {
      setAnalyseEnCours(false);
    }
  };

  const transmettreEncadrant = async () => {
    if (!document) return;
    await apiPatch("documents", document.id, {
      statut: "pret_pour_encadrant",
      dateMaj: new Date().toISOString(),
    });
    await apiPost("notifications", {
      userId: document.encadrantId,
      titre: "Document prêt pour relecture",
      message: `« ${document.titre} » a atteint le score de conformité requis.`,
      type: "validation",
      lu: false,
      date: new Date().toISOString(),
      lienDocumentId: document.id,
    });
    toast.success("Document transmis à votre encadrant.");
    await refetch();
  };

  if (isLoading || !document) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const analyseDisponible = analyses.length > 0;
  // Calculé côté backend (voir utils/conformite.js) : tient compte du seuil de soumission et du
  // seuil minimal par catégorie configurés sur le profil méthodologique du document.
  const scoreSuffisant =
    document.pretPourSoumission ?? document.scoreConformite >= SEUIL_SCORE_CONFORMITE;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title={document.titre}
        description={`Version ${document.version} · ${document.nomFichier}`}
        actions={
          <>
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
            <StatusBadge statut={document.statut} />
          </>
        }
      />

      {!analyseDisponible && (
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

      {analyseDisponible && (
        <>
          <Card className="mb-6">
            <CardContent className="flex flex-col items-center gap-4 py-6 sm:flex-row sm:justify-around">
              <ScoreJauge score={document.scoreConformite} taille={110} />
              <div className="grid flex-1 grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-lg font-semibold">{document.scoreForme}</p>
                  <p className="text-xs text-muted-foreground">Forme</p>
                </div>
                <div>
                  <p className="text-lg font-semibold">{document.scoreFond}</p>
                  <p className="text-xs text-muted-foreground">Fond</p>
                </div>
              </div>
            </CardContent>
          </Card>

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
                        <div
                          key={point.id}
                          className="flex items-start gap-3 rounded-lg border p-3"
                        >
                          <Badge
                            variant={NIVEAU_ALERTE_VARIANT[point.niveau]}
                            className="mt-0.5 shrink-0"
                          >
                            {point.niveau === "erreur"
                              ? "À corriger"
                              : point.niveau === "attention"
                                ? "À vérifier"
                                : point.niveau === "succes"
                                  ? "Conforme"
                                  : "Info"}
                          </Badge>
                          <div>
                            <p className="text-sm font-medium">{point.libelle}</p>
                            <p className="text-sm text-muted-foreground">{point.detail}</p>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </TabsContent>
              );
            })}
          </Tabs>

          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-6 text-center sm:flex-row sm:justify-between sm:text-left">
              {document.statut === "analyse_terminee" && !scoreSuffisant && (
                <>
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="size-8 text-warning" />
                    <div>
                      <p className="font-medium">Score encore insuffisant</p>
                      <p className="text-sm text-muted-foreground">
                        Démarrez une session de correction interactive avec le tuteur IA pour
                        progresser.
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => router.push(`/etudiant/documents/${document.id}/correction`)}
                  >
                    <MessageSquareText className="size-4" />
                    Démarrer la correction
                  </Button>
                </>
              )}

              {document.statut === "analyse_terminee" && scoreSuffisant && (
                <>
                  <div className="flex items-center gap-3">
                    <Wand2 className="size-8 text-success" />
                    <div>
                      <p className="font-medium">Score de conformité atteint</p>
                      <p className="text-sm text-muted-foreground">
                        Vous pouvez transmettre ce document à votre encadrant, ou continuer à
                        l&apos;améliorer.
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
                    <Button onClick={transmettreEncadrant}>Transmettre à l&apos;encadrant</Button>
                  </div>
                </>
              )}

              {document.statut === "en_correction" && (
                <>
                  <div className="flex items-center gap-3">
                    <MessageSquareText className="size-8 text-primary" />
                    <div>
                      <p className="font-medium">Correction interactive en cours</p>
                      <p className="text-sm text-muted-foreground">
                        Reprenez votre échange avec le tuteur IA.
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => router.push(`/etudiant/documents/${document.id}/correction`)}
                  >
                    Continuer la correction
                  </Button>
                </>
              )}

              {["pret_pour_encadrant", "en_relecture"].includes(document.statut) && (
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="size-8 text-primary" />
                  <div>
                    <p className="font-medium">En attente de votre encadrant</p>
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
                      Félicitations, votre encadrant a validé ce document.
                    </p>
                  </div>
                </div>
              )}

              {document.statut === "rejete" && (
                <div className="flex items-center gap-3">
                  <AlertTriangle className="size-8 text-destructive" />
                  <div>
                    <p className="font-medium">Document à retravailler</p>
                    <p className="text-sm text-muted-foreground">
                      Votre encadrant a demandé des corrections importantes. Soumettez une nouvelle
                      version.
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
