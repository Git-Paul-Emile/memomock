"use client";

import { CalendarClock } from "lucide-react";

import { useAuth } from "@/context/auth-context";
import { useApiList } from "@/hooks/use-api-list";
import { useApiResource } from "@/hooks/use-api-resource";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiGet, apiList } from "@/lib/api";
import { joursRestants, partitionnerSeances } from "@/lib/retards";
import { formatDate, formatDateTime } from "@/lib/utils";
import type { ChapitreCanevas, DocumentSubmission, ProfilEncadrant, Seance } from "@/types";

interface Echeance {
  libelle: string;
  dateEcheance: string;
  type: "livrable" | "chapitre";
}

/** Calendrier de suivi de l'étudiant (spec section 72) : séances et échéances à venir. */
export default function PlanningEtudiantPage() {
  const { user } = useAuth();

  const { data: seances, isLoading: chargementSeances } = useApiList<Seance>("seances", {
    filtres: { etudiantId: user?.id },
    tri: "dateHeure",
    ordre: "asc",
    limite: 100,
  });

  const { data: documents } = useApiList<DocumentSubmission>("documents", {
    tri: "dateMaj",
    ordre: "desc",
    limite: 1,
    filtres: { etudiantId: user?.id },
  });
  const document = documents[0] ?? null;

  const { data: echeances, isLoading: chargementEcheances } = useApiResource<Echeance[]>(
    ["planning-echeances", document?.id],
    async () => {
      if (!document?.profilEncadrantId) return [];
      const profil = await apiGet<ProfilEncadrant>("profils-encadrant", document.profilEncadrantId).catch(
        () => null
      );
      if (!profil) return [];
      const resultat: Echeance[] = [];
      for (const l of profil.livrablesAttendus) {
        if (l.dateEcheance) resultat.push({ libelle: l.nom, dateEcheance: l.dateEcheance, type: "livrable" });
      }
      if (profil.canevasId) {
        const chapitresRes = await apiList<ChapitreCanevas>("chapitres-canevas", {
          filtres: { canevasId: profil.canevasId },
          limite: 100,
        });
        for (const c of chapitresRes.data) {
          if (c.dateEcheance) resultat.push({ libelle: c.titre, dateEcheance: c.dateEcheance, type: "chapitre" });
        }
      }
      return resultat.sort((a, b) => a.dateEcheance.localeCompare(b.dateEcheance));
    },
    { enabled: !!document }
  );

  const { aVenir: seancesAVenir, passees: seancesPassees } = partitionnerSeances(seances ?? []);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Planning"
        description="Vos prochaines séances de suivi et échéances à venir."
      />

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Séances</CardTitle>
            <CardDescription>Planifiées par votre encadrant.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {chargementSeances ? (
              <Skeleton className="h-24 w-full" />
            ) : seancesAVenir.length === 0 && seancesPassees.length === 0 ? (
              <EmptyState
                icon={CalendarClock}
                title="Aucune séance planifiée"
                description="Votre encadrant n'a pas encore programmé de séance de suivi."
              />
            ) : (
              <>
                {seancesAVenir.map((s) => (
                  <div key={s.id} className="rounded-lg border p-3">
                    <p className="text-sm font-medium">{s.titre}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(s.dateHeure)}</p>
                    {s.tache && <p className="text-xs text-muted-foreground">Tâche : {s.tache}</p>}
                  </div>
                ))}
                {seancesPassees.map((s) => (
                  <div key={s.id} className="flex items-center justify-between rounded-lg border p-3 opacity-70">
                    <div>
                      <p className="text-sm font-medium">{s.titre}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(s.dateHeure)}</p>
                    </div>
                    <Badge variant={s.statut === "effectuee" ? "success" : "outline"}>
                      {s.statut === "effectuee" ? "Effectuée" : s.statut === "annulee" ? "Annulée" : "Non effectuée"}
                    </Badge>
                  </div>
                ))}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Échéances</CardTitle>
            <CardDescription>Livrables et chapitres attendus, par date limite.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {chargementEcheances ? (
              <Skeleton className="h-16 w-full" />
            ) : !echeances || echeances.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune échéance définie pour l&apos;instant.</p>
            ) : (
              echeances.map((e) => {
                const jours = joursRestants(e.dateEcheance);
                return (
                  <div key={`${e.type}-${e.libelle}`} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="text-sm font-medium">{e.libelle}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(e.dateEcheance)}</p>
                    </div>
                    <Badge variant={jours < 0 ? "destructive" : jours <= 7 ? "warning" : "outline"}>
                      {jours < 0 ? "Dépassée" : jours === 0 ? "Aujourd'hui" : `J-${jours}`}
                    </Badge>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
