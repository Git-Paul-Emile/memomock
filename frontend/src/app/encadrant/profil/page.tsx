"use client";

import * as React from "react";
import Link from "next/link";
import { BookOpen, Library } from "lucide-react";

import { useAuth } from "@/context/auth-context";
import { useApiList } from "@/hooks/use-api-list";
import { useApiResource } from "@/hooks/use-api-resource";
import { useSyncedState } from "@/hooks/use-synced-state";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ListeLivrablesAttendus } from "@/components/profil/liste-livrables-attendus";
import { ListeReferences } from "@/components/profil/liste-references";
import { PanneauReglesProfil } from "@/components/profil/panneau-regles-profil";
import { SelecteurProfil } from "@/components/profil/selecteur-profil";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

import { apiList, apiPatch } from "@/lib/api";
import { ExtractionTexteError, extraireTexte } from "@/lib/extraction-texte";
import { extraireReglesAvecIa } from "@/lib/ia/client";
import type {
  Canevas,
  ElementReference,
  LivrableDefinition,
  ProfilEncadrant,
  RegleProfil,
  TypeLivrable,
} from "@/types";

type Categorie = "guidesRedaction" | "memoiresModeles" | "normes" | "exigences";

const CATEGORIES: { cle: Categorie; titre: string; description: string }[] = [
  {
    cle: "guidesRedaction",
    titre: "Guides de rédaction",
    description: "Documents décrivant la structure et le style attendus.",
  },
  {
    cle: "memoiresModeles",
    titre: "Mémoires modèles",
    description: "Exemples de mémoires de référence pour vos étudiants.",
  },
  {
    cle: "normes",
    titre: "Normes",
    description: "Règles de mise en forme, de citation et de pagination.",
  },
  {
    cle: "exigences",
    titre: "Exigences spécifiques",
    description: "Vos attentes particulières (méthodologie, livrables annexes...).",
  },
];

