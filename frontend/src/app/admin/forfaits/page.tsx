"use client";

import * as React from "react";
import { CreditCard, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { useApiList } from "@/hooks/use-api-list";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { apiDelete, apiPost } from "@/lib/api";
import type { Forfait } from "@/types";

/** Catalogue des forfaits de la plateforme (spec section 96), géré par le super-admin. */
export default function ForfaitsAdminPage() {
  const {
    data: forfaits,
    isLoading,
    refetch,
  } = useApiList<Forfait>("forfaits", { tri: "ordre", limite: 50 });

  const [ouvert, setOuvert] = React.useState(false);
  const [nom, setNom] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [prixMensuel, setPrixMensuel] = React.useState(0);
  const [maxEtudiants, setMaxEtudiants] = React.useState("");
  const [maxEncadrants, setMaxEncadrants] = React.useState("");
  const [fonctionnalite, setFonctionnalite] = React.useState("");
  const [fonctionnalites, setFonctionnalites] = React.useState<string[]>([]);
  const [miseEnRelationPayante, setMiseEnRelationPayante] = React.useState(false);
  const [enCours, setEnCours] = React.useState(false);
  const [aSupprimer, setASupprimer] = React.useState<Forfait | null>(null);

  const reinitialiser = () => {
    setNom("");
    setDescription("");
    setPrixMensuel(0);
    setMaxEtudiants("");
    setMaxEncadrants("");
    setFonctionnalite("");
    setFonctionnalites([]);
    setMiseEnRelationPayante(false);
  };

  const ajouterFonctionnalite = () => {
    if (fonctionnalite.trim()) {
      setFonctionnalites((prev) => [...prev, fonctionnalite.trim()]);
      setFonctionnalite("");
    }
  };

  const creer = async () => {
    if (!nom.trim()) return;
    setEnCours(true);
    try {
      await apiPost<Forfait>("forfaits", {
        nom: nom.trim(),
        description: description.trim(),
        prixMensuel,
        maxEtudiants: maxEtudiants.trim() ? Number(maxEtudiants) : null,
        maxEncadrants: maxEncadrants.trim() ? Number(maxEncadrants) : null,
        fonctionnalites,
        miseEnRelationPayante,
        ordre: forfaits.length,
      });
      reinitialiser();
      setOuvert(false);
      refetch();
      toast.success("Forfait créé.");
    } catch {
      toast.error("La création a échoué.");
    } finally {
      setEnCours(false);
    }
  };

  const supprimer = async () => {
    if (!aSupprimer) return;
    try {
      await apiDelete("forfaits", aSupprimer.id);
      setASupprimer(null);
      refetch();
    } catch {
      toast.error("La suppression a échoué.");
    }
  };

  if (isLoading) return null;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Forfaits"
        description="Catalogue des offres proposées aux établissements (spec section 96)."
        actions={
          <Dialog
            open={ouvert}
            onOpenChange={(open) => {
              setOuvert(open);
              if (!open) reinitialiser();
            }}
          >
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="size-4" />
                Nouveau forfait
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nouveau forfait</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="forfait-nom">Nom</Label>
                  <Input id="forfait-nom" value={nom} onChange={(e) => setNom(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="forfait-description">Description</Label>
                  <Textarea
                    id="forfait-description"
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="forfait-prix">Prix mensuel (€)</Label>
                  <Input
                    id="forfait-prix"
                    type="number"
                    min={0}
                    value={prixMensuel}
                    onChange={(e) => setPrixMensuel(Number(e.target.value) || 0)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="forfait-max-etudiants">Étudiants max (vide = illimité)</Label>
                    <Input
                      id="forfait-max-etudiants"
                      type="number"
                      min={0}
                      value={maxEtudiants}
                      onChange={(e) => setMaxEtudiants(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="forfait-max-encadrants">Encadrants max (vide = illimité)</Label>
                    <Input
                      id="forfait-max-encadrants"
                      type="number"
                      min={0}
                      value={maxEncadrants}
                      onChange={(e) => setMaxEncadrants(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Fonctionnalités incluses</Label>
                  <div className="flex gap-2">
                    <Input
                      value={fonctionnalite}
                      onChange={(e) => setFonctionnalite(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          ajouterFonctionnalite();
                        }
                      }}
                      placeholder="Ex : Classes illimitées"
                    />
                    <Button type="button" variant="outline" onClick={ajouterFonctionnalite}>
                      <Plus className="size-4" />
                    </Button>
                  </div>
                  {fonctionnalites.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {fonctionnalites.map((f) => (
                        <Badge key={f} variant="secondary" className="gap-1 pl-2.5">
                          {f}
                          <button
                            type="button"
                            onClick={() =>
                              setFonctionnalites((prev) => prev.filter((x) => x !== f))
                            }
                            className="ml-0.5 rounded-full hover:text-destructive"
                          >
                            <X className="size-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">Mise en relation payante</p>
                    <p className="text-xs text-muted-foreground">
                      Spec section 97 - informatif, aucune facturation réelle.
                    </p>
                  </div>
                  <Switch checked={miseEnRelationPayante} onCheckedChange={setMiseEnRelationPayante} />
                </div>
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

      {forfaits.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="Aucun forfait"
          description="Créez votre première offre pour les établissements."
        />
      ) : (
        <div className="space-y-2">
          {forfaits.map((f) => (
            <Card key={f.id}>
              <CardContent className="flex items-start justify-between gap-3 py-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{f.nom}</p>
                    <Badge variant="outline">{f.prixMensuel} €/mois</Badge>
                    {f.miseEnRelationPayante && (
                      <Badge variant="secondary" className="text-[10px]">
                        Mise en relation payante
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{f.description}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {f.maxEtudiants ?? "Illimité"} étudiant(s) · {f.maxEncadrants ?? "Illimité"}{" "}
                    encadrant(s)
                  </p>
                  {f.fonctionnalites.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {f.fonctionnalites.map((fn) => (
                        <Badge key={fn} variant="outline" className="text-[10px]">
                          {fn}
                        </Badge>
                      ))}
                    </div>
                  )}
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
            <DialogTitle>Supprimer ce forfait ?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            « {aSupprimer?.nom} » sera retiré du catalogue. Les abonnements existants sur ce
            forfait ne sont pas supprimés.
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
