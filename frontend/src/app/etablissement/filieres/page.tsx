"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronDown, Folder, GitBranch, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  useDocumentsEtablissement,
  useMonEtablissement,
  useReferentielEtablissement,
} from "@/hooks/use-etablissement";
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
import { Skeleton } from "@/components/ui/skeleton";
import { apiDelete, apiPost } from "@/lib/api";
import { statutApprenant } from "@/lib/etablissement";
import { cn } from "@/lib/utils";
import { LIBELLES_TYPE_DOCUMENT } from "@/types";
import type { Classe, Filiere, TypeDocument } from "@/types";

interface StatistiquesClasse {
  classe: Classe;
  inscrits: number;
  soumissions: number;
}

interface NiveauStructure {
  niveau: TypeDocument;
  classes: StatistiquesClasse[];
  inscrits: number;
  soumissions: number;
}

/**
 * Structure de l'établissement : filières > niveaux > classes, avec le taux de dépôt de chaque
 * niveau (spec sections 7, 9).
 *
 * Le niveau n'est pas une entité stockée : il est PORTÉ par la classe (`Classe.niveau`). La
 * hiérarchie affichée est donc dérivée des classes existantes, ce qui évite une table de plus
 * à maintenir en cohérence - un niveau apparaît dès qu'une classe l'utilise, et disparaît
 * quand la dernière classe de ce niveau est supprimée.
 */
