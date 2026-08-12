import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { PublicHeader } from "@/components/marketing/public-header";
import { PublicFooter } from "@/components/marketing/public-footer";
import { Button } from "@/components/ui/button";

const AVANTAGES = [
  "Réduisez les corrections répétitives (orthographe, structure, bibliographie)",
  "Recevez des documents pré-analysés, prêts pour votre relecture scientifique",
  "Personnalisez l'IA selon vos exigences précises, par type de mémoire et discipline",
  "Conservez la main sur la relecture du fond et la validation finale",
  "Suivez ce que votre jumeau numérique apprend de vos corrections, et contrôlez-le",
  "Consultez vos statistiques d'encadrement (temps moyen, cycles de révision, score moyen)",
];

export default function PourEncadreursPage() {
  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
        <h1 className="mb-3 text-3xl font-bold tracking-tight">Pour les encadreurs</h1>
        <p className="mb-8 text-muted-foreground">
          MemoAssistant AI n&apos;a pas pour objectif de vous remplacer : il prépare le document en
          amont pour que vous puissiez concentrer votre temps sur ce qui compte réellement -
          l&apos;analyse scientifique et méthodologique.
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
          <Link href="/register">Créer mon compte encadrant</Link>
        </Button>
      </main>
      <PublicFooter />
    </div>
  );
}