export default function ProfilEncadrantPage() {
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

  // Dupliqué en état local pour permettre les mises à jour optimistes (ajout/suppression d'un
  // élément de référence, création d'un nouveau profil) sans attendre un refetch réseau.
  const [profils, setProfils] = useSyncedState<ProfilEncadrant[]>(data, []);
  const [profilSelectionneId, setProfilSelectionneId] = React.useState<string | null>(null);

  const profilSelectionne = profils.find((p) => p.id === profilSelectionneId) ?? profils[0] ?? null;

  const { data: mesCanevas } = useApiList<Canevas>("canevas", {
    filtres: { encadrantId: user?.id },
    limite: 100,
  });

  const associerCanevas = async (canevasId: string) => {
    if (!profilSelectionne) return;
    const misAJour = await apiPatch<ProfilEncadrant>("profils-encadrant", profilSelectionne.id, {
      canevasId: canevasId === "aucun" ? null : canevasId,
      updatedAt: new Date().toISOString(),
    });
    setProfils((prev) => prev.map((p) => (p.id === misAJour.id ? misAJour : p)));
  };

  const mettreAJourRegles = async (regles: RegleProfil[]) => {
    if (!profilSelectionne) return;
    const misAJour = await apiPatch<ProfilEncadrant>("profils-encadrant", profilSelectionne.id, {
      reglesProfil: regles,
      updatedAt: new Date().toISOString(),
    });
    setProfils((prev) => prev.map((p) => (p.id === misAJour.id ? misAJour : p)));
  };

  /** Lit la ressource téléversée et en fait extraire les règles par l'IA (spec v2, § 19). */
  const extraireRegles = async (fichier: File, titre: string): Promise<RegleProfil[]> => {
    if (!profilSelectionne) return [];
    try {
      const texte = await extraireTexte(fichier);
      if (!texte) {
        toast.info("Aucun texte lisible dans ce fichier (document scanné ?).");
        return [];
      }
      const { source, resultat } = await extraireReglesAvecIa({
        texte,
        titreRessource: titre,
        typeDocument: profilSelectionne.typeDocument,
        discipline: profilSelectionne.discipline,
      });
      toast.success(
        `${resultat.length} règle(s) extraite(s)${source === "simulation" ? " (extraction simplifiée, IA indisponible)" : ""} : vérifiez-les dans « Règles du profil ».`
      );
      return resultat.map((r) => ({
        id: crypto.randomUUID(),
        categorie: r.categorie,
        libelle: r.libelle,
        detail: r.detail ?? null,
        source: "ia",
        ressource: titre,
        statut: "a_verifier",
      }));
    } catch (err) {
      toast.error(err instanceof ExtractionTexteError ? err.message : "La ressource n'a pas pu être analysée.");
      return [];
    }
  };

  const ajouterElement = async (
    categorie: Categorie,
    item: { titre: string; description: string; fichier?: File | null }
  ) => {
    if (!profilSelectionne) return;
    const nouvelElement: ElementReference = {
      id: crypto.randomUUID(),
      titre: item.titre,
      description: item.description,
      nomFichier: item.fichier?.name ?? null,
      ajouteLe: new Date().toISOString(),
    };
    const reglesExtraites = item.fichier ? await extraireRegles(item.fichier, item.titre) : [];
    const misAJour = await apiPatch<ProfilEncadrant>("profils-encadrant", profilSelectionne.id, {
      [categorie]: [...profilSelectionne[categorie], nouvelElement],
      ...(reglesExtraites.length > 0
        ? { reglesProfil: [...(profilSelectionne.reglesProfil ?? []), ...reglesExtraites] }
        : {}),
      updatedAt: new Date().toISOString(),
    });
    setProfils((prev) => prev.map((p) => (p.id === misAJour.id ? misAJour : p)));
  };

  const supprimerElement = async (categorie: Categorie, id: string) => {
    if (!profilSelectionne) return;
    const misAJour = await apiPatch<ProfilEncadrant>("profils-encadrant", profilSelectionne.id, {
      [categorie]: profilSelectionne[categorie].filter((el) => el.id !== id),
      updatedAt: new Date().toISOString(),
    });
    setProfils((prev) => prev.map((p) => (p.id === misAJour.id ? misAJour : p)));
  };

  const ajouterLivrable = async (item: {
    nom: string;
    description: string;
    type: TypeLivrable;
    obligatoire: boolean;
  }) => {
    if (!profilSelectionne) return;
    const nouveauLivrable: LivrableDefinition = {
      id: crypto.randomUUID(),
      ...item,
      ajouteLe: new Date().toISOString(),
    };
    const misAJour = await apiPatch<ProfilEncadrant>("profils-encadrant", profilSelectionne.id, {
      livrablesAttendus: [...profilSelectionne.livrablesAttendus, nouveauLivrable],
      updatedAt: new Date().toISOString(),
    });
    setProfils((prev) => prev.map((p) => (p.id === misAJour.id ? misAJour : p)));
  };

  const supprimerLivrable = async (id: string) => {
    if (!profilSelectionne) return;
    const misAJour = await apiPatch<ProfilEncadrant>("profils-encadrant", profilSelectionne.id, {
      livrablesAttendus: profilSelectionne.livrablesAttendus.filter((el) => el.id !== id),
      updatedAt: new Date().toISOString(),
    });
    setProfils((prev) => prev.map((p) => (p.id === misAJour.id ? misAJour : p)));
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Mes profils pédagogiques"
        description="Ces éléments servent de référence à l'IA pour analyser et corriger les documents de vos étudiants. Un profil regroupe les exigences d'un type de mémoire et d'une discipline."
      />

      <SelecteurProfil
        profils={profils}
        profilSelectionneId={profilSelectionne?.id ?? null}
        onSelectionner={setProfilSelectionneId}
        onCree={(profil) => setProfils((prev) => [...prev, profil])}
      />

      {!profilSelectionne ? (
        <EmptyState
          icon={BookOpen}
          title="Aucun profil pour l'instant"
          description="Créez votre premier profil méthodologique (type de document + discipline) pour commencer à importer vos ressources."
        />
      ) : (
        <>
          <Card className="mb-4">
            <CardHeader className="flex-row items-start justify-between">
              <div>
                <CardTitle className="text-base">Canevas associé</CardTitle>
                <CardDescription>
                  Structure en chapitres utilisée pour ce profil (spec section 17).
                </CardDescription>
              </div>
              <Link
                href="/encadrant/canevas"
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <Library className="size-3.5" />
                Gérer mes canevas
              </Link>
            </CardHeader>
            <CardContent>
              <Select
                value={profilSelectionne.canevasId ?? "aucun"}
                onValueChange={associerCanevas}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Aucun canevas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aucun">Aucun canevas</SelectItem>
                  {mesCanevas.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <PanneauReglesProfil
            regles={profilSelectionne.reglesProfil ?? []}
            onChange={mettreAJourRegles}
          />

          <Tabs defaultValue="guidesRedaction">
            <TabsList className="mb-4 flex-wrap">
              {CATEGORIES.map((c) => (
                <TabsTrigger key={c.cle} value={c.cle}>
                  {c.titre}
                </TabsTrigger>
              ))}
              <TabsTrigger value="livrablesAttendus">Livrables attendus</TabsTrigger>
            </TabsList>
            {CATEGORIES.map((c) => (
              <TabsContent key={c.cle} value={c.cle}>
                <ListeReferences
                  titre={c.titre}
                  description={c.description}
                  elements={profilSelectionne[c.cle]}
                  onAjouter={(item) => ajouterElement(c.cle, item)}
                  onSupprimer={(id) => supprimerElement(c.cle, id)}
                />
              </TabsContent>
            ))}
            <TabsContent value="livrablesAttendus">
              <ListeLivrablesAttendus
                elements={profilSelectionne.livrablesAttendus}
                onAjouter={ajouterLivrable}
                onSupprimer={supprimerLivrable}
              />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
