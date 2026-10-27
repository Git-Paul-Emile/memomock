"use client";

import * as React from "react";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/context/auth-context";
import { useApiResource } from "@/hooks/use-api-resource";
import { useSyncedState } from "@/hooks/use-synced-state";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { SelecteurProfil } from "@/components/profil/selecteur-profil";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { apiGet, apiList, apiPatch, apiPost, apiPut } from "@/lib/api";
import { cn } from "@/lib/utils";
import { LIBELLES_CATEGORIE_SCORE } from "@/types";
import type { CategorieScore, CritereGrille, GrilleEvaluation, ProfilEncadrant } from "@/types";
import { axeDuCritere, SEUIL_CATEGORIE_DEFAUT, SEUIL_SOUMISSION_DEFAUT } from "@/lib/score";

const GRILLE_PAR_DEFAUT: Omit<CritereGrille, "id">[] = [
  { libelle: "Problématique", poids: 15, ordre: 0 },
  { libelle: "Revue de littérature", poids: 15, ordre: 1 },
  { libelle: "Méthodologie", poids: 20, ordre: 2 },
  { libelle: "Analyse", poids: 20, ordre: 3 },
  { libelle: "Discussion", poids: 15, ordre: 4 },
  { libelle: "Conclusion", poids: 5, ordre: 5 },
  { libelle: "Forme", poids: 10, ordre: 6 },
];

// `axe` vide = catégorie déduite du libellé (lib/score.ts).
type CritereEdite = { id: string; libelle: string; poids: number; axe: CategorieScore | "" };

function versCritereEdite(criteres: CritereGrille[]): CritereEdite[] {
  return criteres.length > 0
    ? criteres.map((c) => ({ id: c.id, libelle: c.libelle, poids: c.poids, axe: c.axe ?? "" }))
    : GRILLE_PAR_DEFAUT.map((c, i) => ({ id: `nouveau-${i}`, libelle: c.libelle, poids: c.poids, axe: "" }));
}

/**
 * Écran « Grille d'évaluation » (spec section 8.5, écrans E62-E65) : critères pondérés du profil
 * sélectionné, dont la somme des poids doit valoir 100. Sert à orienter l'analyse de l'IA - ne
 * remplace jamais la note finale de l'encadreur.
 */
