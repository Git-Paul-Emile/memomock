"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { CheckCircle2, History, MessageSquareWarning, User, XCircle } from "lucide-react";
import { toast } from "sonner";

import { useApiResource } from "@/hooks/use-api-resource";
import { PanneauChapitres } from "@/components/canevas/panneau-chapitres";
import { PageHeader } from "@/components/shared/page-header";
import { ScoreJauge } from "@/components/shared/score-jauge";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { apiGet, apiList, apiPatch, apiPost } from "@/lib/api";
import { resoudreChapitres, type ChapitreAffiche } from "@/lib/canevas";
import { NIVEAU_ALERTE_VARIANT } from "@/lib/constants";
import { formatDateTime, getInitials } from "@/lib/utils";
import type {
  Analyse,
  ChapitreCanevas,
  CritereChapitre,
  DocumentSubmission,
  MessageCorrection,
  ProfilEncadrant,
  PublicUser,
  TypeAnalyse,
  ValidationChapitre,
} from "@/types";

const ONGLET_LABELS: Record<TypeAnalyse, string> = {
  forme: "Forme",
  fond: "Fond",
  coherence: "Cohérence",
  structure: "Structure",
};
const TYPES_ANALYSE: TypeAnalyse[] = ["structure", "forme", "fond", "coherence"];

interface DonneesRelecture {
  document: DocumentSubmission;
  etudiant: PublicUser;
  analyses: Analyse[];
  messages: MessageCorrection[];
  chapitres: ChapitreAffiche[];
}

