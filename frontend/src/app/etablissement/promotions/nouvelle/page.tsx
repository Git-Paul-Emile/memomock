"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Info, Plus } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { useApiList } from "@/hooks/use-api-list";
import { useMonEtablissement, usePromotions } from "@/hooks/use-etablissement";
import { Pilule } from "@/components/etablissement/pilule";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { apiPost } from "@/lib/api";
import {
  datesParDefautPromotion,
  libellePromotion,
  NIVEAUX_ETABLISSEMENT,
} from "@/lib/etablissement";
import { LIBELLES_TYPE_DOCUMENT } from "@/types";
import type { Filiere, Promotion, TypeDocument } from "@/types";

/**
 * Validation d'entrée (zod) : donne un message immédiat à l'utilisateur avant tout
 * aller-retour réseau.
 */
const ANNEE_MIN = 2000;
const ANNEE_MAX = 2100;

const schemaPromotion = z
  .object({
    anneeDebut: z.number().int().min(ANNEE_MIN).max(ANNEE_MAX),
    anneeFin: z.number().int().min(ANNEE_MIN).max(ANNEE_MAX),
    filiereIds: z.array(z.string()).min(1, "Sélectionnez au moins une filière."),
    niveaux: z
      .array(z.enum(["licence", "master", "doctorat"]))
      .min(1, "Sélectionnez au moins un niveau."),
  })
  .refine((valeurs) => valeurs.anneeFin === valeurs.anneeDebut + 1, {
    message: "Une année académique couvre deux années consécutives (ex. 2025-2026).",
    path: ["anneeFin"],
  });

