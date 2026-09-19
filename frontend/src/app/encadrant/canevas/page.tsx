"use client";

import * as React from "react";
import Link from "next/link";
import { Copy, FileUp, Library, Loader2, Plus, Trash2, UploadCloud } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/context/auth-context";
import { useApiList } from "@/hooks/use-api-list";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  EXTENSIONS_CANEVAS_ACCEPTEES,
  ImportCanevasError,
  extraireTitresChapitres,
} from "@/lib/canevas-import";
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
          <>
            <ImporterCanevasDialog encadrantId={user?.id} onImporte={refetch} />
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
          </>
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

interface TitreDetecte {
  titre: string;
  selectionne: boolean;
}

/** Import d'un canevas depuis un .docx ou .pdf : détection best-effort des titres de chapitres,
 * revus et sélectionnés par l'encadrant avant création (voir lib/canevas-import.ts). */
function ImporterCanevasDialog({
  encadrantId,
  onImporte,
}: {
  encadrantId: string | undefined;
  onImporte: () => void;
}) {
  const [ouvert, setOuvert] = React.useState(false);
  const [etape, setEtape] = React.useState<"choix" | "revue">("choix");
  const [fichier, setFichier] = React.useState<File | null>(null);
  const [nom, setNom] = React.useState("");
  const [erreur, setErreur] = React.useState<string | null>(null);
  const [analyseEnCours, setAnalyseEnCours] = React.useState(false);
  const [creationEnCours, setCreationEnCours] = React.useState(false);
  const [titresDetectes, setTitresDetectes] = React.useState<TitreDetecte[]>([]);

  const fermer = (open: boolean) => {
    setOuvert(open);
    if (!open) {
      setEtape("choix");
      setFichier(null);
      setNom("");
      setErreur(null);
      setTitresDetectes([]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const nomFichier = f.name.toLowerCase();
    if (!EXTENSIONS_CANEVAS_ACCEPTEES.some((ext) => nomFichier.endsWith(ext))) {
      setErreur("Format non supporté. Seuls les fichiers .docx et .pdf sont acceptés.");
      setFichier(null);
      return;
    }
    setErreur(null);
    setFichier(f);
    if (!nom.trim()) setNom(f.name.replace(/\.(docx|pdf)$/i, ""));
  };

  const analyser = async () => {
    if (!fichier) return;
    setAnalyseEnCours(true);
    setErreur(null);
    try {
      const titres = await extraireTitresChapitres(fichier);
      setTitresDetectes(titres.map((titre) => ({ titre, selectionne: true })));
      setEtape("revue");
    } catch (err) {
      setErreur(
        err instanceof ImportCanevasError ? err.message : "L'analyse du fichier a échoué."
      );
    } finally {
      setAnalyseEnCours(false);
    }
  };

  const basculer = (index: number) => {
    setTitresDetectes((liste) =>
      liste.map((t, i) => (i === index ? { ...t, selectionne: !t.selectionne } : t))
    );
  };

  const confirmer = async () => {
    if (!nom.trim() || !encadrantId || !fichier) return;
    setCreationEnCours(true);
    try {
      const maintenant = new Date().toISOString();
      const canevas = await apiPost<Canevas>("canevas", {
        encadrantId,
        nom: nom.trim(),
        description: `Importé depuis « ${fichier.name} ».`,
        createdAt: maintenant,
        updatedAt: maintenant,
      });

      const chapitresRetenus = titresDetectes.filter((t) => t.selectionne);
      for (const [index, chapitre] of chapitresRetenus.entries()) {
        await apiPost<ChapitreCanevas>("chapitres-canevas", {
          canevasId: canevas.id,
          titre: chapitre.titre,
          description: null,
          obligatoire: true,
          ordre: index,
        });
      }

      onImporte();
      toast.success(
        chapitresRetenus.length > 0
          ? `Canevas importé avec ${chapitresRetenus.length} chapitre(s) détecté(s).`
          : "Canevas importé. Ajoutez ses chapitres manuellement."
      );
      fermer(false);
    } catch {
      toast.error("L'import a échoué.");
    } finally {
      setCreationEnCours(false);
    }
  };

  return (
    <Dialog open={ouvert} onOpenChange={fermer}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <UploadCloud className="size-4" />
          Importer un canevas
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Importer un canevas</DialogTitle>
        </DialogHeader>

        {etape === "choix" ? (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="canevas-fichier">Fichier (.docx ou .pdf)</Label>
              <label
                htmlFor="canevas-fichier"
                className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed px-4 py-6 text-center transition-colors hover:bg-accent/50"
              >
                {fichier ? (
                  <>
                    <FileUp className="size-6 text-primary" />
                    <p className="text-sm font-medium">{fichier.name}</p>
                  </>
                ) : (
                  <>
                    <UploadCloud className="size-6 text-muted-foreground" />
                    <p className="text-sm font-medium">
                      Cliquez pour choisir un fichier .docx ou .pdf
                    </p>
                  </>
                )}
                <input
                  id="canevas-fichier"
                  type="file"
                  accept={EXTENSIONS_CANEVAS_ACCEPTEES.join(",")}
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
              <p className="text-xs text-muted-foreground">
                Les titres de chapitres (plan, parties) sont détectés automatiquement ; vérifiez
                et ajustez la liste avant de valider.
              </p>
              {erreur && <p className="text-xs text-destructive">{erreur}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="canevas-import-nom">Nom du canevas</Label>
              <Input
                id="canevas-import-nom"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="Ex : Canevas Master Informatique 2026"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {titresDetectes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucun titre de chapitre détecté automatiquement dans ce fichier. Le canevas sera
                créé vide - vous pourrez ajouter ses chapitres manuellement.
              </p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  {titresDetectes.length} titre(s) détecté(s). Décochez ceux à ignorer.
                </p>
                <div className="max-h-72 space-y-1 overflow-y-auto rounded-lg border p-2">
                  {titresDetectes.map((t, index) => (
                    <label
                      key={index}
                      className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent/50"
                    >
                      <Checkbox checked={t.selectionne} onCheckedChange={() => basculer(index)} />
                      <span className={t.selectionne ? "" : "text-muted-foreground line-through"}>
                        {t.titre}
                      </span>
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        <DialogFooter>
          {etape === "choix" ? (
            <>
              <Button variant="outline" onClick={() => fermer(false)}>
                Annuler
              </Button>
              <Button onClick={analyser} disabled={!fichier || !nom.trim() || analyseEnCours}>
                {analyseEnCours && <Loader2 className="size-4 animate-spin" />}
                Analyser
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setEtape("choix")}>
                Retour
              </Button>
              <Button onClick={confirmer} disabled={creationEnCours}>
                {creationEnCours && <Loader2 className="size-4 animate-spin" />}
                Créer le canevas
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
