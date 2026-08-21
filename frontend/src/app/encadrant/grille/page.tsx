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
import { apiGet, apiList, apiPost, apiPut } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { CritereGrille, GrilleEvaluation, ProfilEncadrant } from "@/types";

const GRILLE_PAR_DEFAUT: Omit<CritereGrille, "id">[] = [
  { libelle: "Problématique", poids: 15, ordre: 0 },
  { libelle: "Revue de littérature", poids: 15, ordre: 1 },
  { libelle: "Méthodologie", poids: 20, ordre: 2 },
  { libelle: "Analyse", poids: 20, ordre: 3 },
  { libelle: "Discussion", poids: 15, ordre: 4 },
  { libelle: "Conclusion", poids: 5, ordre: 5 },
  { libelle: "Forme", poids: 10, ordre: 6 },
];

type CritereEdite = { id: string; libelle: string; poids: number };

function versCritereEdite(criteres: CritereGrille[]): CritereEdite[] {
  return criteres.length > 0
    ? criteres.map((c) => ({ id: c.id, libelle: c.libelle, poids: c.poids }))
    : GRILLE_PAR_DEFAUT.map((c, i) => ({ id: `nouveau-${i}`, libelle: c.libelle, poids: c.poids }));
}

/**
 * Écran « Grille d'évaluation » (spec section 8.5, écrans E62-E65) : critères pondérés du profil
 * sélectionné, dont la somme des poids doit valoir 100. Sert à orienter l'analyse de l'IA - ne
 * remplace jamais la note finale de l'encadrant.
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
    () =>
      apiGet<GrilleEvaluation>("grilles-evaluation", profilSelectionne!.id).catch(() => null),
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
  const somme = criteres.reduce((acc, c) => acc + (Number(c.poids) || 0), 0);

  const modifierCritere = (id: string, champ: "libelle" | "poids", valeur: string) => {
    setCriteres((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, [champ]: champ === "poids" ? Number(valeur) || 0 : valeur } : c
      )
    );
  };

  const ajouterCritere = () => {
    setCriteres((prev) => [
      ...prev,
      { id: `nouveau-${crypto.randomUUID()}`, libelle: "", poids: 0 },
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
      toast.success("Grille d'évaluation enregistrée.");
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
    </div>
  );
}
