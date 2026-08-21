"use client";

import * as React from "react";
import { Link2, Package, Plus, Trash2, Upload } from "lucide-react";

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
  DialogTrigger,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { LivrableDefinition, TypeLivrable } from "@/types";

const LIBELLES_TYPE_LIVRABLE: Record<TypeLivrable, string> = {
  fichier: "Fichier à déposer",
  lien: "Lien externe (dépôt Git, démo...)",
};

export function ListeLivrablesAttendus({
  elements,
  onAjouter,
  onSupprimer,
}: {
  elements: LivrableDefinition[];
  onAjouter: (item: {
    nom: string;
    description: string;
    type: TypeLivrable;
    obligatoire: boolean;
  }) => Promise<void>;
  onSupprimer: (id: string) => Promise<void>;
}) {
  const [ouvert, setOuvert] = React.useState(false);
  const [nom, setNom] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [type, setType] = React.useState<TypeLivrable>("fichier");
  const [obligatoire, setObligatoire] = React.useState(true);
  const [enCours, setEnCours] = React.useState(false);
  const [elementASupprimer, setElementASupprimer] = React.useState<LivrableDefinition | null>(
    null
  );
  const [suppressionEnCours, setSuppressionEnCours] = React.useState(false);

  const reinitialiser = () => {
    setNom("");
    setDescription("");
    setType("fichier");
    setObligatoire(true);
  };

  const soumettre = async () => {
    if (!nom.trim()) return;
    setEnCours(true);
    try {
      await onAjouter({ nom: nom.trim(), description: description.trim(), type, obligatoire });
      reinitialiser();
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
          <CardTitle className="text-base">Livrables attendus</CardTitle>
          <CardDescription>
            Éléments que vos étudiants doivent produire en plus du mémoire (cahier des charges,
            maquette, code source, démo...).
          </CardDescription>
        </div>
        <Dialog
          open={ouvert}
          onOpenChange={(open) => {
            setOuvert(open);
            if (!open) reinitialiser();
          }}
        >
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="size-4" />
              Ajouter
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajouter un livrable attendu</DialogTitle>
              <DialogDescription>
                Il sera proposé à chaque étudiant rattaché à ce profil.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="livrable-nom">Nom</Label>
                <Input
                  id="livrable-nom"
                  placeholder="Ex : Cahier des charges"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="livrable-description">Description</Label>
                <Textarea
                  id="livrable-description"
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Nature</Label>
                <Select value={type} onValueChange={(v) => setType(v as TypeLivrable)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fichier">{LIBELLES_TYPE_LIVRABLE.fichier}</SelectItem>
                    <SelectItem value="lien">{LIBELLES_TYPE_LIVRABLE.lien}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Obligatoire</p>
                  <p className="text-xs text-muted-foreground">
                    Sans ce livrable, le suivi de l&apos;étudiant reste incomplet.
                  </p>
                </div>
                <Switch checked={obligatoire} onCheckedChange={setObligatoire} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOuvert(false)}>
                Annuler
              </Button>
              <Button onClick={soumettre} disabled={enCours || !nom.trim()}>
                Ajouter
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-2">
        {elements.length === 0 ? (
          <EmptyState
            icon={Package}
            title="Aucun livrable attendu"
            description="Ajoutez le premier élément que vos étudiants doivent produire."
          />
        ) : (
          elements.map((el) => (
            <div
              key={el.id}
              className="flex items-start justify-between gap-3 rounded-lg border p-3"
            >
              <div className="flex items-start gap-3">
                {el.type === "lien" ? (
                  <Link2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                ) : (
                  <Upload className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{el.nom}</p>
                    {el.obligatoire && (
                      <Badge variant="outline" className="text-[10px]">
                        Obligatoire
                      </Badge>
                    )}
                  </div>
                  {el.description && (
                    <p className="text-sm text-muted-foreground">{el.description}</p>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Supprimer « ${el.nom} »`}
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
            <DialogTitle>Supprimer ce livrable attendu ?</DialogTitle>
            <DialogDescription>
              {elementASupprimer && (
                <>
                  « {elementASupprimer.nom} » ne sera plus demandé aux étudiants rattachés à ce
                  profil. Les dépôts déjà effectués restent conservés.
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
