"use client";

import * as React from "react";
import Link from "next/link";
import { GraduationCap, LifeBuoy, Loader2, Mail, MessageCircleQuestion, Send } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/context/auth-context";
import { useApiList } from "@/hooks/use-api-list";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { apiPost, apiPublic } from "@/lib/api";
import { cn, formatDateTime } from "@/lib/utils";
import { LIBELLES_STATUT_DEMANDE_SUPPORT, type DemandeSupport, type FaqEntry } from "@/types";

const VARIANT_STATUT_DEMANDE: Record<
  DemandeSupport["statut"],
  "secondary" | "warning" | "success"
> = {
  nouvelle: "secondary",
  en_cours: "warning",
  resolue: "success",
};

/**
 * Écran « Aide / Support », commun aux deux acteurs.
 * La FAQ est chargée depuis la base (endpoint public /api/public/faq) ; le formulaire de contact
 * envoie une demande au support.
 */
function ElementFaq({ question, reponse }: { question: string; reponse: string }) {
  const [ouvert, setOuvert] = React.useState(false);
  return (
    <div className="border-b last:border-b-0">
      <button
        type="button"
        onClick={() => setOuvert((o) => !o)}
        className="flex w-full items-center justify-between gap-3 py-3 text-left text-sm font-medium transition-colors hover:text-primary"
      >
        {question}
        <span
          className={cn(
            "shrink-0 text-muted-foreground transition-transform",
            ouvert && "rotate-45"
          )}
        >
          +
        </span>
      </button>
      {ouvert && <p className="pb-3 text-sm text-muted-foreground">{reponse}</p>}
    </div>
  );
}

export default function AidePage() {
  const { user } = useAuth();
  const [faq, setFaq] = React.useState<FaqEntry[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  // Pré-rempli avec l'e-mail du compte connecté tant que le visiteur n'a rien saisi lui-même -
  // dérivé au rendu plutôt que synchronisé via un effect (évite un rendu en cascade superflu).
  const [emailSaisi, setEmailSaisi] = React.useState("");
  const email = emailSaisi || user?.email || "";
  const [sujet, setSujet] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [envoiEnCours, setEnvoiEnCours] = React.useState(false);

  // Historique des demandes de l'utilisateur connecté (spec écran H20) - le backend restreint
  // déjà la liste à ses propres demandes (voir demandes-support.service#authorize.list). Cet
  // écran est toujours atteint authentifié (voir layout.tsx, SharedPageShell + RouteGuard).
  const {
    data: demandes,
    isLoading: demandesChargement,
    refetch: refetchDemandes,
  } = useApiList<DemandeSupport>("demandes-support", {
    tri: "createdAt",
    ordre: "desc",
    limite: 10,
  });

  React.useEffect(() => {
    apiPublic<FaqEntry[]>("faq")
      .then(setFaq)
      .catch(() => setFaq([]))
      .finally(() => setIsLoading(false));
  }, []);

  const envoyerDemande = async () => {
    if (!email.trim() || !sujet.trim() || !message.trim()) {
      toast.error("Merci de renseigner votre e-mail, un sujet et un message.");
      return;
    }
    setEnvoiEnCours(true);
    try {
      await apiPost("public/contact", {
        email: email.trim(),
        sujet: sujet.trim(),
        message: message.trim(),
      });
      toast.success("Votre demande a été envoyée. Nous vous répondrons sous 24 h ouvrées.");
      setSujet("");
      setMessage("");
      refetchDemandes();
    } catch {
      toast.error("L'envoi a échoué. Réessayez dans quelques instants.");
    } finally {
      setEnvoiEnCours(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Aide & support"
        description="Trouvez une réponse rapide dans la FAQ ou contactez notre équipe support."
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/tutoriels">
              <GraduationCap className="size-4" />
              Tutoriels
            </Link>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageCircleQuestion className="size-4 text-primary" />
              Questions fréquentes
            </CardTitle>
            <CardDescription>Les réponses aux questions les plus courantes.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {isLoading ? (
              <div className="space-y-3 py-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-5 w-3/5" />
              </div>
            ) : faq.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Aucune question fréquente pour le moment.
              </p>
            ) : (
              faq.map((item) => (
                <ElementFaq key={item.id} question={item.question} reponse={item.reponse} />
              ))
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <LifeBuoy className="size-4 text-primary" />
                Contacter le support
              </CardTitle>
              <CardDescription>Réponse sous 24 h ouvrées.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="email">Votre e-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmailSaisi(e.target.value)}
                  placeholder="vous@exemple.fr"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sujet">Sujet</Label>
                <Input
                  id="sujet"
                  value={sujet}
                  onChange={(e) => setSujet(e.target.value)}
                  placeholder="Ex : Problème de soumission"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Décrivez votre problème…"
                />
              </div>
              <Button className="w-full" onClick={envoyerDemande} disabled={envoiEnCours}>
                {envoiEnCours ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
                Envoyer la demande
              </Button>
              <Separator />
              <a
                href="mailto:support@memoai.fr"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
              >
                <Mail className="size-4" />
                support@memoai.fr
              </a>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Mes demandes</CardTitle>
              <CardDescription>Historique de vos demandes de support (spec H20).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {demandesChargement ? (
                <Skeleton className="h-16 w-full" />
              ) : demandes.length === 0 ? (
                <p className="py-3 text-center text-sm text-muted-foreground">
                  Aucune demande envoyée pour le moment.
                </p>
              ) : (
                demandes.map((demande) => (
                  <div key={demande.id} className="rounded-lg border p-3 text-sm">
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <p className="font-medium">{demande.sujet}</p>
                      <Badge variant={VARIANT_STATUT_DEMANDE[demande.statut]} className="shrink-0">
                        {LIBELLES_STATUT_DEMANDE_SUPPORT[demande.statut]}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(demande.createdAt)}
                    </p>
                    {demande.reponse && (
                      <p className="mt-2 border-l-2 border-primary pl-2 text-muted-foreground">
                        {demande.reponse}
                      </p>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
