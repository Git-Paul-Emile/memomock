import { Check } from "lucide-react";

import { PublicHeader } from "@/components/marketing/public-header";
import { PublicFooter } from "@/components/marketing/public-footer";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const OFFRES = [
  {
    nom: "Étudiant",
    description: "Pour rédiger et faire analyser son mémoire.",
    fonctionnalites: [
      "Import et analyse illimités",
      "Tuteur IA conversationnel",
      "Suivi du score de conformité",
      "Export Word/PDF",
    ],
  },
  {
    nom: "Encadrant",
    description: "Pour accompagner ses étudiants.",
    fonctionnalites: [
      "Profils méthodologiques illimités",
      "Grille d'évaluation personnalisée",
      "Jumeau numérique (règles apprises)",
      "Statistiques d'encadrement",
    ],
  },
];

export default function TarificationPage() {
  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-16">
        <div className="mb-10 text-center">
          <h1 className="mb-2 text-3xl font-bold tracking-tight">Tarification</h1>
          <p className="text-muted-foreground">
            MemoAssistant AI est actuellement un projet académique, à accès gratuit.
          </p>
          <Badge variant="outline" className="mt-3">
            Offres indicatives - évolution possible vers un modèle SaaS
          </Badge>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {OFFRES.map((offre) => (
            <Card key={offre.nom}>
              <CardHeader>
                <CardTitle className="text-base">{offre.nom}</CardTitle>
                <CardDescription>{offre.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {offre.fonctionnalites.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                      {f}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
