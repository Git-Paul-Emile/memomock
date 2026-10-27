"use client";

import * as React from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/context/auth-context";
import { useApiResource } from "@/hooks/use-api-resource";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiList, apiPatch, apiPost } from "@/lib/api";
import { cn, formatDateTime } from "@/lib/utils";
import type { DocumentSubmission, MessageProjet } from "@/types";

/**
 * Fil de discussion encadreur ↔ étudiant rattaché à un document (spec v2, § 40). Distinct du
 * tuteur IA : ici, seuls des humains échangent. Chaque message notifie l'autre partie.
 */
export function FilMessagerie({ document }: { document: DocumentSubmission }) {
  const { user } = useAuth();
  const [saisie, setSaisie] = React.useState("");
  const [envoi, setEnvoi] = React.useState(false);
  const finRef = React.useRef<HTMLDivElement>(null);

  const { data, refetch } = useApiResource<MessageProjet[]>(
    ["messages-projet", document.id],
    async () => {
      const res = await apiList<MessageProjet>("messages-projet", {
        filtres: { documentId: document.id },
        tri: "date",
        ordre: "asc",
        limite: 500,
      });
      // Les messages reçus sont marqués lus à l'ouverture du fil.
      const nonLus = res.data.filter((m) => !m.lu && m.auteurId !== user?.id);
      await Promise.all(nonLus.map((m) => apiPatch("messages-projet", m.id, { lu: true })));
      return res.data;
    },
    { enabled: !!user, refetchInterval: 15_000 }
  );
  const messages = data ?? [];

  React.useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages.length]);

  const envoyer = async () => {
    if (!user || !saisie.trim()) return;
    setEnvoi(true);
    try {
      const estEtudiant = user.id === document.etudiantId;
      const maintenant = new Date().toISOString();
      await apiPost<MessageProjet>("messages-projet", {
        documentId: document.id,
        auteurId: user.id,
        auteurRole: estEtudiant ? "etudiant" : "encadrant",
        texte: saisie.trim(),
        date: maintenant,
        lu: false,
      });
      await apiPost("notifications", {
        userId: estEtudiant ? document.encadrantId : document.etudiantId,
        titre: "Nouveau message",
        message: `${user.prenom} ${user.nom} : « ${saisie.trim().slice(0, 80)} »`,
        type: "systeme",
        lu: false,
        date: maintenant,
        lienDocumentId: document.id,
      });
      setSaisie("");
      refetch();
    } catch {
      toast.error("Le message n'a pas pu être envoyé.");
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">
            Aucun message pour l&apos;instant. Posez une question ou proposez un créneau de séance.
          </p>
        )}
        {messages.map((m) => {
          const moi = m.auteurId === user?.id;
          return (
            <div key={m.id} className={cn("flex", moi && "justify-end")}>
              <div className="max-w-[80%] space-y-1">
                <div
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm",
                    moi ? "bg-primary text-primary-foreground" : "bg-muted"
                  )}
                >
                  {m.texte}
                </div>
                <p className={cn("text-[11px] text-muted-foreground", moi && "text-right")}>
                  {m.auteurRole === "encadrant" ? "Encadreur" : "Étudiant"} · {formatDateTime(m.date)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={finRef} />
      </div>
      <div className="flex items-end gap-2 border-t p-3">
        <Textarea
          value={saisie}
          onChange={(e) => setSaisie(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void envoyer();
            }
          }}
          rows={2}
          placeholder="Votre message…"
          className="min-h-10 flex-1 resize-none"
        />
        <Button size="icon" onClick={envoyer} disabled={envoi || !saisie.trim()} aria-label="Envoyer">
          <Send className="size-4" />
        </Button>
      </div>
    </div>
  );
}
