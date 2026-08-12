"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, Loader2, Send } from "lucide-react";
import { toast } from "sonner";

import { useApiResource } from "@/hooks/use-api-resource";
import { useSyncedState } from "@/hooks/use-synced-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { apiGet, apiPatch, apiPost } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { DocumentSubmission, PublicUser } from "@/types";

interface DonneesValidation {
  document: DocumentSubmission;
  etudiant: PublicUser | null;
}

/**
 * Écran « Validation finale » côté encadrant.
 *
 * Clôture le cycle : la note et l'appréciation de fond sont enregistrées sur le document, son
 * statut passe à « validé » (ou « rejeté » si révision demandée), et l'étudiant est notifié.
 * Toutes les écritures vont en base.
 */
export default function ValidationPage() {
  const { id } = useParams<{ id: string }>();
  const [decision, setDecision] = React.useState<"valider" | "reviser">("valider");
  const [enCours, setEnCours] = React.useState(false);
  const [envoye, setEnvoye] = React.useState(false);

  const { data, isLoading } = useApiResource<DonneesValidation>(
    ["document-validation", id],
    async () => {
      const doc = await apiGet<DocumentSubmission>("documents", id);
      const etu = await apiGet<PublicUser>("users", doc.etudiantId).catch(() => null);
      return { document: doc, etudiant: etu };
    }
  );

  const document = data?.document ?? null;
  const etudiant = data?.etudiant ?? null;

  // Note/commentaire pré-remplis à partir du document dès qu'il est chargé, puis modifiables
  // librement par l'encadrant (état local dupliqué, comme dans les autres écrans de saisie).
  const noteParDefaut = document?.note ? document.note.replace(/\s*\/.*/, "").trim() || "16" : "16";
  const commentaireParDefaut = document?.appreciation ?? "";
  const [note, setNote] = useSyncedState<string>(document ? noteParDefaut : undefined, "16");
  const [commentaire, setCommentaire] = useSyncedState<string>(
    document ? commentaireParDefaut : undefined,
    ""
  );

  const envoyer = async () => {
    if (!document) return;
    setEnCours(true);
    try {
      await apiPatch<DocumentSubmission>("documents", document.id, {
        statut: decision === "valider" ? "valide" : "rejete",
        note: decision === "valider" ? `${note} / 20` : null,
        appreciation: commentaire.trim() || null,
        dateMaj: new Date().toISOString(),
      });
      await apiPost("notifications", {
        userId: document.etudiantId,
        titre: decision === "valider" ? "Mémoire validé" : "Révision demandée",
        message:
          decision === "valider"
            ? `Félicitations, « ${document.titre} » a été validé (note ${note}/20).`
            : `Votre encadrant a demandé des corrections sur « ${document.titre} ».`,
        type: "validation",
        lu: false,
        date: new Date().toISOString(),
        lienDocumentId: document.id,
      });
      setEnvoye(true);
    } catch {
      toast.error("L'envoi du retour a échoué. Réessayez.");
    } finally {
      setEnCours(false);
    }
  };

  if (isLoading || !document) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  const nomEtudiant = etudiant ? `${etudiant.prenom} ${etudiant.nom}` : "l'étudiant";

  if (envoye) {
    return (
      <div className="mx-auto max-w-lg">
        <Card className="border-success/40 bg-success/5">
          <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
            <CheckCircle2 className="size-12 text-success" />
            <div>
              <p className="text-lg font-semibold">Retour envoyé à {nomEtudiant}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {decision === "valider"
                  ? "Le mémoire a été validé. L'étudiant a été notifié."
                  : "Une demande de révision a été transmise à l'étudiant."}
              </p>
            </div>
            <Button asChild>
              <Link href="/encadrant/dashboard">Retour au tableau de bord</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Validation finale"
        description={document.titre}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href={`/encadrant/documents/${id}/correction`}>
              <ArrowLeft className="size-4" />
              Retour à l&apos;éditeur
            </Link>
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Décision</CardTitle>
          <CardDescription>
            Clôturez cette itération et transmettez votre retour à {nomEtudiant}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setDecision("valider")}
              className={cn(
                "rounded-lg border p-4 text-left transition-colors",
                decision === "valider" ? "border-success bg-success/5" : "hover:bg-accent"
              )}
            >
              <p className="text-sm font-medium">Valider le mémoire</p>
              <p className="text-xs text-muted-foreground">Le travail répond aux attentes.</p>
            </button>
            <button
              type="button"
              onClick={() => setDecision("reviser")}
              className={cn(
                "rounded-lg border p-4 text-left transition-colors",
                decision === "reviser" ? "border-warning bg-warning/5" : "hover:bg-accent"
              )}
            >
              <p className="text-sm font-medium">Demander une révision</p>
              <p className="text-xs text-muted-foreground">Des points restent à retravailler.</p>
            </button>
          </div>

          {decision === "valider" && (
            <div className="space-y-1.5">
              <Label htmlFor="note">Note (sur 20)</Label>
              <Input
                id="note"
                type="number"
                min={0}
                max={20}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-28"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="commentaire">Commentaire de fond</Label>
            <Textarea
              id="commentaire"
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              rows={5}
              placeholder={
                decision === "valider"
                  ? "Ex : Excellent travail méthodologique. La partie critique gagnerait à être approfondie…"
                  : "Ex : Merci de revoir la partie 3 et d'étayer l'argumentation avant nouvelle soumission…"
              }
            />
          </div>

          <Button className="w-full" onClick={envoyer} disabled={enCours}>
            {enCours ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            Envoyer le retour à l&apos;étudiant
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
