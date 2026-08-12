"use client";

import * as React from "react";
import Link from "next/link";
import { Bell, BellRing, CheckCheck } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/context/auth-context";
import { notificationsListeKey } from "@/hooks/use-notifications";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiList, apiPatch } from "@/lib/api";
import { cn, formatDateTime } from "@/lib/utils";
import type { Notification } from "@/types";

export default function NotificationsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = React.useState(1);
  const limite = 10;

  const { data, isLoading } = useQuery({
    queryKey: notificationsListeKey(user?.id, page, limite),
    queryFn: () =>
      apiList<Notification>("notifications", {
        filtres: { userId: user?.id },
        tri: "date",
        ordre: "desc",
        page,
        limite,
      }),
    enabled: !!user,
  });

  const notifications = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const lienPour = (notification: Notification) => {
    if (!notification.lienDocumentId || !user) return undefined;
    if (user.role === "etudiant")
      return `/etudiant/documents/${notification.lienDocumentId}/analyse`;
    if (user.role === "encadrant")
      return `/encadrant/documents/${notification.lienDocumentId}/relecture`;
    return undefined;
  };

  // Invalide toutes les requêtes sous la racine ["notifications"] : ceci rafraîchit à la fois
  // la liste ci-dessous et le compteur de non-lues affiché dans le badge de l'AppShell (voir
  // hooks/use-notifications.ts), qui partagent cette racine de clé de requête.
  const marquerLu = async (notification: Notification) => {
    if (notification.lu) return;
    await apiPatch<Notification>("notifications", notification.id, { lu: true });
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  const marquerToutLu = async () => {
    await Promise.all(
      notifications
        .filter((n) => !n.lu)
        .map((n) => apiPatch<Notification>("notifications", n.id, { lu: true }))
    );
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const nonLues = notifications.filter((n) => !n.lu).length;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Notifications"
        description="Restez informé des évolutions de vos documents."
        actions={
          nonLues > 0 && (
            <Button variant="outline" size="sm" onClick={marquerToutLu}>
              <CheckCheck className="size-4" />
              Tout marquer comme lu
            </Button>
          )
        }
      />

      {notifications.length === 0 ? (
        <EmptyState icon={Bell} title="Aucune notification" description="Vous êtes à jour !" />
      ) : (
        <Card>
          <CardContent className="divide-y p-0">
            {notifications.map((notification) => {
              const lien = lienPour(notification);
              const contenu = (
                <div
                  className={cn(
                    "flex items-start gap-3 px-4 py-3 transition-colors",
                    !notification.lu && "bg-accent/40",
                    lien && "cursor-pointer hover:bg-accent"
                  )}
                  onClick={() => marquerLu(notification)}
                >
                  <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
                    <BellRing className="size-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{notification.titre}</p>
                      {!notification.lu && (
                        <Badge variant="destructive" className="h-4 px-1.5 text-[10px]">
                          Nouveau
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{notification.message}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatDateTime(notification.date)}
                    </p>
                  </div>
                </div>
              );
              return lien ? (
                <Link key={notification.id} href={lien}>
                  {contenu}
                </Link>
              ) : (
                <div key={notification.id}>{contenu}</div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <div className="mt-4">
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          limite={limite}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
