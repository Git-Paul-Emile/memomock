"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CheckCircle2, Loader2, Send, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { useApiResource } from "@/hooks/use-api-resource";
import { PageHeader } from "@/components/shared/page-header";
import { ScoreJauge } from "@/components/shared/score-jauge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { apiGet, apiList, apiPatch, apiPost } from "@/lib/api";
import type { Analyse, DocumentSubmission, PublicUser } from "@/types";

interface DonneesConfirmation {
  document: DocumentSubmission;
  encadrant: PublicUser | null;
  pointsTraites: string[];
}

/**
 * Écran « Confirmation de soumission à l'encadrant » côté étudiant.
 *
 * Récapitulatif (document, score de conformité, points de forme déjà traités par l'IA), puis
 * transmission officielle : passage du statut à « prêt pour l'encadrant » + notification de
 * l'encadrant. Toutes les données proviennent de la base.
 */
export default function ConfirmationSoumissionPage() {
  const { id } = useParams<{ id: string }>();
  const [accepte, setAccepte] = React.useState(false);
  const [enCours, setEnCours] = React.useState(false);
  const [envoye, setEnvoye] = React.useState(false);

  const { data, isLoading } = useApiResource<DonneesConfirmation>(
    ["document-confirmation", id],
    async () => {
      const doc = await apiGet<DocumentSubmission>("documents", id);
      const [enc, analyses] = await Promise.all([
        apiGet<PublicUser>("users", doc.encadrantId).catch(() => null),
        apiList<Analyse>("analyses", { filtres: { documentId: id }, limite: 10 }),
      ]);
      // Points de forme déjà traités par l'IA = points « succès » de l'analyse de forme.
      const traites = analyses.data
        .flatMap((a) => a.points)
        .filter((p) => p.niveau === "succes")
        .map((p) => p.libelle);
      return { document: doc, encadrant: enc, pointsTraites: traites };
    }
  );

  const document = data?.document ?? null;
  const encadrant = data?.encadrant ?? null;
  const pointsTraites = data?.pointsTraites ?? [];

  const transmettre = async () => {
    if (!document) return;
    setEnCours(true);
    try {
      await apiPatch<DocumentSubmission>("documents", document.id, {
        statut: "pret_pour_encadrant",
        dateMaj: new Date().toISOString(),
      });
      await apiPost("notifications", {
        userId: document.encadrantId,
        titre: "Document prêt pour relecture",
        message: `« ${document.titre} » a été transmis pour relecture (score ${document.scoreConformite}/100).`,
        type: "validation",
        lu: false,
        date: new Date().toISOString(),
        lienDocumentId: document.id,
      });
      setEnvoye(true);
    } catch {
      toast.error("La transmission a échoué. Réessayez.");
    } finally {
      setEnCours(false);
    }
  };

  if (isLoading || !document) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (envoye) {
    return (
      <div className="mx-auto max-w-lg">
        <Card className="border-success/40 bg-success/5">
          <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
            <CheckCircle2 className="size-12 text-success" />
            <div>
              <p className="text-lg font-semibold">Document transmis à votre encadrant</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {encadrant ? `${encadrant.prenom} ${encadrant.nom}` : "Votre encadrant"} recevra une
                notification. Vous serez averti dès qu&apos;un retour sera disponible.
              </p>
            </div>
            <Button asChild>
              <Link href="/etudiant/dashboard">Retour au tableau de bord</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Transmettre à l'encadrant"
        description="Vérifiez le récapitulatif avant l'envoi officiel de votre mémoire."
      />

      <div className="space-y-6">
        <Card>
          <CardContent className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">{document.titre}</p>
              <p className="text-sm text-muted-foreground">
                Encadrant : {encadrant ? `${encadrant.prenom} ${encadrant.nom}` : "-"}
              </p>
              <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
                <span>
                  Forme <span className="font-medium text-foreground">{document.scoreForme}</span>
                </span>
                <span>
                  Fond <span className="font-medium text-foreground">{document.scoreFond}</span>
                </span>
              </div>
            </div>
            <ScoreJauge score={document.scoreConformite} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="size-4 text-success" />
              Points déjà traités par l&apos;IA
            </CardTitle>
            <CardDescription>
              Ces éléments de forme sont conformes : votre encadrant peut se concentrer sur le fond.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {pointsTraites.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucun point de forme validé pour l&apos;instant.
              </p>
            ) : (
              pointsTraites.map((point) => (
                <div key={point} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                  <span>{point}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 py-6">
            <div className="flex items-start gap-3">
              <Checkbox
                id="accepte"
                checked={accepte}
                onCheckedChange={(v) => setAccepte(v === true)}
                className="mt-0.5"
              />
              <Label
                htmlFor="accepte"
                className="text-sm font-normal leading-snug text-muted-foreground"
              >
                Je confirme que cette version est prête à être relue par mon encadrant et
                qu&apos;elle reflète mon travail personnel.
              </Label>
            </div>
            <Button className="w-full" disabled={!accepte || enCours} onClick={transmettre}>
              {enCours ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              Transmettre officiellement
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
