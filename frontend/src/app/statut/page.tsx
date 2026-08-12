"use client";

import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

import { PublicHeader } from "@/components/marketing/public-header";
import { PublicFooter } from "@/components/marketing/public-footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { API_HEALTH_URL } from "@/lib/api";

// Interroge directement `GET /api/health` (hors /v1, hors enveloppe {success,data} standard) :
// un vrai statut, jamais une page statique "tout va bien" qui mentirait en cas d'incident réel.
// Spec écran A13 : 3 indicateurs distincts (IA disponible / analyse documentaire disponible /
// plateforme disponible), pas un seul statut global - voir backend/src/app.js.
interface SanteApi {
  statut: string;
  plateforme: boolean;
  analyseDocumentaire: boolean;
  // "degrade" : une clé de modèle est bien configurée, mais le dernier appel au fournisseur a
  // échoué (quota, panne, réseau) - l'application sert alors du contenu de repli. Voir
  // backend/src/lib/llm/sante-llm.js.
  ia: { disponible: boolean; mode: "reel" | "simule" | "degrade"; detail?: string };
}

const PRECISION_MODE_IA: Record<SanteApi["ia"]["mode"], string> = {
  reel: "Modèle réel configuré",
  simule: "Mode simulé (aucune clé de modèle configurée)",
  degrade: "Service dégradé - les analyses proviennent actuellement du contenu de repli",
};

async function verifierSante(): Promise<SanteApi> {
  const res = await fetch(API_HEALTH_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`Réponse ${res.status}`);
  return res.json();
}

function IndicateurStatut({
  libelle,
  precision,
  disponible,
}: {
  libelle: string;
  precision?: string;
  disponible: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b py-3 last:border-b-0">
      <div>
        <p className="text-sm font-medium">{libelle}</p>
        {precision && <p className="text-xs text-muted-foreground">{precision}</p>}
      </div>
      {disponible ? (
        <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="size-4" />
          Opérationnel
        </div>
      ) : (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <XCircle className="size-4" />
          Indisponible
        </div>
      )}
    </div>
  );
}

export default function StatutPage() {
  const { data, isPending, isError, dataUpdatedAt } = useQuery({
    queryKey: ["statut-service"],
    queryFn: verifierSante,
    retry: 1,
    refetchInterval: 30_000,
  });

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
        <h1 className="mb-2 text-3xl font-bold tracking-tight">Statut du service</h1>
        <p className="mb-8 text-sm text-muted-foreground">
          Vérification en direct de la disponibilité de MemoAssistant AI (actualisée automatiquement
          toutes les 30 secondes).
        </p>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Composants du service</CardTitle>
          </CardHeader>
          <CardContent>
            {isPending ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Vérification en cours…
              </div>
            ) : isError || !data ? (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <XCircle className="size-4" />
                Plateforme injoignable
              </div>
            ) : (
              <div>
                <IndicateurStatut libelle="Plateforme" disponible={data.plateforme} />
                <IndicateurStatut
                  libelle="Analyse documentaire"
                  precision="Base de données et pipeline d'analyse"
                  disponible={data.analyseDocumentaire}
                />
                <IndicateurStatut
                  libelle="Intelligence artificielle"
                  precision={[PRECISION_MODE_IA[data.ia.mode], data.ia.detail]
                    .filter(Boolean)
                    .join(" - ")}
                  disponible={data.ia.disponible}
                />
              </div>
            )}
            {dataUpdatedAt > 0 && (
              <p className="mt-3 text-xs text-muted-foreground">
                Dernière vérification : {new Date(dataUpdatedAt).toLocaleTimeString("fr-FR")}
              </p>
            )}
          </CardContent>
        </Card>
      </main>
      <PublicFooter />
    </div>
  );
}
