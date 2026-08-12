import { PublicHeader } from "@/components/marketing/public-header";
import { PublicFooter } from "@/components/marketing/public-footer";
import { APP_NAME } from "@/lib/constants";

export default function AProposPage() {
  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 space-y-4 px-6 py-16 text-sm leading-relaxed text-muted-foreground">
        <h1 className="mb-2 text-3xl font-bold tracking-tight text-foreground">À propos</h1>
        <p>
          {APP_NAME} est une plateforme numérique d&apos;accompagnement académique assistée par
          intelligence artificielle, conçue pour améliorer et optimiser le processus de rédaction,
          de vérification et d&apos;encadrement des mémoires de Licence, mémoires de Master et
          thèses de Doctorat.
        </p>
        <p>
          Son principe directeur : « L&apos;IA prépare, l&apos;étudiant améliore, l&apos;encadreur
          décide. » L&apos;IA n&apos;a pas pour objectif de remplacer l&apos;encadreur - elle
          intervient en amont pour réduire les corrections répétitives et les problèmes de forme, et
          permet à l&apos;encadreur de concentrer son temps et son expertise sur les aspects
          scientifiques, méthodologiques et critiques qui nécessitent réellement son intervention.
        </p>
        <p>
          La valeur fondamentale du produit réside dans sa personnalisation : une IA qui ne se
          contente pas de dire si un document est « bon », mais qui cherche à déterminer s&apos;il
          est conforme aux attentes de l&apos;encadreur qui devra réellement l&apos;évaluer.
        </p>
      </main>
      <PublicFooter />
    </div>
  );
}
