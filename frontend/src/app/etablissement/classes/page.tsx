"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { toast } from "sonner";

import {
  useMonEtablissement,
  usePromotions,
  useReferentielEtablissement,
} from "@/hooks/use-etablissement";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Toolbar } from "@/components/shared/toolbar";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { apiPost } from "@/lib/api";
import { NIVEAUX_ETABLISSEMENT } from "@/lib/etablissement";
import { LIBELLES_TYPE_DOCUMENT } from "@/types";
import type { Classe, TypeDocument } from "@/types";

const TOUS = "tous";

function genererCodeClasse() {
  return `CLASSE-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

/** Liste, filtrage et création des classes d'un établissement (spec sections 9, 12). */
export default function ClassesEtablissementPage() {
  const { etablissement, isLoading: chargementEtab } = useMonEtablissement();
  const { promotionActive } = usePromotions(etablissement?.id);
  const referentiel = useReferentielEtablissement(etablissement?.id);

  const [recherche, setRecherche] = React.useState("");
  const [filiereId, setFiliereId] = React.useState<string>(TOUS);
  const [niveauFiltre, setNiveauFiltre] = React.useState<string>(TOUS);

  const [ouvert, setOuvert] = React.useState(false);
  const [nom, setNom] = React.useState("");
  const [filiereNouvelle, setFiliereNouvelle] = React.useState<string | undefined>(undefined);
  const [niveau, setNiveau] = React.useState<TypeDocument>("master");
  const [enCours, setEnCours] = React.useState(false);

  /**
   * Filtrage côté client, contrairement aux écrans Apprenants et Professeurs : un
   * établissement compte quelques dizaines de classes au plus, déjà chargées et mises en cache
   * par `useReferentielEtablissement` pour les autres écrans. Les refiltrer côté serveur
   * n'apporterait rien et ferait un aller-retour réseau à chaque frappe.
   */
  const classesFiltrees = React.useMemo(() => {
    const terme = recherche.trim().toLowerCase();
    return referentiel.classes.filter(
      (classe) =>
        (filiereId === TOUS || classe.filiereId === filiereId) &&
        (niveauFiltre === TOUS || classe.niveau === niveauFiltre) &&
        (terme === "" ||
          classe.nom.toLowerCase().includes(terme) ||
          classe.code.toLowerCase().includes(terme))
    );
  }, [referentiel.classes, filiereId, niveauFiltre, recherche]);

  const apprenantsParClasse = React.useMemo(() => {
    const index = new Map<string, number>();
    for (const etudiant of referentiel.etudiants) {
      if (!etudiant.classeId) continue;
      index.set(etudiant.classeId, (index.get(etudiant.classeId) ?? 0) + 1);
    }
    return index;
  }, [referentiel.etudiants]);

  const creer = async () => {
    if (!nom.trim() || !etablissement) return;
    setEnCours(true);
    try {
      await apiPost<Classe>("classes", {
        etablissementId: etablissement.id,
        // La classe est rattachée à l'année académique courante : c'est ce qui permet aux
        // promotions d'agréger leurs effectifs (voir /etablissement/promotions).
        promotionId: promotionActive?.id ?? null,
        filiereId: filiereNouvelle ?? null,
        nom: nom.trim(),
        niveau,
        code: genererCodeClasse(),
        encadrantIds: [],
        createdAt: new Date().toISOString(),
      });
      setNom("");
      setFiliereNouvelle(undefined);
      setOuvert(false);
      referentiel.refetch();
      toast.success("Classe créée.");
    } catch {
      toast.error("La création a échoué.");
    } finally {
      setEnCours(false);
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
        title="Classes"
        description={
          promotionActive
            ? `Promotion ${promotionActive.libelle} · ex. « Master Informatique »`
            : "Ex : « Master Informatique — Promotion 2026 »."
        }
        actions={
          <Dialog open={ouvert} onOpenChange={setOuvert}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="size-4" />
                Nouvelle classe
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nouvelle classe</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="classe-nom">Nom</Label>
                  <Input
                    id="classe-nom"
                    value={nom}
                    onChange={(event) => setNom(event.target.value)}
                    placeholder="Ex : Master Informatique — Promotion 2026"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Filière</Label>
                  <Select value={filiereNouvelle} onValueChange={setFiliereNouvelle}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Sélectionner une filière" />
                    </SelectTrigger>
                    <SelectContent>
                      {referentiel.filieres.map((filiere) => (
                        <SelectItem key={filiere.id} value={filiere.id}>
                          {filiere.nom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Niveau</Label>
                  <Select
                    value={niveau}
                    onValueChange={(valeur) => setNiveau(valeur as TypeDocument)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {NIVEAUX_ETABLISSEMENT.map((valeur) => (
                        <SelectItem key={valeur} value={valeur}>
                          {LIBELLES_TYPE_DOCUMENT[valeur]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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

      <Toolbar
        recherche={recherche}
        onRechercheChange={setRecherche}
        placeholderRecherche="Rechercher une classe ou un code…"
      >
        <Select value={filiereId} onValueChange={setFiliereId}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TOUS}>Toutes les filières</SelectItem>
            {referentiel.filieres.map((filiere) => (
              <SelectItem key={filiere.id} value={filiere.id}>
                {filiere.nom}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={niveauFiltre} onValueChange={setNiveauFiltre}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TOUS}>Tous les niveaux</SelectItem>
            {NIVEAUX_ETABLISSEMENT.map((valeur) => (
              <SelectItem key={valeur} value={valeur}>
                {LIBELLES_TYPE_DOCUMENT[valeur]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Toolbar>

      {classesFiltrees.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Aucune classe"
          description="Créez une classe pour obtenir un code de rattachement à partager avec vos étudiants."
        />
      ) : (
        <div className="space-y-2">
          {classesFiltrees.map((classe) => {
            const filiere = referentiel.filieres.find((item) => item.id === classe.filiereId);
            const groupes = referentiel.groupesParClasse.get(classe.id) ?? [];
            const apprenants = apprenantsParClasse.get(classe.id) ?? 0;

            return (
              <Link key={classe.id} href={`/etablissement/classes/${classe.id}`}>
                <Card className="transition-colors hover:bg-accent/50">
                  <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div>
                      <p className="text-sm font-medium">{classe.nom}</p>
                      <p className="text-xs text-muted-foreground">
                        {LIBELLES_TYPE_DOCUMENT[classe.niveau]}
                        {filiere ? ` · ${filiere.nom}` : " · sans filière"}
                        {` · ${groupes.length} groupe${groupes.length > 1 ? "s" : ""}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{apprenants} apprenant(s)</Badge>
                      <Badge variant="outline">{classe.encadrantIds.length} encadreur(s)</Badge>
                      <code className="text-xs text-muted-foreground">{classe.code}</code>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
