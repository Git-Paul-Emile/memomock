"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CheckCircle2, MessageSquarePlus, Sparkles, Undo2 } from "lucide-react";
import { toast } from "sonner";

import { useApiResource } from "@/hooks/use-api-resource";
import { useSyncedState } from "@/hooks/use-synced-state";
import { PageHeader } from "@/components/shared/page-header";
import {
  EditeurCorrection,
  type EditeurCorrectionHandle,
} from "@/components/documents/editeur-correction";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { apiDelete, apiGet, apiList, apiPost } from "@/lib/api";
import { calculerSegments, texteCourantDuParagraphe } from "@/lib/revision-diff";
import type { CommentaireMarge, DocumentSubmission, RegleApprise, RevisionSegment } from "@/types";

/**
 * Écran « Éditeur de correction » côté encadrant.
 *
 * L'encadrant modifie directement le texte dans un éditeur riche (TipTap, voir
 * components/documents/editeur-correction.tsx) - conforme au mémo de cadrage. À
 * l'enregistrement, le texte de chaque paragraphe est comparé à sa version précédente
 * (lib/revision-diff.ts) pour recalculer les segments de révision (barré/souligné), qui restent
 * la source de vérité affichée ici et sur l'écran de retour de l'étudiant.
 */

interface DonneesCorrection {
  document: DocumentSubmission;
  segments: RevisionSegment[];
  commentaires: CommentaireMarge[];
  regles: RegleApprise[];
}

