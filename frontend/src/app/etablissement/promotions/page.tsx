"use client";

import * as React from "react";
import Link from "next/link";
import { CalendarDays, CalendarRange, Plus, Power, Users } from "lucide-react";
import { toast } from "sonner";

import { useApiResource } from "@/hooks/use-api-resource";
import { useMonEtablissement, usePromotions } from "@/hooks/use-etablissement";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiList, apiPatch } from "@/lib/api";
import { periodePromotion } from "@/lib/etablissement";
import { LIBELLES_STATUT_PROMOTION } from "@/types";
import type { Classe, Promotion, PublicUser } from "@/types";

/**
 * Effectifs d'une promotion. Calculés en deux requêtes (classes + étudiants de
 * l'établissement) puis agrégés côté client, plutôt qu'une requête par promotion (N+1).
 */
interface EffectifsPromotion {
  classes: number;
  apprenants: number;
}

function useEffectifsParPromotion(etablissementId?: string) {
  const { data, isLoading } = useApiResource<Map<string, EffectifsPromotion>>(
    ["effectifs-promotions", etablissementId],
    async () => {
      const [classesRes, etudiantsRes] = await Promise.all([
        apiList<Classe>("classes", {
          filtres: { etablissementId },
          limite: 200,
        }),
        apiList<PublicUser>("users", {
          filtres: { etablissementId, role: "etudiant" },
          limite: 500,
        }),
      ]);

      const promotionParClasse = new Map<string, string>();
      const effectifs = new Map<string, EffectifsPromotion>();

      for (const classe of classesRes.data) {
        if (!classe.promotionId) continue;
        promotionParClasse.set(classe.id, classe.promotionId);
        const courant = effectifs.get(classe.promotionId) ?? {
          classes: 0,
          apprenants: 0,
        };
        effectifs.set(classe.promotionId, {
          ...courant,
          classes: courant.classes + 1,
        });
      }

      for (const etudiant of etudiantsRes.data) {
        const promotionId = etudiant.classeId ? promotionParClasse.get(etudiant.classeId) : null;
        if (!promotionId) continue;
        const courant = effectifs.get(promotionId) ?? {
          classes: 0,
          apprenants: 0,
        };
        effectifs.set(promotionId, {
          ...courant,
          apprenants: courant.apprenants + 1,
        });
      }

      return effectifs;
    },
    { enabled: !!etablissementId }
  );

  return {
    effectifs: data ?? new Map<string, EffectifsPromotion>(),
    isLoading,
  };
}

/** Liste des années académiques d'un établissement (spec section 10). */
export default function PromotionsPage() {
  const { etablissement, isLoading: chargementEtab } = useMonEtablissement();
  const {
    promotions,
    promotionActive,
    isLoading: chargementPromotions,
    refetch,
  } = usePromotions(etablissement?.id);
  const { effectifs } = useEffectifsParPromotion(etablissement?.id);
  const [enCours, setEnCours] = React.useState<string | null>(null);

  /**
   * Une seule promotion active à la fois : on archive l'ancienne AVANT d'activer la nouvelle.
   * Les deux écritures n'étant pas transactionnelles, l'ordre compte - si la seconde requête
   * échoue, on se retrouve sans promotion active (état dégradé mais cohérent) plutôt qu'avec
   * deux promotions actives (état ambigu que les tableaux de bord ne sauraient pas départager).
   */
  const activer = async (promotion: Promotion) => {
    if (promotion.statut === "active") return;
    setEnCours(promotion.id);
    try {
      if (promotionActive && promotionActive.id !== promotion.id) {
        await apiPatch<Promotion>("promotions", promotionActive.id, {
          statut: "archivee",
        });
      }
      await apiPatch<Promotion>("promotions", promotion.id, {
        statut: "active",
      });
      refetch();
      toast.success(`Promotion ${promotion.libelle} activée.`);
    } catch {
      toast.error("L'activation a échoué.");
    } finally {
      setEnCours(null);
    }
  };

  if (chargementEtab || chargementPromotions) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Promotions"
        description="Gérez les années académiques de votre établissement."
        actions={
          <Button size="sm" asChild>
            <Link href="/etablissement/promotions/nouvelle">
              <Plus className="size-4" />
              Nouvelle promotion
            </Link>
          </Button>
        }
      />

      {promotions.length === 0 ? (
        <EmptyState
          icon={CalendarRange}
          title="Aucune promotion"
          description="Créez une première année académique pour y rattacher vos classes."
          action={
            <Button size="sm" asChild>
              <Link href="/etablissement/promotions/nouvelle">Créer une promotion</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {promotions.map((promotion) => {
            const estActive = promotion.statut === "active";
            const effectif = effectifs.get(promotion.id) ?? {
              classes: 0,
              apprenants: 0,
            };

            return (
              <Card key={promotion.id} className={estActive ? "border-primary" : undefined}>
                <CardContent className="space-y-4 pt-6">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">Promotion {promotion.libelle}</p>
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <CalendarDays className="size-3.5" />
                        {periodePromotion(promotion)}
                      </p>
                    </div>
                    <Badge variant={estActive ? "success" : "outline"}>
                      {LIBELLES_STATUT_PROMOTION[promotion.statut]}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-4 border-t pt-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Users className="size-4" />
                      {effectif.apprenants} apprenant
                      {effectif.apprenants > 1 ? "s" : ""}
                    </span>
                    <span>
                      {effectif.classes} classe{effectif.classes > 1 ? "s" : ""}
                    </span>
                  </div>

                  <Button
                    variant={estActive ? "outline" : "secondary"}
                    size="sm"
                    className="w-full"
                    disabled={estActive || enCours !== null}
                    onClick={() => activer(promotion)}
                    title={
                      estActive
                        ? "Une promotion doit rester active"
                        : "Faire de cette promotion l'année académique courante"
                    }
                  >
                    <Power className="size-4" />
                    {estActive ? "Année académique courante" : "Activer cette promotion"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
