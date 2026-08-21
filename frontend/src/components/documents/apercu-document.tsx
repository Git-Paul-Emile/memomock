"use client";

import { FileText } from "lucide-react";

import { useApiResource } from "@/hooks/use-api-resource";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiList } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import type { VersionDocument } from "@/types";

/**
 * Prévisualisation en lecture seule d'un document (spec section 40) : rend le texte extrait de la
 * dernière version capturée (`VersionDocument.texteExtrait`), pas de conversion de fichier réelle
 * (aucun moteur de rendu PDF/DOCX dans ce projet - voir etudiant/documents/[id]/export/page.tsx).
 */
export function ApercuDocument({ documentId }: { documentId: string }) {
  const { data: derniereVersion, isLoading } = useApiResource<VersionDocument | null>(
    ["apercu-document", documentId],
    async () => {
      const res = await apiList<VersionDocument>("versions", {
        filtres: { documentId },
        tri: "numero",
        ordre: "desc",
        limite: 1,
      });
      return res.data[0] ?? null;
    }
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!derniereVersion?.texteExtrait) {
    return (
      <EmptyState
        icon={FileText}
        title="Aucun aperçu disponible"
        description="Le texte de ce document n'a pas encore été extrait."
      />
    );
  }

  const paragraphes = derniereVersion.texteExtrait.split("\n").filter((p) => p.trim().length > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Aperçu du document</CardTitle>
        <CardDescription>
          Version {derniereVersion.numero} · capturée le {formatDateTime(derniereVersion.createdAt)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 leading-relaxed">
        {paragraphes.map((p, i) => (
          <p key={i} className="text-sm">
            {p}
          </p>
        ))}
      </CardContent>
    </Card>
  );
}
