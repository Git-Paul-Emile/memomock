"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bot,
  CheckCircle2,
  FileText,
  GraduationCap,
  MessageCircleQuestion,
  Quote,
} from "lucide-react";

import { useAuth } from "@/context/auth-context";
import { espaceParDefaut } from "@/components/layout/route-guard";
import { PublicHeader } from "@/components/marketing/public-header";
import { PublicFooter } from "@/components/marketing/public-footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiPublic } from "@/lib/api";
import { LIBELLES_TYPE_DOCUMENT, type FaqEntry, type Temoignage, type TypeDocument } from "@/types";

// A1 « Page d'accueil » (spec ESPACE PUBLIC) - contenu attendu : logo, navigation, présentation
// du produit, proposition de valeur, CTA étudiant/encadreur, fonctionnement en 4-6 étapes,
// présentation de l'IA, types de documents, avantages étudiants/encadreurs, témoignages, FAQ,
// CTA final, footer. Chaque section renvoie vers l'écran public dédié pour le détail complet.

const ETAPES = [
  "L'encadrant configure ses exigences (guides, modèles, normes, grille d'évaluation)",
  "L'étudiant rédige ou importe son document",
  "L'IA analyse la forme, le fond et la cohérence, puis propose des corrections",
  "L'étudiant révise jusqu'à atteindre le seuil de conformité requis",
  "L'encadrant relit le fond scientifique et valide",
];

const TYPES_DOCUMENTS: { type: TypeDocument; description: string }[] = [
  { type: "licence", description: "Mémoire de fin de cycle Licence, exigences allégées." },
  { type: "master", description: "Mémoire de Master, méthodologie et grille approfondies." },
  { type: "doctorat", description: "Thèse de Doctorat, exigences scientifiques renforcées." },
];

const AVANTAGES_ETUDIANTS = [
  "Un premier retour immédiat sur la forme et le fond, sans attendre un créneau",
  "Un score de conformité qui suit votre progression version après version",
  "Moins d'allers-retours inutiles avec votre encadrant",
];

const AVANTAGES_ENCADREURS = [
  "Des documents pré-analysés, prêts pour la relecture scientifique",
  "Des exigences configurées une fois, appliquées automatiquement à chaque étudiant",
  "La main gardée sur la relecture du fond et la validation finale",
];