export default function GrilleEvaluationPage() {
  const { user } = useAuth();

  const { data: profils, isLoading: chargementProfils } = useApiResource<ProfilEncadrant[]>(
    ["profils-encadrant", user?.id],
    async () =>
      (
        await apiList<ProfilEncadrant>("profils-encadrant", {
          filtres: { encadrantId: user!.id },
          limite: 50,
        })
      ).data,
    { enabled: !!user }
  );
  const [profilsState, setProfilsState] = useSyncedState<ProfilEncadrant[]>(profils, []);
  const [profilSelectionneId, setProfilSelectionneId] = React.useState<string | null>(null);
  const profilSelectionne =
    profilsState.find((p) => p.id === profilSelectionneId) ?? profilsState[0] ?? null;

  const {
    data: grilleChargee,
    isLoading: chargementGrille,
    refetch: refetchGrille,
  } = useApiResource<GrilleEvaluation | null>(
    ["grille-evaluation", profilSelectionne?.id],
    () => apiGet<GrilleEvaluation>("grilles-evaluation", profilSelectionne!.id).catch(() => null),
    { enabled: !!profilSelectionne }
  );

  // Ajustement pendant le rendu plutôt qu'un `useEffect` + `setState` (voir useSyncedState) :
  // mémoïsé pour ne changer de référence qu'au chargement effectif d'un profil différent, sinon
  // chaque rendu écraserait les modifications locales en cours de saisie.
  const critieresSource = React.useMemo(
    () =>
      profilSelectionne && !chargementGrille
        ? versCritereEdite(grilleChargee?.criteres ?? [])
        : undefined,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [profilSelectionne?.id, chargementGrille]
  );
  const [criteres, setCriteres] = useSyncedState<CritereEdite[]>(critieresSource, []);

  const [enCours, setEnCours] = React.useState(false);
  // Seuils de soumission (spec v2, § 25), enregistrés sur le profil avec la grille.
  // Mémoïsé sur l'id du profil, comme les critères : sinon chaque rendu écraserait la saisie.
  const seuilsSource = React.useMemo(
    () =>
      profilSelectionne
        ? {
            soumission: profilSelectionne.seuilSoumission ?? SEUIL_SOUMISSION_DEFAUT,
            categorie: profilSelectionne.seuilCategorieMinimum ?? SEUIL_CATEGORIE_DEFAUT,
          }
        : undefined,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [profilSelectionne?.id]
  );
  const [seuils, setSeuils] = useSyncedState<{ soumission: number; categorie: number }>(
    seuilsSource,
    { soumission: SEUIL_SOUMISSION_DEFAUT, categorie: SEUIL_CATEGORIE_DEFAUT }
  );
  const somme = criteres.reduce((acc, c) => acc + (Number(c.poids) || 0), 0);

  const modifierCritere = (id: string, champ: "libelle" | "poids" | "axe", valeur: string) => {
    setCriteres((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, [champ]: champ === "poids" ? Number(valeur) || 0 : valeur } : c
      )
    );
  };

  const ajouterCritere = () => {
    setCriteres((prev) => [
      ...prev,
      { id: `nouveau-${crypto.randomUUID()}`, libelle: "", poids: 0, axe: "" },
    ]);
  };

  const supprimerCritere = (id: string) => {
    setCriteres((prev) => prev.filter((c) => c.id !== id));
  };

  const enregistrer = async () => {
    if (!profilSelectionne) return;
    if (somme !== 100) {
      toast.error(`La somme des poids doit être égale à 100 (actuellement ${somme}).`);
      return;
    }
    if (criteres.some((c) => !c.libelle.trim())) {
      toast.error("Chaque critère doit avoir un libellé.");
      return;
    }
    setEnCours(true);
    try {
      const critieresAEnregistrer: CritereGrille[] = criteres.map((c, i) => ({
        id: c.id.startsWith("nouveau-") ? crypto.randomUUID() : c.id,
        libelle: c.libelle.trim(),
        poids: c.poids,
        ordre: i,
        axe: c.axe || null,
      }));
      const corps = {
        id: profilSelectionne.id,
        profilEncadrantId: profilSelectionne.id,
        criteres: critieresAEnregistrer,
        updatedAt: new Date().toISOString(),
      };
      // `GrilleEvaluation.id === profilEncadrantId` (relation 1-1) : le mock (json-server) ne
      // crée pas de ressource via PUT sur un id inexistant (contrairement à PATCH/POST) - premier
      // enregistrement en POST, mises à jour suivantes en PUT. Sans cette distinction, la toute
      // première sauvegarde d'une grille échouait systématiquement (bug préexistant).
      if (grilleChargee) {
        await apiPut<GrilleEvaluation>("grilles-evaluation", profilSelectionne.id, corps);
      } else {
        await apiPost<GrilleEvaluation>("grilles-evaluation", corps);
      }
      await apiPatch<ProfilEncadrant>("profils-encadrant", profilSelectionne.id, {
        seuilSoumission: seuils.soumission,
        seuilCategorieMinimum: seuils.categorie,
        updatedAt: new Date().toISOString(),
      });
      toast.success("Grille et seuils enregistrés.");
      refetchGrille();
    } catch {
      toast.error("L'enregistrement a échoué. Réessayez dans quelques instants.");
    } finally {
      setEnCours(false);
    }
  };

  if (chargementProfils) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Grille d'évaluation"
        description="Ces critères pondérés orientent l'analyse de l'IA. Ils ne remplacent jamais votre note finale."
        actions={
          profilSelectionne ? (
            <Button size="sm" onClick={enregistrer} disabled={enCours}>
              {enCours ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Enregistrer
            </Button>
          ) : undefined
        }
      />

      <SelecteurProfil
        profils={profilsState}
        profilSelectionneId={profilSelectionne?.id ?? null}
        onSelectionner={setProfilSelectionneId}
        onCree={(p) => setProfilsState((prev) => [...prev, p])}
      />

      {!profilSelectionne ? (
        <EmptyState
          icon={Save}
          title="Aucun profil pour l'instant"
          description="Créez d'abord un profil méthodologique pour lui associer une grille d'évaluation."
        />
      ) : chargementGrille ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              Critères
              <span
                className={cn(
                  "text-sm font-normal",
                  somme === 100 ? "text-success" : "text-destructive"
                )}
              >
                Total : {somme} / 100
              </span>
            </CardTitle>
            <CardDescription>
              Exemple : Problématique 15 %, Méthodologie 20 %, Forme 10 %…
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {criteres.map((critere) => (
              <div key={critere.id} className="flex items-end gap-2">
                <div className="flex-1 space-y-1.5">
                  <Label className="text-xs">Libellé</Label>
                  <Input
                    value={critere.libelle}
                    onChange={(e) => modifierCritere(critere.id, "libelle", e.target.value)}
                    placeholder="Ex : Méthodologie"
                  />
                </div>
                <div className="w-40 space-y-1.5">
                  <Label className="text-xs">Catégorie du score</Label>
                  <select
                    aria-label="Catégorie du score"
                    value={critere.axe}
                    onChange={(e) => modifierCritere(critere.id, "axe", e.target.value)}
                    className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                  >
                    <option value="">
                      Auto ({LIBELLES_CATEGORIE_SCORE[axeDuCritere({ libelle: critere.libelle })]})
                    </option>
                    {(Object.keys(LIBELLES_CATEGORIE_SCORE) as CategorieScore[]).map((c) => (
                      <option key={c} value={c}>
                        {LIBELLES_CATEGORIE_SCORE[c]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-24 space-y-1.5">
                  <Label className="text-xs">Poids (%)</Label>
                  <Input
                    type="number"
                    value={critere.poids}
                    onChange={(e) => modifierCritere(critere.id, "poids", e.target.value)}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="mb-0.5 text-muted-foreground hover:text-destructive"
                  onClick={() => supprimerCritere(critere.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={ajouterCritere}>
              <Plus className="size-4" />
              Ajouter un critère
            </Button>
          </CardContent>
        </Card>
      )}

      {profilSelectionne && !chargementGrille && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-base">Seuils de soumission</CardTitle>
            <CardDescription>
              L&apos;étudiant ne peut soumettre que si le score global atteint le seuil, qu&apos;aucune
              catégorie n&apos;est sous le minimum et qu&apos;il ne reste aucun point bloquant.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="seuil-soumission">Score global minimal (%)</Label>
              <Input
                id="seuil-soumission"
                type="number"
                min={0}
                max={100}
                value={seuils.soumission}
                onChange={(e) => setSeuils((s) => ({ ...s, soumission: Number(e.target.value) || 0 }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="seuil-categorie">Minimum par catégorie (%)</Label>
              <Input
                id="seuil-categorie"
                type="number"
                min={0}
                max={100}
                value={seuils.categorie}
                onChange={(e) => setSeuils((s) => ({ ...s, categorie: Number(e.target.value) || 0 }))}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
