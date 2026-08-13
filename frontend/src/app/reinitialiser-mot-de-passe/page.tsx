"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GraduationCap, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/context/auth-context";
import { espaceParDefaut } from "@/components/layout/route-guard";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { APP_NAME } from "@/lib/constants";

export default function ReinitialiserMotDePassePage() {
  const [motDePasse, setMotDePasse] = React.useState("");
  const [confirmation, setConfirmation] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [reussi, setReussi] = React.useState(false);
  const { user } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!user) {
      router.replace("/login");
    }
  }, [user, router]);

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
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/users/${user!.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: motDePasse }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new ApiError(body?.message ?? "Impossible de mettre à jour le mot de passe.", res.status);
      }
      setReussi(true);
      toast.success("Mot de passe mis à jour.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Ce lien de réinitialisation est invalide ou a expiré.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

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
              Choisissez un nouveau mot de passe pour {user.email}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {reussi ? (
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <p className="text-sm text-success font-medium">Mot de passe mis à jour.</p>
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
            )}

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
