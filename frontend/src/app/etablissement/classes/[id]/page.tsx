"use client";

import { useParams } from "next/navigation";

import { useApiResource } from "@/hooks/use-api-resource";
import { useSyncedState } from "@/hooks/use-synced-state";
import { DetailClasse, libelleNiveauClasse } from "@/components/classes/detail-classe";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { apiGet } from "@/lib/api";
import type { Classe } from "@/types";

export default function DetailClasseEtablissementPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useApiResource<Classe>(["classe", id], () =>
    apiGet<Classe>("classes", id)
  );
  const [classe, setClasse] = useSyncedState<Classe | undefined>(data, undefined as unknown as Classe);

  if (isLoading || !classe) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={classe.nom} description={libelleNiveauClasse(classe)} />
      <DetailClasse classe={classe} onClasseMiseAJour={setClasse} />
    </div>
  );
}
