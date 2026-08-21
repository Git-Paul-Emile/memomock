"use client";

import * as React from "react";
import { CheckCircle2, FileUp, Link2, Loader2, Package, UploadCloud, XCircle } from "lucide-react";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { STATUT_LIVRABLE_LABELS, STATUT_LIVRABLE_VARIANT } from "@/lib/constants";
import { formatFileSize } from "@/lib/utils";
import type { LivrableAffiche } from "@/lib/livrables";

const EXTENSIONS_LIVRABLE_ACCEPTEES = ".pdf,.doc,.docx,.zip,.fig,.png,.jpg,.jpeg";

/**
 * Panneau des livrables d'un document, partagé étudiant/encadrant (spec sections 57-59) :
 * l'étudiant y dépose (fichier ou lien) ce qui est attendu, l'encadrant y vérifie chaque dépôt
 * (conforme / à corriger). `items` provient de `resoudreLivrables` (lib/livrables.ts).
 */
export function PanneauLivrables({
  items,
  role,
  onDeposer,
  onVerifier,
}: {
  items: LivrableAffiche[];
  role: "etudiant" | "encadrant";
  onDeposer?: (
    item: LivrableAffiche,
    valeurs: { fichier?: File; urlExterne?: string }
  ) => Promise<void>;
  onVerifier?: (
    item: LivrableAffiche,
    decision: "valide" | "en_correction",
    commentaire: string
  ) => Promise<void>;
}) {
  const [depotOuvert, setDepotOuvert] = React.useState<LivrableAffiche | null>(null);
  const [verifOuverte, setVerifOuverte] = React.useState<LivrableAffiche | null>(null);

  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Livrables</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Package}
            title="Aucun livrable attendu"
            description="Votre encadrant n'a défini aucun livrable pour ce profil."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Livrables</CardTitle>
        <CardDescription>
          {role === "etudiant"
            ? "Éléments attendus en plus du mémoire."
            : "Éléments déposés par l'étudiant en plus du mémoire."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((item) => (
          <div key={item.definitionId} className="space-y-2 rounded-lg border p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex items-start gap-3">
                {item.type === "lien" ? (
                  <Link2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                ) : (
                  <UploadCloud className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{item.nom}</p>
                    {item.obligatoire && (
                      <Badge variant="outline" className="text-[10px]">
                        Obligatoire
                      </Badge>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  )}
                </div>
              </div>
              <Badge variant={STATUT_LIVRABLE_VARIANT[item.statut]}>
                {STATUT_LIVRABLE_LABELS[item.statut]}
              </Badge>
            </div>

            {item.livrable && (item.livrable.nomFichier || item.livrable.urlExterne) && (
              <div className="ml-7 text-sm">
                {item.livrable.urlExterne ? (
                  <a
                    href={item.livrable.urlExterne}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {item.livrable.urlExterne}
                  </a>
                ) : (
                  <span className="text-muted-foreground">
                    {item.livrable.nomFichier}
                    {item.livrable.tailleOctets != null &&
                      ` · ${formatFileSize(item.livrable.tailleOctets)}`}
                  </span>
                )}
              </div>
            )}

            {item.livrable?.statut === "en_correction" && item.livrable.commentaireEncadrant && (
              <div className="ml-7 rounded-md bg-warning/10 p-2 text-sm text-warning-foreground">
                {item.livrable.commentaireEncadrant}
              </div>
            )}

            {role === "etudiant" && (item.statut === "a_faire" || item.statut === "en_correction") && (
              <div className="ml-7">
                <Button size="sm" variant="outline" onClick={() => setDepotOuvert(item)}>
                  {item.statut === "en_correction" ? "Redéposer" : "Déposer"}
                </Button>
              </div>
            )}

            {role === "encadrant" && item.statut === "soumis" && (
              <div className="ml-7 flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onVerifier?.(item, "valide", "")}
                >
                  <CheckCircle2 className="size-4" />
                  Conforme
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setVerifOuverte(item)}>
                  <XCircle className="size-4" />
                  À corriger
                </Button>
              </div>
            )}
          </div>
        ))}
      </CardContent>

      <DialogueDepot item={depotOuvert} onClose={() => setDepotOuvert(null)} onDeposer={onDeposer} />
      <DialogueVerification
        item={verifOuverte}
        onClose={() => setVerifOuverte(null)}
        onVerifier={onVerifier}
      />
    </Card>
  );
}

