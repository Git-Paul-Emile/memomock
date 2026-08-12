import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { PublicHeader } from "@/components/marketing/public-header";
import { PublicFooter } from "@/components/marketing/public-footer";
import { Button } from "@/components/ui/button";

const AVANTAGES = [
  "Travaillez 24/7, sans attendre un créneau avec votre encadrant",
  "Recevez un premier niveau de feedback immédiat sur la forme et le fond",
  "Comprenez précisément les attentes de votre encadrant",
  "Identifiez vos erreurs récurrentes avant de soumettre",
  "Suivez votre score de conformité et son évolution version après version",
  "Réduisez les allers-retours inutiles",
];

export default function PourEtudiantsPage() {
  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
        <h1 className="mb-3 text-3xl font-bold tracking-tight">Pour les étudiants</h1>
        <p className="mb-8 text-muted-foreground">
          Rédigez, importez, corrigez avec l&apos;aide d&apos;un tuteur IA qui connaît les exigences
          précises de votre encadrant - avant même de le solliciter.
        </p>
        <ul className="mb-10 space-y-3">
          {AVANTAGES.map((avantage) => (
            <li key={avantage} className="flex items-start gap-3 text-sm">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
              {avantage}
            </li>
          ))}
        </ul>
        <Button size="lg" asChild>
          <Link href="/register">Créer mon compte étudiant</Link>
        </Button>
      </main>
      <PublicFooter />
    </div>
  );
}
