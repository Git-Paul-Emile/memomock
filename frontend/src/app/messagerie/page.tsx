"use client";

import * as React from "react";
import { MessagesSquare } from "lucide-react";

import { useAuth } from "@/context/auth-context";
import { useApiResource } from "@/hooks/use-api-resource";
import { FilMessagerie } from "@/components/documents/fil-messagerie";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiList } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { DocumentSubmission, MessageProjet, PublicUser } from "@/types";

interface Conversation {
  document: DocumentSubmission;
  interlocuteur: PublicUser | null;
  nonLus: number;
}

/**
 * Messagerie encadreur ↔ étudiant (spec v2, § 40) : une conversation par document. L'étudiant
 * voit ses mémoires, l'encadreur ceux de ses étudiants.
 */
export default function MessageriePage() {
  const { user } = useAuth();
  const [selectionId, setSelectionId] = React.useState<string | null>(null);

  const { data, isLoading } = useApiResource<Conversation[]>(
    ["messagerie", user?.id],
    async () => {
      const filtre = user!.role === "etudiant" ? { etudiantId: user!.id } : { encadrantId: user!.id };
      const [documents, messages, utilisateurs] = await Promise.all([
        apiList<DocumentSubmission>("documents", { filtres: filtre, tri: "dateMaj", ordre: "desc", limite: 200 }),
        apiList<MessageProjet>("messages-projet", { filtres: { lu: false }, limite: 1000 }),
        apiList<PublicUser>("users", { limite: 1000 }),
      ]);
      return documents.data.map((document) => {
        const autreId = user!.role === "etudiant" ? document.encadrantId : document.etudiantId;
        return {
          document,
          interlocuteur: utilisateurs.data.find((u) => u.id === autreId) ?? null,
          nonLus: messages.data.filter((m) => m.documentId === document.id && m.auteurId !== user!.id).length,
        };
      });
    },
    { enabled: !!user }
  );

  const conversations = data ?? [];
  const selection = conversations.find((c) => c.document.id === selectionId) ?? conversations[0] ?? null;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Messagerie"
        description="Échanges entre l'étudiant et son encadreur, un fil par mémoire."
      />
      {conversations.length === 0 ? (
        <EmptyState
          icon={MessagesSquare}
          title="Aucune conversation"
          description="Une conversation s'ouvre dès qu'un mémoire est rattaché à un encadreur."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-[260px_1fr]">
          <Card className="gap-0 overflow-hidden p-0">
            {conversations.map((c) => (
              <button
                key={c.document.id}
                type="button"
                onClick={() => setSelectionId(c.document.id)}
                className={cn(
                  "w-full border-b px-3 py-2.5 text-left text-sm last:border-b-0 hover:bg-accent",
                  selection?.document.id === c.document.id && "bg-accent"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium">
                    {c.interlocuteur ? `${c.interlocuteur.prenom} ${c.interlocuteur.nom}` : "-"}
                  </span>
                  {c.nonLus > 0 && <Badge className="shrink-0">{c.nonLus}</Badge>}
                </div>
                <p className="truncate text-xs text-muted-foreground">{c.document.titre}</p>
              </button>
            ))}
          </Card>
          {selection && (
            <Card className="h-[65vh] gap-0 overflow-hidden p-0">
              <div className="border-b px-4 py-3">
                <p className="text-sm font-medium">{selection.document.titre}</p>
                <p className="text-xs text-muted-foreground">
                  avec {selection.interlocuteur ? `${selection.interlocuteur.prenom} ${selection.interlocuteur.nom}` : "-"}
                </p>
              </div>
              <div className="h-[calc(65vh-57px)]">
                <FilMessagerie key={selection.document.id} document={selection.document} />
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
