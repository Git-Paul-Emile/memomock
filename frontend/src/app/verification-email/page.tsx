"use client";

import * as React from "react";
import Link from "next/link";
import { GraduationCap, Loader2, MailCheck, RefreshCw } from "lucide-react";
import { sendEmailVerification } from "@/lib/firebase";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/firebase";
import { APP_NAME } from "@/lib/constants";

/**
 * Écran « Vérification de l'email ».
 *
 * Affiché juste après l'inscription : invite l'utilisateur à consulter sa boîte mail et à
 * cliquer sur le lien de confirmation. Un bouton permet de renvoyer l'e-mail de vérification via
 * le SDK Firebase (même principe que `forgotPassword` dans le contexte d'authentification).
 * Note : contrairement au mot de passe oublié, la connexion n'est actuellement pas bloquée par
 * un e-mail non vérifié (voir README, section authentification) - cet écran reste accessible
 * mais n'est pas un point de passage obligatoire du parcours d'inscription.
 */
export default function VerificationEmailPage() {
  const [envoiEnCours, setEnvoiEnCours] = React.useState(false);
  const [renvoye, setRenvoye] = React.useState(false);

  const renvoyerEmail = async () => {
    if (!auth.currentUser) {
      toast.error("Vous devez être connecté pour renvoyer un e-mail de vérification.");
      return;
    }
    setEnvoiEnCours(true);
    try {
      await sendEmailVerification(auth.currentUser);
      setRenvoye(true);
    } catch {
      toast.error("L'envoi a échoué. Réessayez dans quelques instants.");
    } finally {
      setEnvoiEnCours(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <Link href="/" className="flex items-center justify-center gap-2 text-lg font-semibold">
          <GraduationCap className="size-6 text-primary" />
          {APP_NAME}
        </Link>

        <Card>
          <CardHeader className="items-center text-center">
            <div className="mb-2 flex size-14 items-center justify-center rounded-full bg-primary/10">
              <MailCheck className="size-7 text-primary" />
            </div>
            <CardTitle>Vérifiez votre adresse e-mail</CardTitle>
            <CardDescription>
              Nous avons envoyé un lien de confirmation à votre adresse e-mail. Cliquez dessus pour
              activer votre compte, puis revenez vous connecter.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-dashed bg-muted/40 p-4 text-center text-sm text-muted-foreground">
              Rien reçu après quelques minutes ? Pensez à vérifier vos courriers indésirables
              (spam), ou renvoyez l&apos;e-mail de vérification.
            </div>

            {renvoye && (
              <p className="text-center text-sm text-success">
                Un nouvel e-mail de vérification vient d&apos;être envoyé.
              </p>
            )}

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={renvoyerEmail}
              disabled={envoiEnCours}
            >
              {envoiEnCours ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              Renvoyer l&apos;e-mail
            </Button>

            <Button asChild className="w-full">
              <Link href="/login">J&apos;ai vérifié mon adresse</Link>
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Mauvaise adresse ?{" "}
              <Link href="/register" className="font-medium text-primary hover:underline">
                Modifier mon inscription
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
