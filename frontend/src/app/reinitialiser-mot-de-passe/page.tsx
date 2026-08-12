"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { confirmPasswordReset, verifyPasswordResetCode } from "@/lib/firebase";
import { CheckCircle2, GraduationCap, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { auth } from "@/lib/firebase";
import { messageErreurFirebase } from "@/lib/firebase-errors";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { Skeleton } from "@/components/ui/skeleton";
import { APP_NAME } from "@/lib/constants";

export default function ReinitialiserMotDePassePage() {
  return (
    <React.Suspense fallback={null}>
      <ReinitialiserMotDePasseContenu />
    </React.Suspense>
  );
}

/**
 * Firebase redirige vers cette page avec `?mode=resetPassword&oobCode=...` (voir
 * `actionCodeSettings.url` dans context/auth-context.tsx, `forgotPassword`). `oobCode` (Out Of
 * Band code) est le jeton à usage unique généré par Firebase - on ne le manipule jamais
 * nous-mêmes, on le transmet tel quel au SDK (`verifyPasswordResetCode`/`confirmPasswordReset`).
 */
function ReinitialiserMotDePasseContenu() {
  const params = useSearchParams();
  const router = useRouter();
  const oobCode = params.get("oobCode") ?? "";

  // `oobCode` est déjà connu de façon synchrone dès le premier rendu (extrait de l'URL via
  // `useSearchParams`) : son absence peut donc être détectée directement dans l'initialiseur
  // paresseux de `useState`, plutôt que d'être corrigée après coup par un `setState` dans un
  // effet (voir https://react.dev/learn/you-might-not-need-an-effect). L'effet ci-dessous ne
  // gère alors plus que le cas où `oobCode` existe réellement, en attente de la vérification
  // Firebase.
  const [verification, setVerification] = React.useState<"en_cours" | "valide" | "invalide">(() =>
    oobCode ? "en_cours" : "invalide"
  );
  const [emailCible, setEmailCible] = React.useState("");
  const [motDePasse, setMotDePasse] = React.useState("");
  const [confirmation, setConfirmation] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [reussi, setReussi] = React.useState(false);

  // Vérifie que le code est encore valide (pas expiré, pas déjà utilisé) - Firebase renvoie au
  // passage l'adresse e-mail concernée, utile pour rassurer l'utilisateur sur le compte qu'il est
  // en train de réinitialiser. Ne s'exécute que si `oobCode` est présent (le cas contraire est
  // déjà couvert par l'état initial ci-dessus).
  React.useEffect(() => {
    if (!oobCode) return;
    verifyPasswordResetCode(auth, oobCode)
      .then((email) => {
        setEmailCible(email);
        setVerification("valide");
      })
      .catch(() => setVerification("invalide"));
  }, [oobCode]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (motDePasse.length < 6) {
      toast.error("6 caractères minimum.");
      return;
    }
    if (motDePasse !== confirmation) {
      toast.error("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setIsSubmitting(true);
    try {
      await confirmPasswordReset(auth, oobCode, motDePasse);
      setReussi(true);
      toast.success("Mot de passe mis à jour.");
    } catch (err) {
      toast.error(
        messageErreurFirebase(err, "Ce lien de réinitialisation est invalide ou a expiré.")
      );
    } finally {
      setIsSubmitting(false);
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
          <CardHeader>
            <CardTitle>Réinitialiser le mot de passe</CardTitle>
            <CardDescription>
              {verification === "en_cours" && "Vérification du lien en cours…"}
              {verification === "invalide" &&
                "Ce lien de réinitialisation est invalide, expiré ou a déjà été utilisé."}
              {verification === "valide" &&
                `Choisissez un nouveau mot de passe pour ${emailCible}.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {verification === "en_cours" && (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            )}

            {verification === "valide" &&
              (reussi ? (
                <div className="flex flex-col items-center gap-3 py-4 text-center">
                  <CheckCircle2 className="size-8 text-success" />
                  <p className="text-sm text-muted-foreground">
                    Votre mot de passe a été mis à jour. Vous pouvez maintenant vous connecter.
                  </p>
                  <Button className="w-full" onClick={() => router.push("/login")}>
                    Aller à la connexion
                  </Button>
                </div>
              ) : (
                <form onSubmit={onSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="motDePasse">Nouveau mot de passe</Label>
                    <PasswordInput
                      id="motDePasse"
                      value={motDePasse}
                      onChange={(e) => setMotDePasse(e.target.value)}
                      autoComplete="new-password"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="confirmation">Confirmer le mot de passe</Label>
                    <PasswordInput
                      id="confirmation"
                      value={confirmation}
                      onChange={(e) => setConfirmation(e.target.value)}
                      autoComplete="new-password"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                    Mettre à jour le mot de passe
                  </Button>
                </form>
              ))}

            <p className="mt-4 text-center text-sm text-muted-foreground">
              <Link href="/login" className="font-medium text-primary hover:underline">
                Retour à la connexion
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
