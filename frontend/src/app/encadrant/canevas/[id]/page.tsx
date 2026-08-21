"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useApiList } from "@/hooks/use-api-list";
import { useApiResource } from "@/hooks/use-api-resource";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { apiDelete, apiGet, apiPost } from "@/lib/api";
import type { Canevas, ChapitreCanevas, CritereChapitre } from "@/types";

export default function CanevasDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: canevas, isLoading: chargementCanevas } = useApiResource<Canevas>(
    ["canevas-detail", id],
    () => apiGet<Canevas>("canevas", id)
  );

  const {
    data: chapitres,
    isLoading: chargementChapitres,
    refetch: refetchChapitres,
  } = useApiList<ChapitreCanevas>("chapitres-canevas", {
    filtres: { canevasId: id },
    limite: 100,
  });

  const {
    data: criteres,
    refetch: refetchCriteres,
  } = useApiList<CritereChapitre>("criteres-chapitre", { limite: 500 });

  const chapitresTries = [...chapitres].sort((a, b) => a.ordre - b.ordre);

  if (chargementCanevas || chargementChapitres || !canevas) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={canevas.nom} description="Chapitres attendus et critères associés." />

      <div className="space-y-4">
        {chapitresTries.length === 0 ? (
          <EmptyState
            icon={Plus}
            title="Aucun chapitre"
            description="Ajoutez le premier chapitre attendu (ex : Introduction)."
          />
        ) : (
          chapitresTries.map((chapitre) => (
            <ChapitreCard
              key={chapitre.id}
              chapitre={chapitre}
              criteres={criteres
                .filter((c) => c.chapitreId === chapitre.id)
                .sort((a, b) => a.ordre - b.ordre)}
              onChapitreSupprime={refetchChapitres}
              onCriteresChanges={refetchCriteres}
            />
          ))
        )}

        <NouveauChapitre
          canevasId={canevas.id}
          ordreSuivant={chapitres.length}
          onCree={refetchChapitres}
        />
      </div>
    </div>
  );
}

function ChapitreCard({
  chapitre,
  criteres,
  onChapitreSupprime,
  onCriteresChanges,
}: {
  chapitre: ChapitreCanevas;
  criteres: CritereChapitre[];
  onChapitreSupprime: () => void;
  onCriteresChanges: () => void;
}) {
  const [libelleCritere, setLibelleCritere] = React.useState("");
  const [ajoutEnCours, setAjoutEnCours] = React.useState(false);

  const supprimerChapitre = async () => {
    try {
      await Promise.all(criteres.map((c) => apiDelete("criteres-chapitre", c.id)));
      await apiDelete("chapitres-canevas", chapitre.id);
      onChapitreSupprime();
    } catch {
      toast.error("La suppression a échoué.");
    }
  };

  const ajouterCritere = async () => {
    if (!libelleCritere.trim()) return;
    setAjoutEnCours(true);
    try {
      await apiPost<CritereChapitre>("criteres-chapitre", {
        chapitreId: chapitre.id,
        libelle: libelleCritere.trim(),
        obligatoire: true,
        ordre: criteres.length,
      });
      setLibelleCritere("");
      onCriteresChanges();
    } catch {
      toast.error("L'ajout du critère a échoué.");
    } finally {
      setAjoutEnCours(false);
    }
  };

  const supprimerCritere = async (critereId: string) => {
    await apiDelete("criteres-chapitre", critereId);
    onCriteresChanges();
  };

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">{chapitre.titre}</CardTitle>
            {chapitre.obligatoire && (
              <Badge variant="outline" className="text-[10px]">
                Obligatoire
              </Badge>
            )}
          </div>
          {chapitre.description && (
            <p className="mt-1 text-sm text-muted-foreground">{chapitre.description}</p>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={supprimerChapitre}>
          <Trash2 className="size-4 text-destructive" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {criteres.map((c) => (
          <div key={c.id} className="flex items-center justify-between rounded-md border px-3 py-1.5">
            <span className="text-sm">
              {c.libelle}
              {!c.obligatoire && <span className="text-muted-foreground"> (optionnel)</span>}
            </span>
            <Button variant="ghost" size="icon" onClick={() => supprimerCritere(c.id)}>
              <Trash2 className="size-3.5 text-destructive" />
            </Button>
          </div>
        ))}
        <div className="flex gap-2">
          <Input
            value={libelleCritere}
            onChange={(e) => setLibelleCritere(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                ajouterCritere();
              }
            }}
            placeholder="Ajouter un critère (ex : Problématique clairement énoncée)"
          />
          <Button variant="outline" onClick={ajouterCritere} disabled={ajoutEnCours}>
            <Plus className="size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function NouveauChapitre({
  canevasId,
  ordreSuivant,
  onCree,
}: {
  canevasId: string;
  ordreSuivant: number;
  onCree: () => void;
}) {
  const [ouvert, setOuvert] = React.useState(false);
  const [titre, setTitre] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [obligatoire, setObligatoire] = React.useState(true);
  const [enCours, setEnCours] = React.useState(false);

  const creer = async () => {
    if (!titre.trim()) return;
    setEnCours(true);
    try {
      await apiPost<ChapitreCanevas>("chapitres-canevas", {
        canevasId,
        titre: titre.trim(),
        description: description.trim() || null,
        obligatoire,
        ordre: ordreSuivant,
      });
      setTitre("");
      setDescription("");
      setObligatoire(true);
      setOuvert(false);
      onCree();
    } catch {
      toast.error("L'ajout du chapitre a échoué.");
    } finally {
      setEnCours(false);
    }
  };

  return (
    <Dialog open={ouvert} onOpenChange={setOuvert}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <Plus className="size-4" />
          Ajouter un chapitre
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouveau chapitre</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="chapitre-titre">Titre</Label>
            <Input
              id="chapitre-titre"
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              placeholder="Ex : Méthodologie"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="chapitre-description">Description (facultatif)</Label>
            <Textarea
              id="chapitre-description"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Obligatoire</p>
              <p className="text-xs text-muted-foreground">
                Un chapitre absent est signalé comme non conforme.
              </p>
            </div>
            <Switch checked={obligatoire} onCheckedChange={setObligatoire} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOuvert(false)}>
            Annuler
          </Button>
          <Button onClick={creer} disabled={!titre.trim() || enCours}>
            Ajouter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