export default function StructurePage() {
  const { etablissement, isLoading: chargementEtab } = useMonEtablissement();
  const referentiel = useReferentielEtablissement(etablissement?.id);
  const { documentsParEtudiant } = useDocumentsEtablissement();

  const [ouvertes, setOuvertes] = React.useState<string[]>([]);
  const [dialogueOuvert, setDialogueOuvert] = React.useState(false);
  const [nom, setNom] = React.useState("");
  const [enCours, setEnCours] = React.useState(false);
  const [aSupprimer, setASupprimer] = React.useState<Filiere | null>(null);

  const structure = React.useMemo(() => {
    // Comptage des apprenants et des dépôts par classe, en une passe sur les étudiants.
    const parClasse = new Map<string, { inscrits: number; soumissions: number }>();
    for (const etudiant of referentiel.etudiants) {
      if (!etudiant.classeId) continue;
      const courant = parClasse.get(etudiant.classeId) ?? {
        inscrits: 0,
        soumissions: 0,
      };
      const aDepose = statutApprenant(documentsParEtudiant.get(etudiant.id)) !== "pas_de_depot";
      parClasse.set(etudiant.classeId, {
        inscrits: courant.inscrits + 1,
        soumissions: courant.soumissions + (aDepose ? 1 : 0),
      });
    }

    return referentiel.filieres.map((filiere) => {
      const classesFiliere = referentiel.classes.filter(
        (classe) => classe.filiereId === filiere.id
      );

      const niveaux = new Map<TypeDocument, NiveauStructure>();
      for (const classe of classesFiliere) {
        const compteurs = parClasse.get(classe.id) ?? {
          inscrits: 0,
          soumissions: 0,
        };
        const entree = niveaux.get(classe.niveau) ?? {
          niveau: classe.niveau,
          classes: [],
          inscrits: 0,
          soumissions: 0,
        };
        entree.classes.push({ classe, ...compteurs });
        entree.inscrits += compteurs.inscrits;
        entree.soumissions += compteurs.soumissions;
        niveaux.set(classe.niveau, entree);
      }

      return {
        filiere,
        niveaux: [...niveaux.values()],
        nbClasses: classesFiliere.length,
      };
    });
  }, [referentiel.filieres, referentiel.classes, referentiel.etudiants, documentsParEtudiant]);

  const basculer = (id: string) => {
    setOuvertes((actuelles) =>
      actuelles.includes(id) ? actuelles.filter((item) => item !== id) : [...actuelles, id]
    );
  };

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
      setDialogueOuvert(false);
      referentiel.refetch();
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
      referentiel.refetch();
      toast.success("Filière supprimée.");
    } catch {
      toast.error("La suppression a échoué.");
    }
  };

  if (chargementEtab || referentiel.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Structure de l'établissement"
        description="Organisez vos filières, niveaux et classes."
        actions={
          <Dialog open={dialogueOuvert} onOpenChange={setDialogueOuvert}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="size-4" />
                Ajouter une filière
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ajouter une filière</DialogTitle>
              </DialogHeader>
              <div className="space-y-1.5">
                <Label htmlFor="filiere-nom">Nom de la filière</Label>
                <Input
                  id="filiere-nom"
                  value={nom}
                  onChange={(event) => setNom(event.target.value)}
                  placeholder="Ex : Informatique"
                />
                <p className="text-xs text-muted-foreground">
                  Les niveaux (Licence, Master, Doctorat) apparaissent automatiquement dès
                  qu&apos;une classe de ce niveau est créée dans la filière.
                </p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogueOuvert(false)}>
                  Annuler
                </Button>
                <Button onClick={creer} disabled={!nom.trim() || enCours}>
                  Ajouter
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {structure.length === 0 ? (
        <EmptyState
          icon={GitBranch}
          title="Aucune filière"
          description="Créez votre première filière pour pouvoir y rattacher des classes."
        />
      ) : (
        <div className="space-y-3">
          {structure.map(({ filiere, niveaux, nbClasses }) => {
            const ouverte = ouvertes.includes(filiere.id);
            const idContenu = `filiere-${filiere.id}`;

            return (
              <Card key={filiere.id} className="gap-0 overflow-hidden py-0">
                <div className="flex items-center gap-2 p-4">
                  <button
                    type="button"
                    onClick={() => basculer(filiere.id)}
                    aria-expanded={ouverte}
                    aria-controls={idContenu}
                    className="flex flex-1 items-center gap-3 text-left"
                  >
                    <Folder className="size-5 text-primary" />
                    <span className="font-medium">{filiere.nom}</span>
                    <Badge variant="outline">
                      {niveaux.length} niveau{niveaux.length > 1 ? "x" : ""}
                    </Badge>
                    <Badge variant="outline">
                      {nbClasses} classe{nbClasses > 1 ? "s" : ""}
                    </Badge>
                    <ChevronDown
                      className={cn("ml-auto size-4 transition-transform", ouverte && "rotate-180")}
                    />
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Supprimer la filière ${filiere.nom}`}
                    onClick={() => setASupprimer(filiere)}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>

                {ouverte && (
                  <CardContent id={idContenu} className="border-t bg-muted/40 p-0">
                    {niveaux.length === 0 ? (
                      <p className="p-4 text-sm text-muted-foreground">
                        Aucune classe dans cette filière.{" "}
                        <Link href="/etablissement/classes" className="underline">
                          Créer une classe
                        </Link>
                      </p>
                    ) : (
                      niveaux.map((niveau) => (
                        <div key={niveau.niveau} className="border-b px-5 py-3 last:border-0">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-sm font-medium">
                              {LIBELLES_TYPE_DOCUMENT[niveau.niveau]}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {niveau.soumissions} dépôt
                              {niveau.soumissions > 1 ? "s" : ""} / {niveau.inscrits} inscrit
                              {niveau.inscrits > 1 ? "s" : ""}
                            </span>
                          </div>
                          <ul className="mt-2 space-y-1 border-l pl-4">
                            {niveau.classes.map(({ classe, inscrits }) => (
                              <li
                                key={classe.id}
                                className="flex items-center justify-between text-sm"
                              >
                                <Link
                                  href={`/etablissement/classes/${classe.id}`}
                                  className="hover:underline"
                                >
                                  {classe.nom}
                                </Link>
                                <span className="text-xs text-muted-foreground">
                                  {inscrits} apprenant{inscrits > 1 ? "s" : ""}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!aSupprimer} onOpenChange={(ouvert) => !ouvert && setASupprimer(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer cette filière ?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            « {aSupprimer?.nom} » sera retirée. Les classes déjà associées ne sont pas supprimées :
            elles se retrouvent sans filière et restent modifiables depuis l&apos;écran Classes.
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