export default function CorrectionEncadrantPage() {
  const { id } = useParams<{ id: string }>();
  const [nouveauCommentaire, setNouveauCommentaire] = React.useState("");
  const [envoiCommentaire, setEnvoiCommentaire] = React.useState(false);

  const [enregistrementEnCours, setEnregistrementEnCours] = React.useState(false);
  const [cleEditeur, setCleEditeur] = React.useState(0);
  const editeurRef = React.useRef<EditeurCorrectionHandle>(null);

  const { data, isLoading, refetch } = useApiResource<DonneesCorrection>(
    ["document-correction-encadrant", id],
    async () => {
      const doc = await apiGet<DocumentSubmission>("documents", id);
      const [rev, com, reg] = await Promise.all([
        apiList<RevisionSegment>("revisions", { filtres: { documentId: id }, limite: 500 }),
        apiList<CommentaireMarge>("commentaires-marge", {
          filtres: { documentId: id },
          limite: 100,
        }),
        apiList<RegleApprise>("regles-apprises", {
          filtres: { encadrantId: doc.encadrantId },
          tri: "confiance",
          ordre: "desc",
          limite: 5,
        }),
      ]);
      return {
        document: doc,
        segments: rev.data,
        commentaires: com.data.sort((a, b) => a.numero - b.numero),
        regles: reg.data,
      };
    }
  );

  const document = data?.document ?? null;
  const regles = data?.regles ?? [];

  // Les commentaires sont dupliqués en état local pour permettre l'ajout optimiste immédiat
  // (voir `ajouterCommentaire`) sans attendre un refetch réseau ; ils restent synchronisés
  // avec la donnée serveur à chaque nouveau chargement.
  const [commentaires, setCommentaires] = useSyncedState<CommentaireMarge[]>(
    data?.commentaires,
    []
  );

  const paragraphes = React.useMemo(() => {
    const segments = data?.segments ?? [];
    const parNumero = new Map<number, RevisionSegment[]>();
    for (const seg of segments) {
      const liste = parNumero.get(seg.paragraphe) ?? [];
      liste.push(seg);
      parNumero.set(seg.paragraphe, liste);
    }
    return [...parNumero.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([, liste]) => liste.sort((a, b) => a.ordre - b.ordre));
  }, [data?.segments]);

  const paragraphesTexte = React.useMemo(
    () => paragraphes.map(texteCourantDuParagraphe),
    [paragraphes]
  );

  const enregistrerModifications = async () => {
    if (!document || !editeurRef.current) return;
    setEnregistrementEnCours(true);
    try {
      const nouveauxParagraphes = editeurRef.current.paragraphes();
      const nombreParagraphes = Math.max(nouveauxParagraphes.length, paragraphesTexte.length);

      const nouveauxSegments = [];
      for (let i = 0; i < nombreParagraphes; i += 1) {
        nouveauxSegments.push(
          ...calculerSegments(i, paragraphesTexte[i] ?? "", nouveauxParagraphes[i] ?? "")
        );
      }

      // Pas d'endpoint de remplacement en masse : on retire les anciens segments puis on
      // recrée les nouveaux, comme le fait déjà l'ajout de commentaire ci-dessus.
      const anciensSegments = data?.segments ?? [];
      await Promise.all(anciensSegments.map((s) => apiDelete("revisions", s.id)));
      await Promise.all(
        nouveauxSegments.map((segment) =>
          apiPost<RevisionSegment>("revisions", { documentId: document.id, ...segment })
        )
      );

      toast.success("Modifications enregistrées.");
      refetch();
    } catch {
      toast.error("Les modifications n'ont pas pu être enregistrées.");
    } finally {
      setEnregistrementEnCours(false);
    }
  };

  const annulerModifications = () => {
    setCleEditeur((cle) => cle + 1);
  };

  const ajouterCommentaire = async () => {
    const texte = nouveauCommentaire.trim();
    if (!texte || !document) return;
    setEnvoiCommentaire(true);
    try {
      const cree = await apiPost<CommentaireMarge>("commentaires-marge", {
        documentId: document.id,
        numero: commentaires.length + 1,
        texte,
        date: new Date().toISOString(),
      });
      setCommentaires((prev) => [...prev, cree]);
      setNouveauCommentaire("");
    } catch {
      toast.error("Le commentaire n'a pas pu être enregistré.");
    } finally {
      setEnvoiCommentaire(false);
    }
  };

  if (isLoading || !document) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Éditeur de correction"
        description={document.titre}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={annulerModifications}>
              <Undo2 className="size-4" />
              Annuler
            </Button>
            <Button size="sm" onClick={enregistrerModifications} disabled={enregistrementEnCours}>
              {enregistrementEnCours ? "Enregistrement…" : "Enregistrer les modifications"}
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link href={`/encadrant/documents/${id}/validation`}>Passer à la validation</Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Texte de l&apos;étudiant</CardTitle>
            <CardDescription>
              Modifiez le texte directement ; vos changements seront suivis (barré / souligné) et
              visibles par l&apos;étudiant une fois enregistrés.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 leading-relaxed">
            <EditeurCorrection
              key={cleEditeur}
              ref={editeurRef}
              paragraphesInitiaux={paragraphesTexte}
            />

            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <MessageSquarePlus className="size-3.5" />
                Ajouter un commentaire en marge
              </p>
              <div className="flex gap-2">
                <Input
                  value={nouveauCommentaire}
                  onChange={(e) => setNouveauCommentaire(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      ajouterCommentaire();
                    }
                  }}
                  placeholder="Ex : Ajouter une source ici…"
                  className="h-9"
                />
                <Button
                  size="sm"
                  onClick={ajouterCommentaire}
                  disabled={envoiCommentaire || !nouveauCommentaire.trim()}
                >
                  Ajouter
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Commentaires ({commentaires.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {commentaires.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucun commentaire pour l&apos;instant.
                </p>
              ) : (
                commentaires.map((c) => (
                  <div key={c.id} className="flex items-start gap-2 rounded-lg border p-2.5">
                    <Badge variant="warning" className="mt-0.5 shrink-0">
                      {c.numero}
                    </Badge>
                    <p className="text-sm text-muted-foreground">{c.texte}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="border-primary/30 bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Sparkles className="size-4 text-primary" />
                Capture de l&apos;écart
              </CardTitle>
              <CardDescription>
                Règles déduites de vos corrections, proposées à votre jumeau numérique.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {regles.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucune règle apprise pour le moment.
                </p>
              ) : (
                regles.map((r) => (
                  <div key={r.id} className="space-y-1.5">
                    <p className="text-xs leading-snug">{r.regle}</p>
                    <div className="flex items-center gap-2">
                      <Progress value={r.confiance} className="h-1.5 flex-1" />
                      <span className="text-[11px] text-muted-foreground">{r.confiance}%</span>
                    </div>
                  </div>
                ))
              )}
              <Button variant="outline" size="sm" className="w-full" asChild>
                <Link href="/encadrant/jumeau-numerique">
                  <CheckCircle2 className="size-4" />
                  Gérer les règles apprises
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