export default function RelectureDocumentPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [commentaire, setCommentaire] = React.useState("");
  const [commentaireRefus, setCommentaireRefus] = React.useState("");
  const [dialogRevisionOuvert, setDialogRevisionOuvert] = React.useState(false);
  const [dialogRefusOuvert, setDialogRefusOuvert] = React.useState(false);

  const { data, isLoading, refetch } = useApiResource<DonneesRelecture>(
    ["document-relecture", id],
    async () => {
      const doc = await apiGet<DocumentSubmission>("documents", id);
      const [etu, listeAnalyses, listeMessages, profil, validations] = await Promise.all([
        apiGet<PublicUser>("users", doc.etudiantId),
        apiList<Analyse>("analyses", { filtres: { documentId: id }, limite: 10 }),
        apiList<MessageCorrection>("messages", {
          filtres: { documentId: id },
          limite: 100,
          tri: "date",
          ordre: "asc",
        }),
        doc.profilEncadrantId
          ? apiGet<ProfilEncadrant>("profils-encadrant", doc.profilEncadrantId).catch(() => null)
          : Promise.resolve(null),
        apiList<ValidationChapitre>("validations-chapitre", {
          filtres: { documentId: id },
          limite: 100,
        }),
      ]);

      let chapitres: ChapitreAffiche[] = [];
      if (profil?.canevasId) {
        const [chapitresRes, criteresRes] = await Promise.all([
          apiList<ChapitreCanevas>("chapitres-canevas", {
            filtres: { canevasId: profil.canevasId },
            limite: 100,
          }),
          apiList<CritereChapitre>("criteres-chapitre", { limite: 500 }),
        ]);
        chapitres = resoudreChapitres(chapitresRes.data, criteresRes.data, validations.data);
      }

      if (doc.statut === "pret_pour_encadrant") {
        await apiPatch("documents", id, {
          statut: "en_relecture",
          dateMaj: new Date().toISOString(),
        });
      }

      return {
        document: doc,
        etudiant: etu,
        analyses: listeAnalyses.data,
        messages: listeMessages.data,
        chapitres,
      };
    }
  );

  const document = data?.document ?? null;
  const etudiant = data?.etudiant ?? null;
  const analyses = data?.analyses ?? [];
  const messages = data?.messages ?? [];
  const chapitres = data?.chapitres ?? [];

  const validerChapitre = async (item: ChapitreAffiche) => {
    if (!document) return;
    const maintenant = new Date().toISOString();
    try {
      if (item.validation) {
        await apiPatch<ValidationChapitre>("validations-chapitre", item.validation.id, {
          statut: "valide",
          verrouille: true,
          commentaire: null,
          dateDecision: maintenant,
          updatedAt: maintenant,
        });
      } else {
        await apiPost<ValidationChapitre>("validations-chapitre", {
          documentId: document.id,
          chapitreId: item.chapitreId,
          statut: "valide",
          verrouille: true,
          commentaire: null,
          dateDecision: maintenant,
          createdAt: maintenant,
          updatedAt: maintenant,
        });
      }
      await apiPost("notifications", {
        userId: document.etudiantId,
        titre: "Chapitre validé",
        message: `« ${item.titre} » a été validé par votre encadrant.`,
        type: "validation",
        lu: false,
        date: maintenant,
        lienDocumentId: document.id,
      });
      toast.success(`Chapitre « ${item.titre} » validé.`);
      refetch();
    } catch {
      toast.error("La validation du chapitre a échoué.");
    }
  };

  const refuserChapitre = async (item: ChapitreAffiche, commentaireRefus: string) => {
    if (!document) return;
    const maintenant = new Date().toISOString();
    try {
      if (item.validation) {
        await apiPatch<ValidationChapitre>("validations-chapitre", item.validation.id, {
          statut: "refuse",
          verrouille: false,
          commentaire: commentaireRefus,
          dateDecision: maintenant,
          updatedAt: maintenant,
        });
      } else {
        await apiPost<ValidationChapitre>("validations-chapitre", {
          documentId: document.id,
          chapitreId: item.chapitreId,
          statut: "refuse",
          verrouille: false,
          commentaire: commentaireRefus,
          dateDecision: maintenant,
          createdAt: maintenant,
          updatedAt: maintenant,
        });
      }
      await apiPost("notifications", {
        userId: document.etudiantId,
        titre: "Chapitre à revoir",
        message: `« ${item.titre} » nécessite une correction : ${commentaireRefus}`,
        type: "validation",
        lu: false,
        date: maintenant,
        lienDocumentId: document.id,
      });
      toast.success(`Chapitre « ${item.titre} » refusé.`);
      refetch();
    } catch {
      toast.error("Le refus du chapitre a échoué.");
    }
  };

  const deverrouillerChapitre = async (item: ChapitreAffiche) => {
    if (!item.validation) return;
    try {
      await apiPatch<ValidationChapitre>("validations-chapitre", item.validation.id, {
        statut: "en_attente",
        verrouille: false,
        commentaire: null,
        updatedAt: new Date().toISOString(),
      });
      toast.success(`Chapitre « ${item.titre} » déverrouillé.`);
      refetch();
    } catch {
      toast.error("Le déverrouillage a échoué.");
    }
  };

  const valider = async () => {
    if (!document) return;
    await apiPatch("documents", document.id, {
      statut: "valide",
      dateMaj: new Date().toISOString(),
    });
    await apiPost("notifications", {
      userId: document.etudiantId,
      titre: "Mémoire validé",
      message: `Félicitations, « ${document.titre} » a été validé par votre encadrant.`,
      type: "validation",
      lu: false,
      date: new Date().toISOString(),
      lienDocumentId: document.id,
    });
    toast.success("Document validé.");
    router.push("/encadrant/dashboard");
  };

  const demanderRevision = async () => {
    if (!document) return;
    if (commentaire.trim()) {
      await apiPost("messages", {
        documentId: document.id,
        auteur: "encadrant",
        contenu: commentaire.trim(),
        date: new Date().toISOString(),
      });
    }
    await apiPatch("documents", document.id, {
      statut: "rejete",
      dateMaj: new Date().toISOString(),
    });
    await apiPost("notifications", {
      userId: document.etudiantId,
      titre: "Révision demandée",
      message: `Votre encadrant a demandé des corrections sur « ${document.titre} ».`,
      type: "validation",
      lu: false,
      date: new Date().toISOString(),
      lienDocumentId: document.id,
    });
    toast.success("Demande de révision envoyée à l'étudiant.");
    setDialogRevisionOuvert(false);
    router.push("/encadrant/dashboard");
  };

  /**
   * Décision distincte de « Demander une révision » (spec section 28) : reprise jugée trop
   * importante par l'encadrant, statut `refuse` plutôt que `rejete`.
   */
  const refuser = async () => {
    if (!document) return;
    if (commentaireRefus.trim()) {
      await apiPost("messages", {
        documentId: document.id,
        auteur: "encadrant",
        contenu: commentaireRefus.trim(),
        date: new Date().toISOString(),
      });
    }
    await apiPatch("documents", document.id, {
      statut: "refuse",
      dateMaj: new Date().toISOString(),
    });
    await apiPost("notifications", {
      userId: document.etudiantId,
      titre: "Document refusé",
      message: `Votre encadrant a refusé « ${document.titre} » - une reprise importante est nécessaire.`,
      type: "validation",
      lu: false,
      date: new Date().toISOString(),
      lienDocumentId: document.id,
    });
    toast.success("Document refusé, l'étudiant a été notifié.");
    setDialogRefusOuvert(false);
    router.push("/encadrant/dashboard");
  };

  if (isLoading || !document || !etudiant) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const dejaTraite = ["valide", "rejete", "refuse"].includes(document.statut);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title={document.titre}
        description={`Version ${document.version} · ${document.nomFichier}`}
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/encadrant/documents/${document.id}/versions`}>
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

      <Card>
        <CardContent className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-muted text-sm font-medium">
              {getInitials(etudiant.nom, etudiant.prenom)}
            </div>
            <div>
              <p className="font-medium">
                {etudiant.prenom} {etudiant.nom}
              </p>
              <p className="text-sm text-muted-foreground">{etudiant.filiere ?? etudiant.email}</p>
            </div>
          </div>
          <ScoreJauge score={document.scoreConformite} taille={80} />
        </CardContent>
      </Card>

      <Tabs defaultValue="fond">
        <TabsList>
          {TYPES_ANALYSE.map((type) => (
            <TabsTrigger key={type} value={type}>
              {ONGLET_LABELS[type]}
            </TabsTrigger>
          ))}
          <TabsTrigger value="echanges">Échanges ({messages.length})</TabsTrigger>
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
                  <CardDescription>Score IA : {analyse?.score ?? "-"} / 100</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {analyse?.points.map((point) => (
                    <div key={point.id} className="flex items-start gap-3 rounded-lg border p-3">
                      <Badge
                        variant={NIVEAU_ALERTE_VARIANT[point.niveau]}
                        className="mt-0.5 shrink-0"
                      >
                        {point.niveau}
                      </Badge>
                      <div>
                        <p className="text-sm font-medium">{point.libelle}</p>
                        <p className="text-sm text-muted-foreground">{point.detail}</p>
                      </div>
                    </div>
                  )) ?? <p className="text-sm text-muted-foreground">Aucune analyse disponible.</p>}
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}

        <TabsContent value="echanges">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Historique de correction interactive</CardTitle>
              <CardDescription>Échanges entre l&apos;étudiant et le tuteur IA.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {messages.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Aucun échange de correction pour ce document.
                </p>
              )}
              {messages.map((m) => (
                <div key={m.id} className="flex items-start gap-3 rounded-lg border p-3">
                  <User className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      {m.auteur === "etudiant"
                        ? etudiant.prenom
                        : m.auteur === "ia"
                          ? "Tuteur IA"
                          : "Vous"}{" "}
                      · {formatDateTime(m.date)}
                    </p>
                    <p className="text-sm">{m.contenu}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {chapitres.length > 0 && (
        <PanneauChapitres
          items={chapitres}
          role="encadrant"
          onValider={validerChapitre}
          onRefuser={refuserChapitre}
          onDeverrouiller={deverrouillerChapitre}
        />
      )}

      {!dejaTraite ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Décision</CardTitle>
            <CardDescription>
              Validez le mémoire ou renvoyez-le à l&apos;étudiant pour révision.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 sm:flex-row">
            <Button className="flex-1" onClick={valider}>
              <CheckCircle2 className="size-4" />
              Valider le mémoire
            </Button>
            <Dialog open={dialogRevisionOuvert} onOpenChange={setDialogRevisionOuvert}>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex-1">
                  <MessageSquareWarning className="size-4" />
                  Demander une révision
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Demander une révision</DialogTitle>
                  <DialogDescription>
                    Ce commentaire sera visible par l&apos;étudiant dans l&apos;historique de
                    correction.
                  </DialogDescription>
                </DialogHeader>
                <Textarea
                  value={commentaire}
                  onChange={(e) => setCommentaire(e.target.value)}
                  placeholder="Ex : Merci de revoir la partie méthodologie avant nouvelle soumission…"
                  rows={4}
                />
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogRevisionOuvert(false)}>
                    Annuler
                  </Button>
                  <Button variant="destructive" onClick={demanderRevision}>
                    Envoyer la demande
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog open={dialogRefusOuvert} onOpenChange={setDialogRefusOuvert}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="flex-1 text-destructive hover:text-destructive"
                >
                  <XCircle className="size-4" />
                  Refuser
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Refuser le document</DialogTitle>
                  <DialogDescription>
                    À utiliser quand une simple révision ne suffit pas : le document nécessite une
                    reprise importante. L&apos;étudiant en sera notifié.
                  </DialogDescription>
                </DialogHeader>
                <Textarea
                  value={commentaireRefus}
                  onChange={(e) => setCommentaireRefus(e.target.value)}
                  placeholder="Expliquez pourquoi le document est refusé…"
                  rows={4}
                />
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogRefusOuvert(false)}>
                    Annuler
                  </Button>
                  <Button variant="destructive" onClick={refuser}>
                    Confirmer le refus
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex items-center gap-3 py-6">
            {document.statut === "valide" ? (
              <CheckCircle2 className="size-6 text-success" />
            ) : document.statut === "refuse" ? (
              <XCircle className="size-6 text-destructive" />
            ) : (
              <MessageSquareWarning className="size-6 text-destructive" />
            )}
            <p className="text-sm text-muted-foreground">
              {document.statut === "valide"
                ? "Ce document a déjà été validé."
                : document.statut === "refuse"
                  ? "Ce document a été refusé - une reprise importante a été demandée."
                  : "Une révision a déjà été demandée pour ce document."}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
