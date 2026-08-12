"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, MessageSquare, Star } from "lucide-react";

import { useApiResource } from "@/hooks/use-api-resource";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { apiGet, apiList } from "@/lib/api";
import type { CommentaireMarge, DocumentSubmission, PublicUser, RevisionSegment } from "@/types";

interface DonneesRetour {
  document: DocumentSubmission;
  encadrant: PublicUser | null;
  segments: RevisionSegment[];
  commentaires: CommentaireMarge[];
}

/**
 * Écran « Retour de l'encadrant » côté étudiant.
 *
 * Affiche les modifications directes de l'encadrant (texte barré = supprimé, souligné = ajouté),
 * les commentaires en marge et la note / l'appréciation de fond - le tout chargé depuis la base
 * (document, segments de révision, commentaires en marge).
 */
function SegmentTexte({ segment }: { segment: RevisionSegment }) {
  if (segment.type === "supprime") {
    return (
      <span className="text-destructive line-through decoration-destructive/60">
        {segment.texte}
      </span>
    );
  }
  if (segment.type === "ajoute") {
    return (
      <span className="text-primary underline decoration-primary/50 underline-offset-2">
        {segment.texte}
      </span>
    );
  }
  return <span>{segment.texte}</span>;
}

export default function RetourEncadrantPage() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading } = useApiResource<DonneesRetour>(
    ["document-retour-etudiant", id],
    async () => {
      const doc = await apiGet<DocumentSubmission>("documents", id);
      const [enc, rev, com] = await Promise.all([
        apiGet<PublicUser>("users", doc.encadrantId).catch(() => null),
        apiList<RevisionSegment>("revisions", { filtres: { documentId: id }, limite: 500 }),
        apiList<CommentaireMarge>("commentaires-marge", {
          filtres: { documentId: id },
          limite: 100,
        }),
      ]);
      return {
        document: doc,
        encadrant: enc,
        segments: rev.data,
        commentaires: com.data.sort((a, b) => a.numero - b.numero),
      };
    }
  );

  const document = data?.document ?? null;
  const encadrant = data?.encadrant ?? null;
  const commentaires = data?.commentaires ?? [];

  // Regroupe les segments par paragraphe (triés par ordre) pour reconstituer le texte corrigé.
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

  if (isLoading || !document) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const nomEncadrant = encadrant ? `${encadrant.prenom} ${encadrant.nom}` : "votre encadrant";

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Retour de votre encadrant"
        description={document.titre}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/etudiant/dashboard">
              <ArrowLeft className="size-4" />
              Tableau de bord
            </Link>
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-4 rounded-sm bg-destructive/20" />
          <span className="text-muted-foreground">Texte supprimé</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-4 rounded-sm bg-primary/20" />
          <span className="text-muted-foreground">Texte ajouté</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-4 rounded-sm bg-warning/30" />
          <span className="text-muted-foreground">Commentaire en marge</span>
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Document corrigé</CardTitle>
            <CardDescription>Suivi des modifications de {nomEncadrant}.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 leading-relaxed">
            {paragraphes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucune modification directe n&apos;a encore été apportée à ce document.
              </p>
            ) : (
              paragraphes.map((paragraphe, i) => (
                <p key={i} className="text-sm">
                  {paragraphe.map((segment) => (
                    <SegmentTexte key={segment.id} segment={segment} />
                  ))}
                </p>
              ))
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {(document.note || document.appreciation) && (
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Star className="size-4 text-primary" />
                  Note attribuée
                </CardTitle>
              </CardHeader>
              <CardContent>
                {document.note && <p className="text-2xl font-semibold">{document.note}</p>}
                {document.appreciation && (
                  <p className="mt-1 text-xs text-muted-foreground">{document.appreciation}</p>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <MessageSquare className="size-4 text-muted-foreground" />
                Commentaires en marge
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {commentaires.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun commentaire en marge.</p>
              ) : (
                commentaires.map((c, index) => (
                  <div key={c.id}>
                    <div className="flex items-start gap-2">
                      <Badge variant="warning" className="mt-0.5 shrink-0">
                        {c.numero}
                      </Badge>
                      <p className="text-sm text-muted-foreground">{c.texte}</p>
                    </div>
                    {index !== commentaires.length - 1 && <Separator className="mt-3" />}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Button className="w-full" asChild>
            <Link href={`/etudiant/documents/${id}/correction`}>Retravailler mon document</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
