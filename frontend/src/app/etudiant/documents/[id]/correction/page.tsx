"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { Bot, Send, Wand2, User } from "lucide-react";
import { toast } from "sonner";

import { useApiResource } from "@/hooks/use-api-resource";
import { useSyncedState } from "@/hooks/use-synced-state";
import { PageHeader } from "@/components/shared/page-header";
import { ScoreJauge } from "@/components/shared/score-jauge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { apiGet, apiList, apiPatch, apiPost } from "@/lib/api";
import { libelleAuteur, progresserScore } from "@/lib/mock-ai";
import { SEUIL_SCORE_CONFORMITE } from "@/lib/constants";
import { cn, formatDateTime } from "@/lib/utils";
import type { DocumentSubmission, MessageCorrection } from "@/types";

interface DonneesCorrectionEtudiant {
  document: DocumentSubmission;
  messages: MessageCorrection[];
}

export default function CorrectionDocumentPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [saisie, setSaisie] = React.useState("");
  const [envoiEnCours, setEnvoiEnCours] = React.useState(false);
  const finDuFilRef = React.useRef<HTMLDivElement>(null);

  const { data, isLoading } = useApiResource<DonneesCorrectionEtudiant>(
    ["document-correction-etudiant", id],
    async () => {
      const [doc, listeMessages] = await Promise.all([
        apiGet<DocumentSubmission>("documents", id),
        apiList<MessageCorrection>("messages", {
          filtres: { documentId: id },
          limite: 100,
          tri: "date",
          ordre: "asc",
        }),
      ]);

      if (doc.statut === "analyse_terminee") {
        await apiPatch("documents", id, {
          statut: "en_correction",
          dateMaj: new Date().toISOString(),
        });
      }

      return { document: doc, messages: listeMessages.data };
    }
  );

  // Le document/les messages sont dupliqués en état local pour permettre les mises à jour
  // optimistes (nouveau message, score qui progresse) sans attendre un refetch réseau ; ils
  // sont resynchronisés avec la donnée serveur à chaque nouveau chargement.
  const [document, setDocument] = useSyncedState<DocumentSubmission | null>(data?.document, null);
  const [messages, setMessages] = useSyncedState<MessageCorrection[]>(data?.messages, []);

  React.useEffect(() => {
    finDuFilRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const envoyerMessage = async () => {
    if (!saisie.trim() || !document) return;
    const contenu = saisie.trim();
    setSaisie("");
    setEnvoiEnCours(true);

    try {
      // Le backend crée les deux messages (étudiant puis IA) et renvoie les deux - voir
      // POST /api/ia/tuteur (modules/ia), qui appelle un vrai LLM si disponible pour ce document,
      // avec repli automatique sur une réponse simulée sinon (voir backend/README.md).
      const { messageEtudiant, messageIA } = await apiPost<{
        messageEtudiant: MessageCorrection;
        messageIA: MessageCorrection;
      }>("ia/tuteur", { documentId: document.id, message: contenu });
      setMessages((prev) => [...prev, messageEtudiant, messageIA]);

      const nouveauScoreFond = progresserScore(document.scoreFond);
      const nouveauScoreConformite = Math.round((document.scoreForme + nouveauScoreFond) / 2);
      const docMisAJour = await apiPatch<DocumentSubmission>("documents", document.id, {
        scoreFond: nouveauScoreFond,
        scoreConformite: nouveauScoreConformite,
        dateMaj: new Date().toISOString(),
      });
      setDocument(docMisAJour);
    } catch {
      toast.error("Le message n'a pas pu être envoyé.");
    } finally {
      setEnvoiEnCours(false);
    }
  };

  const transmettreEncadrant = async () => {
    if (!document) return;
    const docMisAJour = await apiPatch<DocumentSubmission>("documents", document.id, {
      statut: "pret_pour_encadrant",
      dateMaj: new Date().toISOString(),
    });
    await apiPost("notifications", {
      userId: document.encadrantId,
      titre: "Document prêt pour relecture",
      message: `« ${document.titre} » a atteint le score de conformité requis après correction.`,
      type: "validation",
      lu: false,
      date: new Date().toISOString(),
      lienDocumentId: document.id,
    });
    setDocument(docMisAJour);
    toast.success("Document transmis à votre encadrant !");
    router.push("/etudiant/dashboard");
  };

  if (isLoading || !document) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  // Calculé côté backend (voir utils/conformite.js) : tient compte du seuil de soumission et du
  // seuil minimal par catégorie configurés sur le profil méthodologique du document, pas d'un
  // seuil unique codé en dur.
  const scoreSuffisant =
    document.pretPourSoumission ?? document.scoreConformite >= SEUIL_SCORE_CONFORMITE;

  return (
    <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr_260px]">
      <div>
        <PageHeader title="Correction interactive" description={document.titre} />

        <Card className="flex h-[65vh] flex-col">
          <CardContent className="flex-1 overflow-hidden p-0">
            <ScrollArea className="h-full px-4 py-4">
              <div className="flex flex-col gap-4">
                {messages.length === 0 && (
                  <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                    Décrivez une section de votre mémoire ou posez une question au tuteur IA pour
                    démarrer l&apos;échange.
                  </div>
                )}
                {messages.map((message) => {
                  const estEtudiant = message.auteur === "etudiant";
                  return (
                    <div
                      key={message.id}
                      className={cn("flex items-start gap-3", estEtudiant && "flex-row-reverse")}
                    >
                      <Avatar className="size-8 shrink-0">
                        <AvatarFallback>
                          {estEtudiant ? <User className="size-4" /> : <Bot className="size-4" />}
                        </AvatarFallback>
                      </Avatar>
                      <div
                        className={cn(
                          "max-w-[75%] space-y-1",
                          estEtudiant && "items-end text-right"
                        )}
                      >
                        <div
                          className={cn(
                            "rounded-lg px-3 py-2 text-sm",
                            estEtudiant ? "bg-primary text-primary-foreground" : "bg-muted"
                          )}
                        >
                          {message.contenu}
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          {libelleAuteur(message.auteur)} · {formatDateTime(message.date)}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={finDuFilRef} />
              </div>
            </ScrollArea>
          </CardContent>
          <div className="flex items-end gap-2 border-t p-3">
            <Textarea
              value={saisie}
              onChange={(e) => setSaisie(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  envoyerMessage();
                }
              }}
              placeholder="Écrivez votre message au tuteur IA…"
              className="min-h-10 flex-1 resize-none"
              rows={2}
            />
            <Button onClick={envoyerMessage} disabled={envoiEnCours || !saisie.trim()} size="icon">
              <Send className="size-4" />
            </Button>
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Score de conformité</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-3">
            <ScoreJauge score={document.scoreConformite} />
            <div className="w-full space-y-1 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>Forme</span>
                <span className="font-medium text-foreground">{document.scoreForme}</span>
              </div>
              <div className="flex justify-between">
                <span>Fond</span>
                <span className="font-medium text-foreground">{document.scoreFond}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {scoreSuffisant ? (
          <Card className="border-success/40 bg-success/5">
            <CardContent className="space-y-3 pt-6 text-center">
              <Wand2 className="mx-auto size-6 text-success" />
              <p className="text-sm font-medium">Score suffisant pour transmission</p>
              <Button className="w-full" onClick={transmettreEncadrant}>
                Transmettre à l&apos;encadrant
              </Button>
            </CardContent>
          </Card>
        ) : (
          document.pointsBloquants &&
          document.pointsBloquants.length > 0 && (
            <Card className="border-warning/40 bg-warning/5">
              <CardContent className="space-y-2 pt-6">
                <p className="text-sm font-medium">Points à corriger avant la soumission</p>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {document.pointsBloquants.map((point, i) => (
                    <li key={i}>• {point}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )
        )}
      </div>
    </div>
  );
}
