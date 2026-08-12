"use client";

import * as React from "react";
import { Loader2, Save, Settings2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { apiList, apiPatch } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { ContraintesProfil, ProfilEncadrant } from "@/types";

/**
 * Écran « Paramétrage des contraintes » côté encadrant.
 *
 * Complément du profil méthodologique : choix de la norme de citation, du ton académique
 * attendu, de la structure type du document et des règles de mise en forme (police, interligne,
 * nombre de pages, sections obligatoires). Persisté dans `ProfilEncadrant.contraintes` (voir
 * PATCH /api/v1/profils-encadrant/:id, backend/prisma/schema.prisma).
 */
const NORMES = [
  { valeur: "apa", label: "APA (7e édition)" },
  { valeur: "iso690", label: "ISO 690" },
  { valeur: "chicago", label: "Chicago" },
  { valeur: "vancouver", label: "Vancouver" },
];

const TONS = [
  { valeur: "formel", label: "Formel" },
  { valeur: "neutre", label: "Neutre académique" },
  { valeur: "accessible", label: "Accessible" },
];

const SECTIONS = [
  "Résumé / Abstract",
  "Remerciements",
  "Table des matières",
  "Bibliographie",
  "Annexes",
];

const CONTRAINTES_PAR_DEFAUT: ContraintesProfil = {
  norme: "apa",
  ton: "neutre",
  pagesMinimum: 40,
  police: "Times New Roman, 12 pt",
  interligne: "1,5",
  marges: "2,5 cm",
  sectionsObligatoires: ["Résumé / Abstract", "Bibliographie"],
  consignesLibres: "",
};

export default function ContraintesPage() {
  const { user } = useAuth();

  const { data, isLoading } = useApiResource<ProfilEncadrant[]>(
    ["profils-encadrant", user?.id],
    async () => {
      const res = await apiList<ProfilEncadrant>("profils-encadrant", {
        filtres: { encadrantId: user!.id },
        limite: 50,
      });
      return res.data;
    },
    { enabled: !!user }
  );

  const [profils, setProfils] = useSyncedState<ProfilEncadrant[]>(data, []);
  const [profilSelectionneId, setProfilSelectionneId] = React.useState<string | null>(null);
  const profil = profils.find((p) => p.id === profilSelectionneId) ?? profils[0] ?? null;

  // Ajustement pendant le rendu plutôt qu'un `useEffect` + `setState` (voir useSyncedState) :
  // mémoïsé pour ne changer de référence que lorsque `profil` change réellement, sinon chaque
  // rendu écraserait les modifications locales en cours de saisie.
  const contraintesSource = React.useMemo(
    () => (profil ? { ...CONTRAINTES_PAR_DEFAUT, ...(profil.contraintes ?? {}) } : undefined),
    [profil]
  );
  const [contraintes, setContraintes] = useSyncedState<ContraintesProfil>(
    contraintesSource,
    CONTRAINTES_PAR_DEFAUT
  );
  const [enCours, setEnCours] = React.useState(false);

  const basculerSection = (section: string) => {
    setContraintes((prev) => {
      const actuelles = prev.sectionsObligatoires ?? [];
      return {
        ...prev,
        sectionsObligatoires: actuelles.includes(section)
          ? actuelles.filter((s) => s !== section)
          : [...actuelles, section],
      };
    });
  };

  const enregistrer = async () => {
    if (!profil) return;
    setEnCours(true);
    try {
      const profilMisAJour = await apiPatch<ProfilEncadrant>("profils-encadrant", profil.id, {
        contraintes,
      });
      setProfils((prev) => prev.map((p) => (p.id === profilMisAJour.id ? profilMisAJour : p)));
      toast.success("Contraintes enregistrées. Elles s'appliqueront aux prochaines analyses.");
    } catch {
      toast.error("L'enregistrement a échoué. Réessayez dans quelques instants.");
    } finally {
      setEnCours(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const sectionsObligatoires = contraintes.sectionsObligatoires ?? [];

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Paramétrage des contraintes"
        description="Définissez les règles formelles que l'IA vérifiera automatiquement pour vos étudiants, par profil méthodologique."
        actions={
          profil ? (
            <Button size="sm" onClick={enregistrer} disabled={enCours}>
              {enCours ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Enregistrer
            </Button>
          ) : undefined
        }
      />

      <SelecteurProfil
        profils={profils}
        profilSelectionneId={profil?.id ?? null}
        onSelectionner={setProfilSelectionneId}
        onCree={(p) => setProfils((prev) => [...prev, p])}
      />

      {!profil ? (
        <EmptyState
          icon={Settings2}
          title="Aucun profil pour l'instant"
          description="Créez d'abord un profil méthodologique (onglet « Nouveau profil » ci-dessus) pour lui associer des contraintes."
        />
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Norme de citation & ton</CardTitle>
              <CardDescription>
                Style de citation attendu et registre académique du document.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Norme de citation</Label>
                <Select
                  value={contraintes.norme}
                  onValueChange={(valeur) => setContraintes((prev) => ({ ...prev, norme: valeur }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {NORMES.map((n) => (
                      <SelectItem key={n.valeur} value={n.valeur}>
                        {n.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Ton attendu</Label>
                <Select
                  value={contraintes.ton}
                  onValueChange={(valeur) => setContraintes((prev) => ({ ...prev, ton: valeur }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TONS.map((t) => (
                      <SelectItem key={t.valeur} value={t.valeur}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Structure & mise en forme</CardTitle>
              <CardDescription>
                Règles de mise en page imposées par votre établissement.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="pages">Nombre de pages minimum</Label>
                <Input
                  id="pages"
                  type="number"
                  value={contraintes.pagesMinimum ?? 0}
                  onChange={(e) =>
                    setContraintes((prev) => ({
                      ...prev,
                      pagesMinimum: Number(e.target.value) || 0,
                    }))
                  }
                  className="w-28"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="police">Police & taille</Label>
                <Input
                  id="police"
                  value={contraintes.police ?? ""}
                  onChange={(e) => setContraintes((prev) => ({ ...prev, police: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="interligne">Interligne</Label>
                <Input
                  id="interligne"
                  value={contraintes.interligne ?? ""}
                  onChange={(e) =>
                    setContraintes((prev) => ({ ...prev, interligne: e.target.value }))
                  }
                  className="w-28"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="marges">Marges</Label>
                <Input
                  id="marges"
                  value={contraintes.marges ?? ""}
                  onChange={(e) => setContraintes((prev) => ({ ...prev, marges: e.target.value }))}
                  className="w-28"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sections obligatoires</CardTitle>
              <CardDescription>
                L&apos;IA signalera l&apos;absence de ces sections dans le mémoire.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {SECTIONS.map((section) => {
                const actif = sectionsObligatoires.includes(section);
                return (
                  <div
                    key={section}
                    className={cn(
                      "flex items-center justify-between rounded-lg border p-3 transition-colors",
                      actif && "border-primary/40 bg-primary/5"
                    )}
                  >
                    <span className="text-sm">{section}</span>
                    <Switch checked={actif} onCheckedChange={() => basculerSection(section)} />
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Consignes libres</CardTitle>
              <CardDescription>
                Attentes particulières transmises à l&apos;IA (méthodologie, livrables annexes…).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                rows={4}
                value={contraintes.consignesLibres ?? ""}
                onChange={(e) =>
                  setContraintes((prev) => ({ ...prev, consignesLibres: e.target.value }))
                }
                placeholder="Ex : Chaque chapitre doit s'ouvrir sur une problématique explicite et se clore sur une transition…"
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
