"use client";

import * as React from "react";
import { FileText, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/utils";
import type { ElementReference } from "@/types";

export function ListeReferences({
  titre,
  description,
  elements,
  onAjouter,
  onSupprimer,
}: {
  titre: string;
  description: string;
  elements: ElementReference[];
  onAjouter: (item: { titre: string; description: string }) => Promise<void>;
  onSupprimer: (id: string) => Promise<void>;
}) {
  const [ouvert, setOuvert] = React.useState(false);
  const [titreChamp, setTitreChamp] = React.useState("");
  const [descriptionChamp, setDescriptionChamp] = React.useState("");
  const [enCours, setEnCours] = React.useState(false);
  const [elementASupprimer, setElementASupprimer] = React.useState<ElementReference | null>(null);
  const [suppressionEnCours, setSuppressionEnCours] = React.useState(false);

  const soumettre = async () => {
    if (!titreChamp.trim()) return;
    setEnCours(true);
    try {
      await onAjouter({ titre: titreChamp.trim(), description: descriptionChamp.trim() });
      setTitreChamp("");
      setDescriptionChamp("");
      setOuvert(false);
    } finally {
      setEnCours(false);
    }
  };

  const confirmerSuppression = async () => {
    if (!elementASupprimer) return;
    setSuppressionEnCours(true);
    try {
      await onSupprimer(elementASupprimer.id);
      setElementASupprimer(null);
    } finally {
      setSuppressionEnCours(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between">
        <div>
          <CardTitle className="text-base">{titre}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <Dialog open={ouvert} onOpenChange={setOuvert}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="size-4" />
              Ajouter
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajouter - {titre}</DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="ref-titre">Titre</Label>
                <Input
                  id="ref-titre"
                  value={titreChamp}
                  onChange={(e) => setTitreChamp(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ref-description">Description</Label>
                <Textarea
                  id="ref-description"
                  value={descriptionChamp}
                  onChange={(e) => setDescriptionChamp(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOuvert(false)}>
                Annuler
              </Button>
              <Button onClick={soumettre} disabled={enCours || !titreChamp.trim()}>
                Ajouter
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-2">
        {elements.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Aucun élément"
            description="Ajoutez votre premier élément de référence."
          />
        ) : (
          elements.map((el) => (
            <div
              key={el.id}
              className="flex items-start justify-between gap-3 rounded-lg border p-3"
            >
              <div>
                <p className="text-sm font-medium">{el.titre}</p>
                {el.description && (
                  <p className="text-sm text-muted-foreground">{el.description}</p>
                )}
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Ajouté le {formatDate(el.ajouteLe)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Supprimer « ${el.titre} »`}
                onClick={() => setElementASupprimer(el)}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          ))
        )}
      </CardContent>

      <Dialog
        open={!!elementASupprimer}
        onOpenChange={(open) => !open && setElementASupprimer(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer cet élément ?</DialogTitle>
            <DialogDescription>
              {elementASupprimer && (
                <>
                  « {elementASupprimer.titre} » sera définitivement retiré de cette liste de
                  référence.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setElementASupprimer(null)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={confirmerSuppression}
              disabled={suppressionEnCours}
            >
              Oui, supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
