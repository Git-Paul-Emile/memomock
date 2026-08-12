"use client";

import * as React from "react";
import Link from "next/link";
import { MessageCircleQuestion } from "lucide-react";

import { PublicHeader } from "@/components/marketing/public-header";
import { PublicFooter } from "@/components/marketing/public-footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiPublic } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { FaqEntry } from "@/types";

// Écran public A7 (spec ESPACE PUBLIC) : la FAQ elle-même vit dans /aide (écran H, réservé aux
// comptes connectés, avec formulaire de support), mais son contenu (GET /api/public/faq) est
// déjà public - cette page l'expose aux visiteurs non connectés, sans exiger de compte.
function ElementFaq({ question, reponse }: { question: string; reponse: string }) {
  const [ouvert, setOuvert] = React.useState(false);
  return (
    <div className="border-b last:border-b-0">
      <button
        type="button"
        onClick={() => setOuvert((o) => !o)}
        className="flex w-full items-center justify-between gap-3 py-3 text-left text-sm font-medium transition-colors hover:text-primary"
      >
        {question}
        <span
          className={cn(
            "shrink-0 text-muted-foreground transition-transform",
            ouvert && "rotate-45"
          )}
        >
          +
        </span>
      </button>
      {ouvert && <p className="pb-3 text-sm text-muted-foreground">{reponse}</p>}
    </div>
  );
}

export default function FaqPubliquePage() {
  const [faq, setFaq] = React.useState<FaqEntry[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    apiPublic<FaqEntry[]>("faq")
      .then(setFaq)
      .catch(() => setFaq([]))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
        <h1 className="mb-2 text-3xl font-bold tracking-tight">Questions fréquentes</h1>
        <p className="mb-8 text-muted-foreground">
          Une question sans réponse ici ?{" "}
          <Link href="/contact" className="text-primary hover:underline">
            Contactez-nous
          </Link>
          .
        </p>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageCircleQuestion className="size-4 text-primary" />
              Les réponses aux questions les plus courantes
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {isLoading ? (
              <div className="space-y-3 py-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-5 w-3/5" />
              </div>
            ) : faq.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Aucune question fréquente pour le moment.
              </p>
            ) : (
              faq.map((item) => (
                <ElementFaq key={item.id} question={item.question} reponse={item.reponse} />
              ))
            )}
          </CardContent>
        </Card>
      </main>
      <PublicFooter />
    </div>
  );
}
