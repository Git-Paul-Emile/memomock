"use client";

import * as React from "react";
import Link from "next/link";
import { FolderKanban, History, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/context/auth-context";
import { useApiList } from "@/hooks/use-api-list";
import { useSyncedState } from "@/hooks/use-synced-state";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { apiPatch } from "@/lib/api";
import { lienDocumentEtudiant } from "@/lib/document-routing";
import { formatDate } from "@/lib/utils";
import { LIBELLES_TYPE_DOCUMENT } from "@/types";
import type { DocumentSubmission } from "@/types";

interface ChampsProjet {
  sujet: string;
  problematique: string;
  objectifs: string;
  dateSoutenancePrevue: string;
}

const CHAMPS_VIDES: ChampsProjet = {
  sujet: "",
  problematique: "",
  objectifs: "",
  dateSoutenancePrevue: "",
};

/**
 * Écran « Mon projet » (spec D2) : vue de synthèse du mémoire en cours - sujet, problématique,
 * objectifs et date de soutenance, portés directement par `Document` (voir schema.prisma : pas
 * de modèle "Projet" séparé, simplification assumée). Un étudiant ayant plusieurs documents
 * (brouillons successifs, ex-projets) choisit celui à afficher/éditer via le sélecteur.
 */
export default function MonProjetPage() {
  const { user } = useAuth();
  const [documentSelectionneId, setDocumentSelectionneId] = React.useState<string | null>(null);
  const [enregistrement, setEnregistrement] = React.useState(false);

  const {
    data: documents,
    isLoading,
    refetch,
  } = useApiList<DocumentSubmission>("documents", {
    tri: "dateMaj",
    ordre: "desc",
    limite: 50,
    filtres: { etudiantId: user?.id },
  });

  const document = documents.find((d) => d.id === documentSelectionneId) ?? documents[0] ?? null;

  const champsSource = React.useMemo<ChampsProjet | undefined>(
    () =>
      document
        ? {
            sujet: document.sujet ?? "",
            problematique: document.problematique ?? "",
            objectifs: document.objectifs ?? "",
            dateSoutenancePrevue: document.dateSoutenancePrevue?.slice(0, 10) ?? "",
          }
        : undefined,
    [document]
  );
  const [champs, setChamps] = useSyncedState<ChampsProjet>(champsSource, CHAMPS_VIDES);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!document) {
    return (
      <EmptyState
        icon={FolderKanban}
        title="Aucun projet pour l'instant"
        description="Créez votre premier document pour renseigner sujet, problématique et objectifs."
        action={
          <Button size="sm" asChild>
            <Link href="/etudiant/documents/nouveau">Créer un document</Link>
          </Button>
        }
      />
    );
  }

  const enregistrer = async () => {
    setEnregistrement(true);
    try {
      await apiPatch<DocumentSubmission>("documents", document.id, {
        sujet: champs.sujet || null,
        problematique: champs.problematique || null,
        objectifs: champs.objectifs || null,
        dateSoutenancePrevue: champs.dateSoutenancePrevue || null,
      });
      toast.success("Projet mis à jour.");
      refetch();
    } catch {
      toast.error("La mise à jour a échoué.");
    } finally {
      setEnregistrement(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Mon projet"
        description="Sujet, problématique et objectifs de votre mémoire."
      />

      {documents.length > 1 && (
        <div className="mb-4 space-y-1.5">
          <Label>Document concerné</Label>
          <Select value={document.id} onValueChange={setDocumentSelectionneId}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {documents.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.titre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <Card className="mb-4">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">{document.titre}</CardTitle>
              <CardDescription>
                {document.typeDocument ? LIBELLES_TYPE_DOCUMENT[document.typeDocument] : "-"}
                {document.discipline ? ` · ${document.discipline}` : ""}
              </CardDescription>
            </div>
            <StatusBadge statut={document.statut} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="sujet">Sujet</Label>
            <Input
              id="sujet"
              value={champs.sujet}
              onChange={(e) => setChamps((c) => ({ ...c, sujet: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="problematique">Problématique</Label>
            <Textarea
              id="problematique"
              rows={3}
              value={champs.problematique}
              onChange={(e) => setChamps((c) => ({ ...c, problematique: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="objectifs">Objectifs</Label>
            <Textarea
              id="objectifs"
              rows={3}
              value={champs.objectifs}
              onChange={(e) => setChamps((c) => ({ ...c, objectifs: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="soutenance">Date de soutenance prévue</Label>
            <Input
              id="soutenance"
              type="date"
              value={champs.dateSoutenancePrevue}
              onChange={(e) => setChamps((c) => ({ ...c, dateSoutenancePrevue: e.target.value }))}
              className="w-full sm:w-56"
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <p className="text-xs text-muted-foreground">
              Dernière mise à jour du document : {formatDate(document.dateMaj)}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/etudiant/documents/${document.id}/versions`}>
                  <History className="size-4" />
                  Historique des versions
                </Link>
              </Button>
              <Button size="sm" onClick={enregistrer} disabled={enregistrement}>
                {enregistrement ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                Enregistrer
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button variant="ghost" size="sm" asChild>
          <Link href={lienDocumentEtudiant(document)}>Ouvrir ce document →</Link>
        </Button>
      </div>
    </div>
  );
}
