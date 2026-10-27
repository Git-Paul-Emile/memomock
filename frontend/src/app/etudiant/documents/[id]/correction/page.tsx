"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Bot, RefreshCw, Send, Wand2, User } from "lucide-react";
import { toast } from "sonner";

import { useApiResource } from "@/hooks/use-api-resource";
import { useSyncedState } from "@/hooks/use-synced-state";
import { PageHeader } from "@/components/shared/page-header";
import { ScoreJauge } from "@/components/shared/score-jauge";
import { DetailScores } from "@/components/shared/detail-scores";
import { BadgeSourceIa } from "@/components/documents/point-analyse";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { apiGet, apiList, apiPatch, apiPost } from "@/lib/api";
import { chargerContenu, chargerReferentiel, construireContexte } from "@/lib/analyse-document";
import { questionnerTuteur } from "@/lib/ia/client";
import { libelleAuteur } from "@/lib/mock-ai";
import { LIBELLE_SCORE } from "@/lib/score";
import { cn, formatDateTime } from "@/lib/utils";
import type { Analyse, DocumentSubmission, MessageCorrection } from "@/types";

interface DonneesCorrectionEtudiant {
  document: DocumentSubmission;
  messages: MessageCorrection[];
  analyses: Analyse[];
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
      const [doc, listeMessages, listeAnalyses] = await Promise.all([
        apiGet<DocumentSubmission>("documents", id),
        apiList<MessageCorrection>("messages", {
          filtres: { documentId: id },
          limite: 100,
          tri: "date",
          ordre: "asc",
        }),
        apiList<Analyse>("analyses", { filtres: { documentId: id }, limite: 10 }),
      ]);

      if (doc.statut === "analyse_terminee") {
        await apiPatch("documents", id, {
          statut: "en_correction",
          dateMaj: new Date().toISOString(),
        });
      }

      return { document: doc, messages: listeMessages.data, analyses: listeAnalyses.data };
    }
  );

  // Les messages sont dupliqués en état local pour l'affichage optimiste des nouveaux échanges ;
  // ils sont resynchronisés avec la donnée serveur à chaque nouveau chargement.
  const document = data?.document ?? null;
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
      const maintenant = new Date().toISOString();
      const messageEtudiant = await apiPost<MessageCorrection>("messages", {
        documentId: document.id,
        auteur: "etudiant",
        contenu,
        date: maintenant,
      });
      setMessages((prev) => [...prev, messageEtudiant]);

      // Le tuteur répond à partir du document, des règles de l'encadreur et des points de la
      // dernière analyse. Il ne modifie pas le score : seule une nouvelle analyse le fait
      // (spec v2, § 27).
      const [referentiel, contenuDocument] = await Promise.all([
        chargerReferentiel(document),
        chargerContenu(document.id),
      ]);
      const contexte = construireContexte(document, referentiel);
      const { resultat } = await questionnerTuteur({
        question: contenu,
        historique: messages.slice(-10).map((m) => ({
          auteur: m.auteur === "ia" ? "ia" : "etudiant",
          contenu: m.contenu,
        })),
        contexte: {
          titre: document.titre,
          typeDocument: contexte.typeDocument,
          points: (data?.analyses ?? [])
            .flatMap((a) => a.points)
            .filter((p) => p.niveau !== "succes")
            .map((p) => `${p.libelle} : ${p.detail}`),
          regles: [...contexte.reglesImposees, ...contexte.regles, ...contexte.reglesApprises],
          extrait: (contenuDocument?.texte ?? "").slice(0, 30_000),
        },
      });
      const messageIA = await apiPost<MessageCorrection>("messages", {
        documentId: document.id,
        auteur: "ia",
        contenu: resultat,
        date: new Date().toISOString(),
      });
      setMessages((prev) => [...prev, messageIA]);
    } catch {
      toast.error("Le message n'a pas pu être envoyé.");
    } finally {
      setEnvoiEnCours(false);
    }
  };

  // La soumission officielle passe par l'écran de confirmation, qui crée la version.
  const soumettreEncadreur = () => router.push(`/etudiant/documents/${id}/confirmation`);

  if (isLoading || !document) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const scoreSuffisant = document.pretPourSoumission === true;

  return (
    <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr_260px]">
      <div>
        <PageHeader
          title="Correction avec le tuteur IA"
          description={`${document.titre} - le tuteur explique les points relevés et la règle de votre encadreur qui s'applique ; il ne réécrit pas votre texte.`}
        />

        <Card className="flex h-[65vh] flex-col">
          <CardContent className="flex-1 overflow-hidden p-0">
            <ScrollArea className="h-full px-4 py-4">
              <div className="flex flex-col gap-4">
                {messages.length === 0 && (
                  <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                    Posez une question au tuteur IA, par exemple : « Pourquoi cette partie
                    n&apos;est-elle pas conforme ? », « Quelle règle de mon encadreur s&apos;applique
                    ici ? » ou « Comment améliorer mon introduction ? ».
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
            <p className="text-center text-[11px] leading-tight text-muted-foreground">
              {LIBELLE_SCORE}
            </p>
            <BadgeSourceIa source={document.sourceAnalyse} />
            <DetailScores document={document} compact />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 pt-6">
            <p className="text-sm text-muted-foreground">
              Vous avez corrigé votre document ? Réimportez-le pour une nouvelle analyse et un
              nouveau score.
            </p>
            <Button variant="outline" className="w-full" asChild>
              <Link href={`/etudiant/soumission?documentId=${document.id}`}>
                <RefreshCw className="size-4" />
                Réimporter et réanalyser
              </Link>
            </Button>
          </CardContent>
        </Card>

        {scoreSuffisant ? (
          <Card className="border-success/40 bg-success/5">
            <CardContent className="space-y-3 pt-6 text-center">
              <Wand2 className="mx-auto size-6 text-success" />
              <p className="text-sm font-medium">Prêt pour la soumission</p>
              <Button className="w-full" onClick={soumettreEncadreur}>
                Soumettre à l&apos;encadreur
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
