"use client";

import * as React from "react";
import { BookOpen, CheckCircle2, Lock, Unlock, XCircle } from "lucide-react";

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
import { EmptyState } from "@/components/shared/empty-state";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { STATUT_CHAPITRE_LABELS, STATUT_CHAPITRE_VARIANT } from "@/lib/constants";
import type { ChapitreAffiche } from "@/lib/canevas";

/**
 * Panneau de validation par chapitre d'un document (spec sections 50, 53-54), partagé
 * étudiant/encadrant - même schéma que `PanneauLivrables` (lot précédent) : `items` provient de
 * `resoudreChapitres` (lib/canevas.ts).
 */
export function PanneauChapitres({
  items,
  role,
  onValider,
  onRefuser,
  onDeverrouiller,
}: {
  items: ChapitreAffiche[];
  role: "etudiant" | "encadrant";
  onValider?: (item: ChapitreAffiche) => Promise<void>;
  onRefuser?: (item: ChapitreAffiche, commentaire: string) => Promise<void>;
  onDeverrouiller?: (item: ChapitreAffiche) => Promise<void>;
}) {
  const [refusOuvert, setRefusOuvert] = React.useState<ChapitreAffiche | null>(null);

  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Structure du mémoire</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={BookOpen}
            title="Aucun canevas associé"
            description="Ce profil n'a pas encore de canevas structuré en chapitres."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Structure du mémoire</CardTitle>
        <CardDescription>
          {role === "etudiant"
            ? "Progression de validation, chapitre par chapitre."
            : "Validez chaque chapitre au fur et à mesure de votre relecture."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((item) => (
          <div key={item.chapitreId} className="space-y-2 rounded-lg border p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex items-start gap-3">
                {item.verrouille ? (
                  <Lock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                ) : (
                  <Unlock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{item.titre}</p>
                    {item.obligatoire && (
                      <Badge variant="outline" className="text-[10px]">
                        Obligatoire
                      </Badge>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  )}
                  {item.criteres.length > 0 && (
                    <ul className="mt-1.5 space-y-0.5 text-xs text-muted-foreground">
                      {item.criteres.map((c) => (
                        <li key={c.id}>
                          · {c.libelle}
                          {!c.obligatoire && " (optionnel)"}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              <Badge variant={STATUT_CHAPITRE_VARIANT[item.statut]}>
                {STATUT_CHAPITRE_LABELS[item.statut]}
              </Badge>
            </div>

            {item.statut === "refuse" && item.validation?.commentaire && (
              <div className="ml-7 rounded-md bg-destructive/10 p-2 text-sm text-destructive">
                {item.validation.commentaire}
              </div>
            )}

            {role === "encadrant" && (
              <div className="ml-7 flex gap-2">
                {item.verrouille ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onDeverrouiller?.(item)}
                  >
                    <Unlock className="size-4" />
                    Déverrouiller
                  </Button>
                ) : (
                  <>
                    <Button size="sm" variant="outline" onClick={() => onValider?.(item)}>
                      <CheckCircle2 className="size-4" />
                      Valider
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setRefusOuvert(item)}>
                      <XCircle className="size-4" />
                      Refuser
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </CardContent>

      <DialogueRefus item={refusOuvert} onClose={() => setRefusOuvert(null)} onRefuser={onRefuser} />
    </Card>
  );
}

function DialogueRefus({
  item,
  onClose,
  onRefuser,
}: {
  item: ChapitreAffiche | null;
  onClose: () => void;
  onRefuser?: (item: ChapitreAffiche, commentaire: string) => Promise<void>;
}) {
  const [commentaire, setCommentaire] = React.useState("");
  const [enCours, setEnCours] = React.useState(false);
  const [derniereCle, setDerniereCle] = React.useState<string | null>(null);
  const cle = item?.chapitreId ?? null;
  if (cle !== derniereCle) {
    setDerniereCle(cle);
    setCommentaire("");
  }

  if (!item) return null;

  const confirmer = async () => {
    if (!commentaire.trim()) return;
    setEnCours(true);
    try {
      await onRefuser?.(item, commentaire.trim());
      onClose();
    } finally {
      setEnCours(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Refuser « {item.titre} »</DialogTitle>
          <DialogDescription>L&apos;étudiant sera notifié du motif de refus.</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="commentaire-chapitre">Motif</Label>
          <Textarea
            id="commentaire-chapitre"
            rows={3}
            value={commentaire}
            onChange={(e) => setCommentaire(e.target.value)}
            placeholder="Ex : La méthodologie ne justifie pas le choix de l'échantillon."
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button variant="destructive" onClick={confirmer} disabled={!commentaire.trim() || enCours}>
            Confirmer le refus
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