/** Création d'une année académique (spec section 10). */
export default function NouvellePromotionPage() {
  const router = useRouter();
  const { etablissement, isLoading: chargementEtab } = useMonEtablissement();
  const { promotions, refetch: rafraichirPromotions } = usePromotions(etablissement?.id);

  const { data: filieres, refetch: rafraichirFilieres } = useApiList<Filiere>("filieres", {
    filtres: { etablissementId: etablissement?.id },
    limite: 100,
    tri: "nom",
  });

  const anneeCourante = new Date().getFullYear();
  const [anneeDebut, setAnneeDebut] = React.useState(String(anneeCourante));
  const [anneeFin, setAnneeFin] = React.useState(String(anneeCourante + 1));
  const [filiereIds, setFiliereIds] = React.useState<string[]>([]);
  const [niveaux, setNiveaux] = React.useState<TypeDocument[]>(["licence", "master"]);
  const [nouvelleFiliere, setNouvelleFiliere] = React.useState("");
  const [saisieFiliereOuverte, setSaisieFiliereOuverte] = React.useState(false);
  const [erreur, setErreur] = React.useState<string | null>(null);
  const [enCours, setEnCours] = React.useState(false);

  const basculer = <T,>(valeur: T, liste: T[], setListe: (valeurs: T[]) => void) => {
    setListe(liste.includes(valeur) ? liste.filter((item) => item !== valeur) : [...liste, valeur]);
  };

  const ajouterFiliere = async () => {
    const nom = nouvelleFiliere.trim();
    if (!nom || !etablissement) return;
    try {
      const creee = await apiPost<Filiere>("filieres", {
        etablissementId: etablissement.id,
        nom,
        createdAt: new Date().toISOString(),
      });
      setFiliereIds((actuels) => [...actuels, creee.id]);
      setNouvelleFiliere("");
      setSaisieFiliereOuverte(false);
      rafraichirFilieres();
      toast.success("Filière ajoutée.");
    } catch {
      toast.error("La création de la filière a échoué.");
    }
  };

  const creer = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!etablissement) return;

    const resultat = schemaPromotion.safeParse({
      anneeDebut: Number(anneeDebut),
      anneeFin: Number(anneeFin),
      filiereIds,
      niveaux,
    });

    if (!resultat.success) {
      setErreur(resultat.error.issues[0]?.message ?? "Formulaire invalide.");
      return;
    }

    const { anneeDebut: debut, anneeFin: fin } = resultat.data;
    const libelle = libellePromotion(debut, fin);

    if (promotions.some((promotion) => promotion.libelle === libelle)) {
      setErreur(`La promotion ${libelle} existe déjà.`);
      return;
    }

    setErreur(null);
    setEnCours(true);
    try {
      await apiPost<Promotion>("promotions", {
        etablissementId: etablissement.id,
        libelle,
        anneeDebut: debut,
        anneeFin: fin,
        // La nouvelle promotion n'est pas activée automatiquement : bascule explicite depuis la
        // liste, pour ne pas déplacer sous les pieds de l'administration l'année en cours.
        statut: "archivee",
        filiereIds: resultat.data.filiereIds,
        niveaux: resultat.data.niveaux,
        ...datesParDefautPromotion(debut, fin),
        createdAt: new Date().toISOString(),
      });
      rafraichirPromotions();
      toast.success(`Promotion ${libelle} créée.`);
      router.push("/etablissement/promotions");
    } catch {
      toast.error("La création a échoué.");
    } finally {
      setEnCours(false);
    }
  };

  if (chargementEtab) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Créer une promotion"
        description="Configurez votre nouvelle année académique."
      />

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={creer} className="space-y-7">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="annee-debut">Année de début</Label>
                <Input
                  id="annee-debut"
                  inputMode="numeric"
                  value={anneeDebut}
                  onChange={(event) => {
                    setAnneeDebut(event.target.value);
                    // Confort de saisie : l'année de fin suit automatiquement tant que
                    // l'utilisateur n'y a pas touché lui-même.
                    const suivante = Number(event.target.value) + 1;
                    if (Number.isFinite(suivante)) setAnneeFin(String(suivante));
                  }}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="annee-fin">Année de fin</Label>
                <Input
                  id="annee-fin"
                  inputMode="numeric"
                  value={anneeFin}
                  onChange={(event) => setAnneeFin(event.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="text-sm font-semibold">Filières incluses</h2>
              <div className="flex flex-wrap gap-2">
                {filieres.map((filiere) => (
                  <Pilule
                    key={filiere.id}
                    actif={filiereIds.includes(filiere.id)}
                    onClick={() => basculer(filiere.id, filiereIds, setFiliereIds)}
                  >
                    {filiere.nom}
                  </Pilule>
                ))}
                <button
                  type="button"
                  onClick={() => setSaisieFiliereOuverte((ouvert) => !ouvert)}
                  className="rounded-full border border-dashed border-primary/50 px-3 py-1.5 text-sm text-primary"
                >
                  <Plus className="mr-1 inline size-3.5" />
                  Nouvelle filière
                </button>
              </div>
              {saisieFiliereOuverte && (
                <div className="flex gap-2">
                  <Input
                    value={nouvelleFiliere}
                    onChange={(event) => setNouvelleFiliere(event.target.value)}
                    placeholder="Nom de la nouvelle filière"
                    aria-label="Nom de la nouvelle filière"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={ajouterFiliere}
                    disabled={!nouvelleFiliere.trim()}
                  >
                    Ajouter
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <h2 className="text-sm font-semibold">Niveaux</h2>
              <div className="flex flex-wrap gap-2">
                {NIVEAUX_ETABLISSEMENT.map((niveau) => (
                  <Pilule
                    key={niveau}
                    actif={niveaux.includes(niveau)}
                    onClick={() => basculer(niveau, niveaux, setNiveaux)}
                  >
                    {LIBELLES_TYPE_DOCUMENT[niveau]}
                  </Pilule>
                ))}
              </div>
            </div>

            <p className="flex gap-3 rounded-lg bg-muted p-4 text-sm text-muted-foreground">
              <Info className="size-5 shrink-0" />
              Les filières et les niveaux sont des entités permanentes de l&apos;établissement.
              Seules les classes et les groupes sont spécifiques à chaque promotion.
            </p>

            {erreur && <p className="text-sm text-destructive">{erreur}</p>}

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" asChild>
                <Link href="/etablissement/promotions">Annuler</Link>
              </Button>
              <Button type="submit" disabled={enCours}>
                Créer la promotion
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
