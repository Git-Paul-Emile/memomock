"use client";

import * as React from "react";
import { Loader2, Mail, Send } from "lucide-react";
import { toast } from "sonner";

import { PublicHeader } from "@/components/marketing/public-header";
import { PublicFooter } from "@/components/marketing/public-footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { apiPost } from "@/lib/api";
import type { DemandeSupport } from "@/types";

// Écran public A8 (spec ESPACE PUBLIC) : formulaire de contact accessible sans compte.
export default function ContactPage() {
  const [email, setEmail] = React.useState("");
  const [sujet, setSujet] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [envoiEnCours, setEnvoiEnCours] = React.useState(false);

  const envoyerDemande = async () => {
    if (!email.trim() || !sujet.trim() || !message.trim()) {
      toast.error("Merci de renseigner votre e-mail, un sujet et un message.");
      return;
    }
    setEnvoiEnCours(true);
    try {
      const maintenant = new Date().toISOString();
      await apiPost<DemandeSupport>("demandes-support", {
        userId: null,
        email: email.trim(),
        sujet: sujet.trim(),
        message: message.trim(),
        statut: "nouvelle",
        reponse: null,
        createdAt: maintenant,
        updatedAt: maintenant,
      });
      toast.success("Votre demande a été envoyée. Nous vous répondrons sous 24 h ouvrées.");
      setSujet("");
      setMessage("");
    } catch {
      toast.error("L'envoi a échoué. Réessayez dans quelques instants.");
    } finally {
      setEnvoiEnCours(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader />
      <main className="mx-auto w-full max-w-md flex-1 px-6 py-16">
        <h1 className="mb-2 text-3xl font-bold tracking-tight">Contact</h1>
        <p className="mb-8 text-muted-foreground">
          Une question, un problème technique, une demande de partenariat ? Écrivez-nous.
        </p>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nous contacter</CardTitle>
            <CardDescription>Réponse sous 24 h ouvrées.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="email">Votre e-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@exemple.fr"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sujet">Sujet</Label>
              <Input
                id="sujet"
                value={sujet}
                onChange={(e) => setSujet(e.target.value)}
                placeholder="Ex : Question sur l'offre établissement"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Votre message…"
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
      </main>
      <PublicFooter />
    </div>
  );
}
