"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { AlertOctagon, ListChecks, Server, TimerReset } from "lucide-react";

import { useApiList } from "@/hooks/use-api-list";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { STATUT_FILE_LABELS } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";
import type { LogErreur, NiveauLog, StatutFile, TacheFile } from "@/types";

// `recharts` est chargé paresseusement (code-splitting) et uniquement côté client : ce
// graphique n'a pas besoin d'être présent dans le bundle initial ni rendu côté serveur.
const RepartitionChart = dynamic(
  () => import("@/components/admin/repartition-chart").then((mod) => mod.RepartitionChart),
  { ssr: false, loading: () => <Skeleton className="h-full w-full" /> }
);

const VARIANT_STATUT_FILE: Record<StatutFile, "secondary" | "warning" | "success" | "destructive"> =
  {
    en_attente: "secondary",
    en_cours: "warning",
    termine: "success",
    echec: "destructive",
  };

const VARIANT_NIVEAU_LOG: Record<NiveauLog, "outline" | "warning" | "destructive"> = {
  info: "outline",
  warning: "warning",
  error: "destructive",
};

export default function SupervisionPage() {
  const { data: taches, isLoading: chargementTaches } = useApiList<TacheFile>("files-attente", {
    tri: "createdAt",
    ordre: "desc",
    limite: 50,
  });
  const { data: logs, isLoading: chargementLogs } = useApiList<LogErreur>("logs-erreurs", {
    tri: "date",
    ordre: "desc",
    limite: 50,
  });

  const repartition = React.useMemo(() => {
    const compteurs: Record<StatutFile, number> = {
      en_attente: 0,
      en_cours: 0,
      termine: 0,
      echec: 0,
    };
    taches.forEach((t) => {
      compteurs[t.statut] += 1;
    });
    return (Object.keys(compteurs) as StatutFile[]).map((statut) => ({
      statut: STATUT_FILE_LABELS[statut],
      valeur: compteurs[statut],
    }));
  }, [taches]);

  const enEchec = taches.filter((t) => t.statut === "echec").length;
  const enCours = taches.filter((t) => t.statut === "en_cours").length;
  const erreursCritiques = logs.filter((l) => l.niveau === "error").length;

  return (
    <div>
      <PageHeader
        title="Supervision technique"
        description="Vue interne réservée à l'équipe technique : files de traitement et journal d'erreurs."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <ListChecks className="size-4" />
              Tâches suivies
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{taches.length}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <TimerReset className="size-4" />
              En cours
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{enCours}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Server className="size-4" />
              Échecs
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{enEchec}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <AlertOctagon className="size-4" />
              Erreurs critiques (log)
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{erreursCritiques}</CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Répartition des tâches par statut</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          <RepartitionChart data={repartition} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">File de traitement</CardTitle>
          </CardHeader>
          <CardContent>
            {!chargementTaches && taches.length === 0 ? (
              <EmptyState icon={ListChecks} title="Aucune tâche" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Tentatives</TableHead>
                    <TableHead>Créée</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {taches.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.type}</TableCell>
                      <TableCell>
                        <Badge variant={VARIANT_STATUT_FILE[t.statut]}>
                          {STATUT_FILE_LABELS[t.statut]}
                        </Badge>
                      </TableCell>
                      <TableCell>{t.tentatives}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDateTime(t.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Journal d&apos;erreurs</CardTitle>
          </CardHeader>
          <CardContent>
            {!chargementLogs && logs.length === 0 ? (
              <EmptyState icon={AlertOctagon} title="Aucune erreur enregistrée" />
            ) : (
              <div className="space-y-2">
                {logs.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 rounded-lg border p-3">
                    <Badge
                      variant={VARIANT_NIVEAU_LOG[log.niveau]}
                      className="mt-0.5 shrink-0 uppercase"
                    >
                      {log.niveau}
                    </Badge>
                    <div>
                      <p className="text-sm font-medium">{log.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {log.contexte} · {formatDateTime(log.date)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
