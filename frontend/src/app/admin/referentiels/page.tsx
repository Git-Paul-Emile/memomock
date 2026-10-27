"use client";

import * as React from "react";
import { BookOpen, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useApiList } from "@/hooks/use-api-list";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { apiDelete, apiPost } from "@/lib/api";
import { journaliser } from "@/lib/audit";
import type { Discipline } from "@/types";

/**
 * Référentiel commun des disciplines (spec v2, § 20, partie VII) : proposé aux encadreurs à la
 * création d'un profil méthodologique et utilisé pour la portée « discipline » des règles.
 */
export default function AdminReferentielsPage() {
  const [nom, setNom] = React.useState("");
  const { data, isLoading, refetch } = useApiList<Discipline>("disciplines", {
    filtres: { etablissementId: undefined },
    tri: "nom",
    limite: 500,
  });
  const disciplines = data.filter((d) => !d.etablissementId);

  const ajouter = async () => {
    const valeur = nom.trim();
    if (!valeur) return;
    if (disciplines.some((d) => d.nom.toLowerCase() === valeur.toLowerCase())) {
      toast.error("Cette discipline existe déjà.");
      return;
    }
    await apiPost<Discipline>("disciplines", {
      nom: valeur,
      etablissementId: null,
      departementId: null,
      createdAt: new Date().toISOString(),
    });
    await journaliser("Ajout de discipline", valeur);
    setNom("");
    refetch();
  };

  const supprimer = async (d: Discipline) => {
    await apiDelete("disciplines", d.id);
    await journaliser("Suppression de discipline", d.nom);
    refetch();
  };

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Disciplines"
        description="Référentiel commun proposé à tous les établissements et encadreurs."
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Disciplines de référence ({disciplines.length})</CardTitle>
          <CardDescription>
            Les profils gardent un libellé libre, mais ces valeurs sont suggérées pour harmoniser
            les règles disciplinaires entre encadreurs.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && ajouter()}
              placeholder="Ex : Sciences de l'éducation"
            />
            <Button onClick={ajouter} disabled={!nom.trim()}>
              <Plus className="size-4" />
              Ajouter
            </Button>
          </div>
          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : disciplines.length === 0 ? (
            <EmptyState icon={BookOpen} title="Aucune discipline" />
          ) : (
            <ul className="divide-y rounded-lg border">
              {disciplines.map((d) => (
                <li key={d.id} className="flex items-center justify-between px-3 py-2 text-sm">
                  {d.nom}
                  <Button size="icon" variant="ghost" className="size-7" onClick={() => supprimer(d)} aria-label={`Supprimer ${d.nom}`}>
                    <Trash2 className="size-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
