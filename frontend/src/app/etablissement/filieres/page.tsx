"use client";

import * as React from "react";
import { GitBranch, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/context/auth-context";
import { useApiList } from "@/hooks/use-api-list";
import { useApiResource } from "@/hooks/use-api-resource";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { apiDelete, apiList, apiPost } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type { Etablissement, Filiere } from "@/types";

/** Gestion des filières d'un établissement (spec section 7). */
export default function FilieresPage() {
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
    data: filieres,
    isLoading,
    refetch,
  } = useApiList<Filiere>("filieres", {
    filtres: { etablissementId: etablissement?.id },
    limite: 100,
    tri: "nom",
  });

  const [ouvert, setOuvert] = React.useState(false);
  const [nom, setNom] = React.useState("");
  const [enCours, setEnCours] = React.useState(false);
  const [aSupprimer, setASupprimer] = React.useState<Filiere | null>(null);

  const creer = async () => {
    if (!nom.trim() || !etablissement) return;
    setEnCours(true);
    try {
      await apiPost<Filiere>("filieres", {
        etablissementId: etablissement.id,
        nom: nom.trim(),
        createdAt: new Date().toISOString(),
      });
      setNom("");
      setOuvert(false);
      refetch();
      toast.success("Filière créée.");
    } catch {
      toast.error("La création a échoué.");
    } finally {
      setEnCours(false);
    }
  };

  const supprimer = async () => {
    if (!aSupprimer) return;
    try {
      await apiDelete("filieres", aSupprimer.id);
      setASupprimer(null);
      refetch();
    } catch {
      toast.error("La suppression a échoué.");
    }
  };

  if (chargementEtab || isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Filières"
        description="Ex : Informatique, Management, Finance, Comptabilité, Réseaux…"
        actions={
          <Dialog open={ouvert} onOpenChange={setOuvert}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="size-4" />
                Nouvelle filière
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nouvelle filière</DialogTitle>
              </DialogHeader>
              <div className="space-y-1.5">
                <Label htmlFor="filiere-nom">Nom</Label>
                <Input
                  id="filiere-nom"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  placeholder="Ex : Informatique"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOuvert(false)}>
                  Annuler
                </Button>
                <Button onClick={creer} disabled={!nom.trim() || enCours}>
                  Créer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {filieres.length === 0 ? (
        <EmptyState
          icon={GitBranch}
          title="Aucune filière"
          description="Créez votre première filière pour pouvoir y rattacher des classes."
        />
      ) : (
        <div className="space-y-2">
          {filieres.map((f) => (
            <Card key={f.id}>
              <CardContent className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium">{f.nom}</p>
                  <p className="text-xs text-muted-foreground">Créée le {formatDate(f.createdAt)}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setASupprimer(f)}>
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!aSupprimer} onOpenChange={(open) => !open && setASupprimer(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer cette filière ?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            « {aSupprimer?.nom} » sera retirée. Les classes déjà associées ne sont pas supprimées.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setASupprimer(null)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={supprimer}>
              Oui, supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
