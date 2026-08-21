"use client";

import Link from "next/link";
import { Building2, CheckCircle2, FileText, GitBranch, Users } from "lucide-react";

import { useAuth } from "@/context/auth-context";
import { useApiResource } from "@/hooks/use-api-resource";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiList } from "@/lib/api";
import type { Classe, DocumentSubmission, Etablissement, Filiere, PublicUser } from "@/types";

interface DonneesTableauBord {
  etablissement: Etablissement | null;
  nbFilieres: number;
  nbClasses: number;
  nbEncadrants: number;
  nbEtudiants: number;
  nbMemoiresEnCours: number;
  nbMemoiresValidees: number;
}

/** Tableau de bord "mode établissement" (spec section 94) : vue d'ensemble de l'espace créé. */
export default function EtablissementDashboardPage() {
  const { user } = useAuth();

  const { data, isLoading } = useApiResource<DonneesTableauBord>(
    ["etablissement-dashboard", user?.id],
    async () => {
      const etabRes = await apiList<Etablissement>("etablissements", {
        filtres: { adminId: user!.id },
        limite: 1,
      });
      const etablissement = etabRes.data[0] ?? null;
      if (!etablissement) {
        return {
          etablissement: null,
          nbFilieres: 0,
          nbClasses: 0,
          nbEncadrants: 0,
          nbEtudiants: 0,
          nbMemoiresEnCours: 0,
          nbMemoiresValidees: 0,
        };
      }

      const [filieresRes, classesRes, etudiantsRes] = await Promise.all([
        apiList<Filiere>("filieres", { filtres: { etablissementId: etablissement.id }, limite: 200 }),
        apiList<Classe>("classes", { filtres: { etablissementId: etablissement.id }, limite: 200 }),
        apiList<PublicUser>("users", {
          filtres: { etablissementId: etablissement.id, role: "etudiant" },
          limite: 500,
        }),
      ]);

      const encadrantIds = new Set(classesRes.data.flatMap((c) => c.encadrantIds));
      const etudiantIds = new Set(etudiantsRes.data.map((e) => e.id));

      let nbMemoiresEnCours = 0;
      let nbMemoiresValidees = 0;
      if (etudiantIds.size > 0) {
        const documentsRes = await apiList<DocumentSubmission>("documents", { limite: 500 });
        for (const doc of documentsRes.data) {
          if (!etudiantIds.has(doc.etudiantId)) continue;
          if (doc.statut === "valide") nbMemoiresValidees += 1;
          else nbMemoiresEnCours += 1;
        }
      }

      return {
        etablissement,
        nbFilieres: filieresRes.total,
        nbClasses: classesRes.total,
        nbEncadrants: encadrantIds.size,
        nbEtudiants: etudiantsRes.total,
        nbMemoiresEnCours,
        nbMemoiresValidees,
      };
    },
    { enabled: !!user }
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!data?.etablissement) {
    return (
      <EmptyState
        icon={Building2}
        title="Établissement introuvable"
        description="Votre compte n'est rattaché à aucun établissement pour l'instant."
      />
    );
  }

  const cartes = [
    { titre: "Filières", valeur: data.nbFilieres, icon: GitBranch, href: "/etablissement/filieres" },
    { titre: "Classes", valeur: data.nbClasses, icon: Users, href: "/etablissement/classes" },
    { titre: "Encadreurs rattachés", valeur: data.nbEncadrants, icon: Users, href: "/etablissement/classes" },
    { titre: "Étudiants rattachés", valeur: data.nbEtudiants, icon: Users, href: "/etablissement/classes" },
    { titre: "Mémoires en cours", valeur: data.nbMemoiresEnCours, icon: FileText, href: null },
    { titre: "Mémoires validés", valeur: data.nbMemoiresValidees, icon: CheckCircle2, href: null },
  ];

  return (
    <div>
      <PageHeader
        title={data.etablissement.nom}
        description="Vue d'ensemble de votre espace établissement."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cartes.map((c) => (
          <Card key={c.titre}>
            <CardHeader className="flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.titre}</CardTitle>
              <c.icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{c.valeur}</p>
              {c.href && (
                <Button variant="link" size="sm" className="h-auto p-0" asChild>
                  <Link href={c.href}>Gérer →</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      {data.nbClasses === 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Pour commencer</CardTitle>
            <CardDescription>
              Créez une filière, puis une classe, pour obtenir un code que vos étudiants pourront
              utiliser afin de rejoindre automatiquement le bon espace.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button asChild size="sm">
              <Link href="/etablissement/filieres">Créer une filière</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/etablissement/classes">Créer une classe</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
