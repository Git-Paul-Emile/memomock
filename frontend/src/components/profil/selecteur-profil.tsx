"use client";

import * as React from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiPost } from "@/lib/api";
import { LIBELLES_TYPE_DOCUMENT } from "@/types";
import type { ProfilEncadrant, TypeDocument } from "@/types";

const TYPES_DOCUMENT: TypeDocument[] = ["licence", "master", "doctorat"];

/**
 * Sélecteur de profil méthodologique (spec section 8 : un encadrant en possède plusieurs - un
 * par type de document × discipline, ex. "Master Informatique", "Doctorat Informatique").
 * Réutilisé par `/encadrant/profil` et `/encadrant/contraintes` (Phase 3) : chaque écran affiche
 * ensuite le contenu du profil sélectionné.
 */
export function SelecteurProfil({
  profils,
  profilSelectionneId,
  onSelectionner,
  onCree,
}: {
  profils: ProfilEncadrant[];
  profilSelectionneId: string | null;
  onSelectionner: (id: string) => void;
  onCree: (profil: ProfilEncadrant) => void;
}) {
  const [dialogOuvert, setDialogOuvert] = React.useState(false);
  const [typeDocument, setTypeDocument] = React.useState<TypeDocument>("master");
  const [discipline, setDiscipline] = React.useState("");
  const [nom, setNom] = React.useState("");
  const [enCours, setEnCours] = React.useState(false);

  const profilsActifs = profils.filter((p) => p.actif);

  const creer = async () => {
    if (!discipline.trim()) {
      toast.error("La discipline est requise.");
      return;
    }
    setEnCours(true);
    try {
      const profil = await apiPost<ProfilEncadrant>("profils-encadrant", {
        typeDocument,
        discipline: discipline.trim(),
        ...(nom.trim() ? { nom: nom.trim() } : {}),
      });
      onCree(profil);
      onSelectionner(profil.id);
      setDialogOuvert(false);
      setDiscipline("");
      setNom("");
      toast.success("Profil créé.");
    } catch {
      toast.error(
        "La création du profil a échoué (ce type de document et cette discipline existent peut-être déjà)."
      );
    } finally {
      setEnCours(false);
    }
  };

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <Select value={profilSelectionneId ?? undefined} onValueChange={onSelectionner}>
        <SelectTrigger className="w-full sm:w-72">
          <SelectValue placeholder="Choisir un profil" />
        </SelectTrigger>
        <SelectContent>
          {profilsActifs.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.nom || `${LIBELLES_TYPE_DOCUMENT[p.typeDocument]} - ${p.discipline}`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Dialog open={dialogOuvert} onOpenChange={setDialogOuvert}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Plus className="size-4" />
            Nouveau profil
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouveau profil méthodologique</DialogTitle>
            <DialogDescription>
              Un profil regroupe les exigences applicables à un type de mémoire et à une discipline
              (ex. « Master - Informatique »).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Type de document</Label>
              <Select
                value={typeDocument}
                onValueChange={(v) => setTypeDocument(v as TypeDocument)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES_DOCUMENT.map((t) => (
                    <SelectItem key={t} value={t}>
                      {LIBELLES_TYPE_DOCUMENT[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="discipline">Discipline</Label>
              <Input
                id="discipline"
                value={discipline}
                onChange={(e) => setDiscipline(e.target.value)}
                placeholder="Ex : Informatique"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nomProfil">Nom affiché (facultatif)</Label>
              <Input
                id="nomProfil"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder={`${LIBELLES_TYPE_DOCUMENT[typeDocument]} - ${discipline || "…"}`}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOuvert(false)}>
              Annuler
            </Button>
            <Button onClick={creer} disabled={enCours}>
              {enCours && <Loader2 className="size-4 animate-spin" />}
              Créer le profil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