function DialogueDepot({
  item,
  onClose,
  onDeposer,
}: {
  item: LivrableAffiche | null;
  onClose: () => void;
  onDeposer?: (
    item: LivrableAffiche,
    valeurs: { fichier?: File; urlExterne?: string }
  ) => Promise<void>;
}) {
  const [fichier, setFichier] = React.useState<File | null>(null);
  const [url, setUrl] = React.useState("");
  const [enCours, setEnCours] = React.useState(false);
  // Réinitialise les champs à chaque changement de livrable ciblé (ouverture ou fermeture du
  // dialogue) - ajustement pendant le rendu plutôt qu'un useEffect, voir hooks/use-synced-state.ts.
  const [derniereCle, setDerniereCle] = React.useState<string | null>(null);
  const cle = item?.definitionId ?? null;
  if (cle !== derniereCle) {
    setDerniereCle(cle);
    setFichier(null);
    setUrl("");
  }

  if (!item) return null;

  const pret = item.type === "fichier" ? !!fichier : url.trim().length > 0;

  const soumettre = async () => {
    if (!pret) return;
    setEnCours(true);
    try {
      await onDeposer?.(
        item,
        item.type === "fichier" ? { fichier: fichier! } : { urlExterne: url.trim() }
      );
      onClose();
    } finally {
      setEnCours(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Déposer « {item.nom} »</DialogTitle>
          {item.description && <DialogDescription>{item.description}</DialogDescription>}
        </DialogHeader>
        {item.type === "fichier" ? (
          <div className="space-y-1.5">
            <Label htmlFor="livrable-fichier">Fichier</Label>
            <label
              htmlFor="livrable-fichier"
              className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed px-4 py-6 text-center transition-colors hover:bg-accent/50"
            >
              {fichier ? (
                <>
                  <FileUp className="size-6 text-primary" />
                  <p className="text-sm font-medium">{fichier.name}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(fichier.size)}</p>
                </>
              ) : (
                <>
                  <UploadCloud className="size-6 text-muted-foreground" />
                  <p className="text-sm font-medium">Cliquez pour choisir un fichier</p>
                </>
              )}
              <input
                id="livrable-fichier"
                type="file"
                accept={EXTENSIONS_LIVRABLE_ACCEPTEES}
                className="hidden"
                onChange={(e) => setFichier(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
        ) : (
          <div className="space-y-1.5">
            <Label htmlFor="livrable-url">Lien</Label>
            <Input
              id="livrable-url"
              type="url"
              placeholder="https://github.com/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={soumettre} disabled={!pret || enCours}>
            {enCours && <Loader2 className="size-4 animate-spin" />}
            Déposer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DialogueVerification({
  item,
  onClose,
  onVerifier,
}: {
  item: LivrableAffiche | null;
  onClose: () => void;
  onVerifier?: (
    item: LivrableAffiche,
    decision: "valide" | "en_correction",
    commentaire: string
  ) => Promise<void>;
}) {
  const [commentaire, setCommentaire] = React.useState("");
  const [enCours, setEnCours] = React.useState(false);
  const [derniereCle, setDerniereCle] = React.useState<string | null>(null);
  const cle = item?.definitionId ?? null;
  if (cle !== derniereCle) {
    setDerniereCle(cle);
    setCommentaire("");
  }

  if (!item) return null;

  const confirmer = async () => {
    if (!commentaire.trim()) return;
    setEnCours(true);
    try {
      await onVerifier?.(item, "en_correction", commentaire.trim());
      onClose();
    } finally {
      setEnCours(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Demander une correction - « {item.nom} »</DialogTitle>
          <DialogDescription>
            L&apos;étudiant sera notifié et pourra redéposer ce livrable.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="commentaire-livrable">Motif</Label>
          <Textarea
            id="commentaire-livrable"
            rows={3}
            value={commentaire}
            onChange={(e) => setCommentaire(e.target.value)}
            placeholder="Ex : Le cahier des charges ne couvre pas les contraintes techniques."
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={confirmer} disabled={!commentaire.trim() || enCours}>
            {enCours && <Loader2 className="size-4 animate-spin" />}
            Envoyer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
