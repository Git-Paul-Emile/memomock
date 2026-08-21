"use client";

import * as React from "react";
import Link from "next/link";
import { Copy, Library, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/context/auth-context";
import { useApiList } from "@/hooks/use-api-list";
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
import type { Canevas, ChapitreCanevas, CritereChapitre } from "@/types";

/** Liste des canevas de l'encadrant (spec sections 14, 16). */
export default function CanevasListePage() {
  const { user } = useAuth();
  const {
    data: canevasListe,
    isLoading,
    refetch,
  } = useApiList<Canevas>("canevas", { filtres: { encadrantId: user?.id }, limite: 100 });

  const [ouvert, setOuvert] = React.useState(false);
  const [nom, setNom] = React.useState("");
  const [enCours, setEnCours] = React.useState(false);
  const [aSupprimer, setASupprimer] = React.useState<Canevas | null>(null);
  const [duplicationEnCours, setDuplicationEnCours] = React.useState<string | null>(null);

  const creer = async () => {
    if (!nom.trim() || !user) return;
    setEnCours(true);
    try {
      const maintenant = new Date().toISOString();
      await apiPost<Canevas>("canevas", {
        encadrantId: user.id,
        nom: nom.trim(),
        description: null,
        createdAt: maintenant,
        updatedAt: maintenant,
      });
      setNom("");
      setOuvert(false);
      refetch();
      toast.success("Canevas créé.");
    } catch {
      toast.error("La création a échoué.");
    } finally {
      setEnCours(false);
    }
  };

  // Clone profond (spec section 16) : nouveau canevas + copie de tous ses chapitres/critères
  // avec de nouveaux ids, pour permettre de réutiliser un modèle d'une année sur l'autre.
  const dupliquer = async (source: Canevas) => {
    setDuplicationEnCours(source.id);
    try {
      const maintenant = new Date().toISOString();
      const [chapitresRes, critereRes] = await Promise.all([
        apiList<ChapitreCanevas>("chapitres-canevas", {
          filtres: { canevasId: source.id },
          limite: 100,
        }),
        apiList<CritereChapitre>("criteres-chapitre", { limite: 500 }),
      ]);

      const copie = await apiPost<Canevas>("canevas", {
        encadrantId: source.encadrantId,
        nom: `${source.nom} (copie)`,
        description: source.description ?? null,
        createdAt: maintenant,
        updatedAt: maintenant,
      });

      for (const chapitre of chapitresRes.data) {
        const nouveauChapitre = await apiPost<ChapitreCanevas>("chapitres-canevas", {
          canevasId: copie.id,
          titre: chapitre.titre,
          description: chapitre.description ?? null,
          obligatoire: chapitre.obligatoire,
          ordre: chapitre.ordre,
        });
        const criteresChapitre = critereRes.data.filter((c) => c.chapitreId === chapitre.id);
        for (const critere of criteresChapitre) {
          await apiPost<CritereChapitre>("criteres-chapitre", {
            chapitreId: nouveauChapitre.id,
            libelle: critere.libelle,
            obligatoire: critere.obligatoire,
            ordre: critere.ordre,
          });
        }
      }

      refetch();
      toast.success(`« ${copie.nom} » créé.`);
    } catch {
      toast.error("La duplication a échoué.");
    } finally {
      setDuplicationEnCours(null);
    }
  };

  const supprimer = async () => {
    if (!aSupprimer) return;
    try {
      await apiDelete("canevas", aSupprimer.id);
      setASupprimer(null);
      refetch();
    } catch {
      toast.error("La suppression a échoué.");
    }
  };

  if (isLoading) {
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
        title="Canevas"
        description="Structure attendue d'un mémoire : chapitres, critères obligatoires ou optionnels."
        actions={
          <Dialog open={ouvert} onOpenChange={setOuvert}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="size-4" />
                Nouveau canevas
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nouveau canevas</DialogTitle>
              </DialogHeader>
              <div className="space-y-1.5">
                <Label htmlFor="canevas-nom">Nom</Label>
                <Input
                  id="canevas-nom"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  placeholder="Ex : Canevas Master Informatique 2026"
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

      {canevasListe.length === 0 ? (
        <EmptyState
          icon={Library}
          title="Aucun canevas"
          description="Créez votre premier canevas puis associez-le à un profil pédagogique."
        />
      ) : (
        <div className="space-y-2">
          {canevasListe.map((c) => (
            <Card key={c.id}>
              <CardContent className="flex items-center justify-between py-3">
                <Link href={`/encadrant/canevas/${c.id}`} className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{c.nom}</p>
                  {c.description && (
                    <p className="truncate text-xs text-muted-foreground">{c.description}</p>
                  )}
                </Link>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Dupliquer « ${c.nom} »`}
                    onClick={() => dupliquer(c)}
                    disabled={duplicationEnCours === c.id}
                  >
                    <Copy className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Supprimer « ${c.nom} »`}
                    onClick={() => setASupprimer(c)}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!aSupprimer} onOpenChange={(open) => !open && setASupprimer(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer ce canevas ?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            « {aSupprimer?.nom} » sera retiré. Les profils qui y étaient associés perdront cette
            association.
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
