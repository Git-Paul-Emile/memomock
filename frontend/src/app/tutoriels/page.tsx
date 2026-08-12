"use client";

import Link from "next/link";
import { GraduationCap, PlayCircle, Users, Building2 } from "lucide-react";

import { useAuth } from "@/context/auth-context";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Tutoriel {
  titre: string;
  description: string;
  lien: string;
}

const TUTORIELS_ETUDIANT: Tutoriel[] = [
  {
    titre: "Créer mon premier document",
    description: "Renseigner sujet, type de mémoire et discipline, puis importer votre fichier.",
    lien: "/etudiant/documents/nouveau",
  },
  {
    titre: "Comprendre mon score de conformité",
    description:
      "Forme, fond, cohérence : ce que chaque score mesure et comment le faire progresser.",
    lien: "/comment-ca-marche",
  },
  {
    titre: "Dialoguer avec le tuteur IA",
    description: "Poser une question sur une section de votre document pendant la correction.",
    lien: "/etudiant/documents",
  },
  {
    titre: "Suivre l'historique de mes versions",
    description:
      "Comparer deux versions de votre document et, si besoin, en restaurer une ancienne.",
    lien: "/etudiant/documents",
  },
];

const TUTORIELS_ENCADRANT: Tutoriel[] = [
  {
    titre: "Créer un profil méthodologique",
    description: "Un profil = un type de mémoire × une discipline, avec ses propres exigences.",
    lien: "/encadrant/profil",
  },
  {
    titre: "Configurer la grille d'évaluation",
    description: "Pondérer les critères et fixer le seuil de soumission minimal.",
    lien: "/encadrant/grille",
  },
  {
    titre: "Comprendre le jumeau numérique",
    description: "Comment l'IA apprend de vos corrections et à quel niveau adopter une règle.",
    lien: "/encadrant/jumeau-numerique",
  },
  {
    titre: "Consulter mes statistiques d'encadrement",
    description: "Temps moyen de correction, cycles de révision, score moyen par étudiant.",
    lien: "/encadrant/statistiques",
  },
];

const TUTORIELS_ADMIN: Tutoriel[] = [
  {
    titre: "Gérer les comptes",
    description: "Rechercher un utilisateur, changer son rôle ou désactiver un accès.",
    lien: "/admin/utilisateurs",
  },
  {
    titre: "Repérer les exigences divergentes",
    description: "Comparer les profils méthodologiques des encadrants sur un même type de mémoire.",
    lien: "/admin/hierarchie-regles",
  },
  {
    titre: "Suivre l'activité de la plateforme",
    description: "Statistiques par discipline, type de mémoire et encadreur.",
    lien: "/admin/statistiques",
  },
];

export default function TutorielsPage() {
  const { user } = useAuth();
  if (!user) return null;

  const tutoriels =
    user.role === "encadrant"
      ? TUTORIELS_ENCADRANT
      : user.role === "admin"
        ? TUTORIELS_ADMIN
        : TUTORIELS_ETUDIANT;
  const Icone =
    user.role === "encadrant" ? Users : user.role === "admin" ? Building2 : GraduationCap;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Tutoriels"
        description="Prise en main rapide des principales fonctionnalités de la plateforme."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {tutoriels.map((tuto) => (
          <Card key={tuto.titre}>
            <CardHeader>
              <Icone className="mb-1 size-5 text-primary" />
              <CardTitle className="text-base">{tuto.titre}</CardTitle>
              <CardDescription>{tuto.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" size="sm" asChild>
                <Link href={tuto.lien}>
                  <PlayCircle className="size-4" />
                  Ouvrir
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