export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [temoignages, setTemoignages] = React.useState<Temoignage[]>([]);
  const [faq, setFaq] = React.useState<FaqEntry[]>([]);

  React.useEffect(() => {
    if (!isLoading && user) {
      router.replace(espaceParDefaut(user.role));
    }
  }, [isLoading, user, router]);

  React.useEffect(() => {
    apiPublic<Temoignage[]>("temoignages")
      .then(setTemoignages)
      .catch(() => setTemoignages([]));
    apiPublic<FaqEntry[]>("faq")
      .then((entries) => setFaq(entries.slice(0, 4)))
      .catch(() => setFaq([]));
  }, []);

  // Ne bloque JAMAIS l'affichage sur `isLoading` seul : c'est l'état pendant lequel l'auth
  // résout la session côté client (localStorage, illisible en SSR) - il vaut systématiquement
  // `true` au premier rendu serveur. Gater dessus rendrait l'intégralité du contenu public de
  // cette page (spec écran A1) invisible sans JavaScript, y compris pour les moteurs de
  // recherche. On n'affiche l'écran de chargement qu'une fois `user` confirmé (redirection vers
  // son espace imminente, voir l'effet ci-dessus) : un visiteur anonyme voit le contenu
  // immédiatement, un utilisateur déjà connecté ne voit qu'un bref flash avant la redirection.
  if (user) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        Chargement…
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader />

      <main className="flex-1">
        {/* Présentation du produit + proposition de valeur + CTA étudiant/encadreur */}
        <section className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-16">
          <div className="max-w-2xl space-y-4">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Rédigez, corrigez et validez vos mémoires académiques plus sereinement.
            </h1>
            <p className="text-lg text-muted-foreground">
              MemoAssistant AI accompagne les étudiants dans la rédaction de leur mémoire grâce à
              une analyse automatique de la forme, du fond et de la cohérence, et donne aux
              encadrants une vue centralisée de la progression et de la conformité des documents
              reçus. Principe directeur : l&apos;IA prépare, l&apos;étudiant améliore,
              l&apos;encadrant décide.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button size="lg" asChild>
                <Link href="/register">Je suis étudiant(e)</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/register">Je suis encadrant(e)</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Fonctionnement en 4 à 6 étapes */}
        <section className="border-t bg-muted/30 px-6 py-16">
          <div className="mx-auto w-full max-w-3xl">
            <h2 className="mb-8 text-center text-2xl font-bold tracking-tight">
              Fonctionnement en 5 étapes
            </h2>
            <div className="space-y-3">
              {ETAPES.map((etape, index) => (
                <Card key={etape}>
                  <CardContent className="flex items-center gap-4 py-4">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {index + 1}
                    </span>
                    <p className="text-sm">{etape}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="mt-6 text-center">
              <Button variant="ghost" asChild>
                <Link href="/comment-ca-marche">Voir le détail du cycle complet →</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Présentation de l'IA */}
        <section className="px-6 py-16">
          <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4 text-center">
            <Bot className="size-10 text-primary" />
            <h2 className="text-2xl font-bold tracking-tight">
              Une IA qui prépare, pas qui décide
            </h2>
            <p className="max-w-xl text-muted-foreground">
              L&apos;IA analyse la forme, le fond et la cohérence de votre document, dialogue avec
              vous pour expliquer ses suggestions, et se personnalise selon les exigences précises
              de votre encadrant (type de document, discipline, grille d&apos;évaluation). Elle
              n&apos;attribue jamais seule de note académique officielle et ne valide jamais un
              mémoire à la place de l&apos;encadrant.
            </p>
          </div>
        </section>

        {/* Types de documents */}
        <section className="border-t bg-muted/30 px-6 py-16">
          <div className="mx-auto w-full max-w-5xl">
            <h2 className="mb-8 text-center text-2xl font-bold tracking-tight">
              Tous les types de mémoires
            </h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {TYPES_DOCUMENTS.map(({ type, description }) => (
                <Card key={type}>
                  <CardHeader>
                    <FileText className="mb-1 size-5 text-primary" />
                    <CardTitle className="text-base">{LIBELLES_TYPE_DOCUMENT[type]}</CardTitle>
                    <CardDescription>{description}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Avantages étudiants */}
        <section className="px-6 py-16">
          <div className="mx-auto grid w-full max-w-5xl gap-10 md:grid-cols-2">
            <div>
              <h2 className="mb-4 text-2xl font-bold tracking-tight">Pour les étudiants</h2>
              <ul className="space-y-3">
                {AVANTAGES_ETUDIANTS.map((avantage) => (
                  <li key={avantage} className="flex items-start gap-3 text-sm">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                    {avantage}
                  </li>
                ))}
              </ul>
              <Button variant="link" className="px-0" asChild>
                <Link href="/pour-etudiants">En savoir plus →</Link>
              </Button>
            </div>

            {/* Avantages encadreurs */}
            <div>
              <h2 className="mb-4 text-2xl font-bold tracking-tight">Pour les encadreurs</h2>
              <ul className="space-y-3">
                {AVANTAGES_ENCADREURS.map((avantage) => (
                  <li key={avantage} className="flex items-start gap-3 text-sm">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                    {avantage}
                  </li>
                ))}
              </ul>
              <Button variant="link" className="px-0" asChild>
                <Link href="/pour-encadreurs">En savoir plus →</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Témoignages */}
        {temoignages.length > 0 && (
          <section className="border-t bg-muted/30 px-6 py-16">
            <div className="mx-auto w-full max-w-5xl">
              <h2 className="mb-8 text-center text-2xl font-bold tracking-tight">
                Ce qu&apos;en disent nos utilisateurs
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {temoignages.map((temoignage) => (
                  <Card key={temoignage.id}>
                    <CardContent className="space-y-3 pt-6">
                      <Quote className="size-5 text-primary/60" />
                      <p className="text-sm text-muted-foreground">{temoignage.citation}</p>
                      <div>
                        <p className="text-sm font-medium">{temoignage.nom}</p>
                        <p className="text-xs text-muted-foreground">{temoignage.role}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* FAQ */}
        {faq.length > 0 && (
          <section className="px-6 py-16">
            <div className="mx-auto w-full max-w-2xl">
              <h2 className="mb-8 text-center text-2xl font-bold tracking-tight">
                Questions fréquentes
              </h2>
              <Card>
                <CardContent className="space-y-4 pt-6">
                  {faq.map((item) => (
                    <div key={item.id} className="flex gap-3 text-sm">
                      <MessageCircleQuestion className="mt-0.5 size-4 shrink-0 text-primary" />
                      <div>
                        <p className="font-medium">{item.question}</p>
                        <p className="text-muted-foreground">{item.reponse}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <div className="mt-6 text-center">
                <Button variant="ghost" asChild>
                  <Link href="/faq">Voir toute la FAQ →</Link>
                </Button>
              </div>
            </div>
          </section>
        )}

        {/* CTA final */}
        <section className="border-t bg-muted/30 px-6 py-16">
          <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 text-center">
            <GraduationCap className="size-10 text-primary" />
            <h2 className="text-2xl font-bold tracking-tight">Prêt(e) à commencer ?</h2>
            <p className="text-muted-foreground">
              Créez votre compte gratuitement, en tant qu&apos;étudiant ou encadreur.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button size="lg" asChild>
                <Link href="/register">Créer un compte</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/comment-ca-marche">Comment ça marche ?</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
