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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { apiList, apiPatch, apiPost } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  LIBELLES_MOYEN_PAIEMENT,
  PAYS_PAR_DEFAUT,
  estMobileMoney,
  formaterMontant,
  trouverPays,
} from "@/lib/afrique";
import type { Abonnement, Etablissement, Forfait, MoyenPaiement, PublicUser } from "@/types";

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

  // Paiement SIMULÉ : aucun encaissement réel, aucune donnée de paiement transmise. Le choix du
  // moyen de paiement reflète ceux disponibles dans le pays de l'établissement (lib/afrique.ts).
  const pays = trouverPays(etablissement?.pays) ?? trouverPays(PAYS_PAR_DEFAUT)!;
  const devise = etablissement?.devise ?? pays.devise;
  const [forfaitChoisi, setForfaitChoisi] = React.useState<Forfait | null>(null);
  const [moyen, setMoyen] = React.useState<MoyenPaiement>(pays.paiements[0]);
  const [numeroPaiement, setNumeroPaiement] = React.useState("");

  const activerForfait = async (forfait: Forfait, moyenPaiement: MoyenPaiement | null) => {
    if (!etablissement) return;
    const maintenant = new Date();
    const renouvellement = new Date(maintenant);
    renouvellement.setMonth(renouvellement.getMonth() + 1);
    const champs = {
      forfaitId: forfait.id,
      statut: "actif" as const,
      dateDebut: maintenant.toISOString(),
      dateRenouvellement: forfait.prixMensuel > 0 ? renouvellement.toISOString() : null,
      moyenPaiement,
      referencePaiement: moyenPaiement ? `DEMO-${moyenPaiement.toUpperCase()}-${maintenant.getTime().toString(36).toUpperCase()}` : null,
    };
    try {
      if (abonnement) {
        await apiPatch<Abonnement>("abonnements", abonnement.id, champs);
      } else {
        await apiPost<Abonnement>("abonnements", { etablissementId: etablissement.id, ...champs });
      }
      toast.success(`Forfait « ${forfait.nom} » activé (paiement simulé, aucun encaissement réel).`);
      setForfaitChoisi(null);
      refetchAbonnement();
    } catch {
      toast.error("Le changement de forfait a échoué.");
    }
  };

  const changerForfait = (forfait: Forfait) => {
    if (forfait.prixMensuel === 0) {
      void activerForfait(forfait, null);
      return;
    }
    setMoyen(pays.paiements[0]);
    setNumeroPaiement("");
    setForfaitChoisi(forfait);
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
                    {formaterMontant(forfaitActuel.prixMensuel, forfaitActuel.devise ?? devise)} / mois
                    {abonnement?.moyenPaiement &&
                      ` · ${LIBELLES_MOYEN_PAIEMENT[abonnement.moyenPaiement]}`}
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
      <div className="grid gap-4 sm:grid-cols-2">
        {forfaits.map((f) => {
          const actif = f.id === forfaitActuel?.id;
          return (
            <Card key={f.id} className={cn(actif && "border-primary")}>
              <CardHeader>
                <CardTitle className="text-base">{f.nom}</CardTitle>
                <CardDescription>
                  {f.prixMensuel === 0 ? "Gratuit" : `${formaterMontant(f.prixMensuel, f.devise ?? devise)} / mois`}
                </CardDescription>
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

      <Dialog open={!!forfaitChoisi} onOpenChange={(ouvert) => !ouvert && setForfaitChoisi(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Paiement - {forfaitChoisi?.nom}</DialogTitle>
            <DialogDescription>
              {forfaitChoisi && formaterMontant(forfaitChoisi.prixMensuel, forfaitChoisi.devise ?? devise)}{" "}
              par mois. Moyens de paiement disponibles en {pays.nom}. Démonstration : aucun montant
              n&apos;est prélevé.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2" role="radiogroup" aria-label="Moyen de paiement">
            {pays.paiements.map((m) => (
              <label
                key={m}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm",
                  moyen === m && "border-primary bg-primary/5"
                )}
              >
                <input
                  type="radio"
                  name="moyen-paiement"
                  value={m}
                  checked={moyen === m}
                  onChange={() => setMoyen(m)}
                />
                {LIBELLES_MOYEN_PAIEMENT[m]}
              </label>
            ))}
          </div>
          {estMobileMoney(moyen) && (
            <div className="space-y-1.5">
              <Label htmlFor="numero-paiement">Numéro du compte {LIBELLES_MOYEN_PAIEMENT[moyen]}</Label>
              <Input
                id="numero-paiement"
                inputMode="tel"
                placeholder={`${pays.indicatif} ${pays.exempleNumero}`}
                value={numeroPaiement}
                onChange={(e) => setNumeroPaiement(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                En production, une demande de confirmation serait envoyée sur ce numéro.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForfaitChoisi(null)}>
              Annuler
            </Button>
            <Button
              onClick={() => forfaitChoisi && activerForfait(forfaitChoisi, moyen)}
              disabled={estMobileMoney(moyen) && numeroPaiement.replace(/\D/g, "").length < 8}
            >
              Confirmer le paiement simulé
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
