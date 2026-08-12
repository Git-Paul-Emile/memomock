import * as React from "react";
import { ArrowDown } from "lucide-react";

import { PublicHeader } from "@/components/marketing/public-header";
import { PublicFooter } from "@/components/marketing/public-footer";
import { Card, CardContent } from "@/components/ui/card";

const ETAPES = [
  "L'encadrant configure ses exigences (guides, modèles, normes, grille d'évaluation)",
  "L'étudiant rédige ou importe son document",
  "L'IA analyse la forme, le fond et la cohérence",
  "L'étudiant corrige, avec l'aide du tuteur IA",
  "Un score de conformité mesure la progression",
  "Le document est transmis à l'encadrant une fois le seuil atteint",
  "L'encadrant corrige et valide le fond scientifique",
  "L'étudiant révise si nécessaire, jusqu'à validation finale",
];

export default function CommentCaMarchePage() {
  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
        <h1 className="mb-3 text-3xl font-bold tracking-tight">Comment ça marche ?</h1>
        <p className="mb-10 text-muted-foreground">
          MemoAssistant AI se positionne comme un intermédiaire intelligent entre l&apos;étudiant et
          l&apos;encadrant : l&apos;IA prépare, l&apos;étudiant améliore, l&apos;encadrant décide.
        </p>

        <div className="space-y-3">
          {ETAPES.map((etape, index) => (
            <React.Fragment key={etape}>
              <Card>
                <CardContent className="flex items-center gap-4 py-4">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {index + 1}
                  </span>
                  <p className="text-sm">{etape}</p>
                </CardContent>
              </Card>
              {index < ETAPES.length - 1 && (
                <div className="flex justify-center">
                  <ArrowDown className="size-4 text-muted-foreground" />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
