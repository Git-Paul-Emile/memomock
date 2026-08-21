"use client";

import * as React from "react";
import { CheckCircle2, CreditCard } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/context/auth-context";
import { useApiList } from "@/hooks/use-api-list";
import { useApiResource } from "@/hooks/use-api-resource";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { apiList, apiPatch, apiPost } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Abonnement, Etablissement, Forfait, PublicUser } from "@/types";

export default function AbonnementEtablissementPage() {
  const { user } = useAuth();

  const { data: etablissement, isLoading: chargementEtab } = useApiResource<Etablissement | null>(
    ["mon-etablissement", user?.id],
    async () => {
      const res = await apiList<Etablissement>("etablissements", {
        filtres: { adminId: user!.id },
        limite: 1,
      });
      return res.data[0] ?? null;
    },
    { enabled: !!user }
  );

  const {
    data: abonnement,
    isLoading: chargementAbonnement,
    refetch: refetchAbonnement,
  } = useApiResource<Abonnement | null>(
    ["mon-abonnement", etablissement?.id],
    async () => {
      const res = await apiList<Abonnement>("abonnements", {
        filtres: { etablissementId: etablissement!.id },
        limite: 1,
      });
      return res.data[0] ?? null;
    },
    { enabled: !!etablissement }
  );

  const { data: forfaits, isLoading: chargementForfaits } = useApiList<Forfait>("forfaits", {
    tri: "ordre",
    limite: 50,
  });

  const { data: etudiants } = useApiList<PublicUser>("users", {
    filtres: { etablissementId: etablissement?.id, role: "etudiant" },
    limite: 500,
  });

  const forfaitActuel = forfaits.find((f) => f.id === abonnement?.forfaitId) ?? null;

  const changerForfait = async (forfait: Forfait) => {
    if (!etablissement) return;
    const maintenant = new Date().toISOString();
    try {
      if (abonnement) {
        await apiPatch<Abonnement>("abonnements", abonnement.id, {
          forfaitId: forfait.id,
          statut: "actif",
          dateDebut: maintenant,
        });
      } else {
        await apiPost<Abonnement>("abonnements", {
          etablissementId: etablissement.id,
          forfaitId: forfait.id,
          statut: "actif",
          dateDebut: maintenant,
          dateRenouvellement: null,
        });
      }
      toast.success(`Forfait « ${forfait.nom} » activé (démonstration, aucun paiement réel).`);
      refetchAbonnement();
    } catch {
      toast.error("Le changement de forfait a échoué.");
    }
  };

  if (chargementEtab || chargementAbonnement || chargementForfaits) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!etablissement) {
    return (
      <EmptyState
        icon={CreditCard}
        title="Établissement introuvable"
        description="Votre compte n'est rattaché à aucun établissement pour l'instant."
      />
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Abonnement"
        description="Forfait de votre établissement (démonstration : aucun encaissement réel)."
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Mon forfait actuel</CardTitle>
        </CardHeader>
        <CardContent>
          {!forfaitActuel ? (
            <p className="text-sm text-muted-foreground">
              Aucun forfait actif - choisissez une offre ci-dessous.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-semibold">{forfaitActuel.nom}</p>
                  <p className="text-sm text-muted-foreground">
                    {forfaitActuel.prixMensuel} €/mois
                  </p>
                </div>
                <Badge variant={abonnement?.statut === "actif" ? "success" : "secondary"}>
                  {abonnement?.statut === "actif" ? "Actif" : abonnement?.statut}
                </Badge>
              </div>
              <div className="space-y-2">
                <div>
                  <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                    <span>Étudiants</span>
                    <span>
                      {etudiants.length} / {forfaitActuel.maxEtudiants ?? "∞"}
                    </span>
                  </div>
                  {forfaitActuel.maxEtudiants != null && (
                    <Progress
                      value={Math.min(100, (etudiants.length / forfaitActuel.maxEtudiants) * 100)}
                      className="h-1.5"
                    />
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <h2 className="mb-3 text-sm font-medium text-muted-foreground">Offres disponibles</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        {forfaits.map((f) => {
          const actif = f.id === forfaitActuel?.id;
          return (
            <Card key={f.id} className={cn(actif && "border-primary")}>
              <CardHeader>
                <CardTitle className="text-base">{f.nom}</CardTitle>
                <CardDescription>{f.prixMensuel} €/mois</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">{f.description}</p>
                <ul className="space-y-1 text-xs">
                  {f.fonctionnalites.map((fn) => (
                    <li key={fn} className="flex items-start gap-1.5">
                      <CheckCircle2 className="mt-0.5 size-3 shrink-0 text-primary" />
                      {fn}
                    </li>
                  ))}
                </ul>
                <Button
                  size="sm"
                  variant={actif ? "outline" : "default"}
                  className="w-full"
                  disabled={actif}
                  onClick={() => changerForfait(f)}
                >
                  {actif ? "Forfait actuel" : "Changer pour ce forfait"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
