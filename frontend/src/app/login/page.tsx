"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { GraduationCap, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";

import { useAuth, CODE_PROFIL_INCOMPLET } from "@/context/auth-context";
import { espaceParDefaut } from "@/components/layout/route-guard";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { Separator } from "@/components/ui/separator";
import { APP_NAME } from "@/lib/constants";

const schema = z.object({
  email: z.string().email("Adresse e-mail invalide"),
  motDePasse: z.string().min(1, "Le mot de passe est requis"),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const { login, forgotPassword } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  
  const [oubliOuvert, setOubliOuvert] = React.useState(false);
  const [oubliEmail, setOubliEmail] = React.useState("");
  const [oubliEnCours, setOubliEnCours] = React.useState(false);
  const [oubliEnvoye, setOubliEnvoye] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      const user = await login(values.email, values.motDePasse);
      toast.success(`Bienvenue, ${user.prenom} !`);
      router.push(espaceParDefaut(user.role));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Adresse e-mail ou mot de passe incorrect.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!oubliEmail.trim()) return;
    setOubliEnCours(true);
    try {
      await forgotPassword(oubliEmail.trim());
      setOubliEnvoye(true);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Impossible d'envoyer l'e-mail pour le moment.");
    } finally {
      setOubliEnCours(false);
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
            <CardTitle>Connexion</CardTitle>
            <CardDescription>Accédez à votre espace étudiant ou encadrant.</CardDescription>
          </CardHeader>
          <CardContent>

            <div className="my-4 flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="text-xs text-muted-foreground">ou avec votre e-mail</span>
              <Separator className="flex-1" />
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Adresse e-mail</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="prenom.nom@exemple.fr"
                  aria-invalid={!!errors.email}
                  {...register("email")}
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="motDePasse">Mot de passe</Label>
                  <button
                    type="button"
                    onClick={() => setOubliOuvert(true)}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Mot de passe oublié ?
                  </button>
                </div>
                <PasswordInput
                  id="motDePasse"
                  autoComplete="current-password"
                  aria-invalid={!!errors.motDePasse}
                  {...register("motDePasse")}
                />
                {errors.motDePasse && (
                  <p className="text-xs text-destructive">{errors.motDePasse.message}</p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                Se connecter
              </Button>
            </form>

            <p className="mt-4 text-center text-sm text-muted-foreground">
              Pas encore de compte ?{" "}
              <Link href="/register" className="font-medium text-primary hover:underline">
                Créer un compte
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={oubliOuvert}
        onOpenChange={(open) => {
          setOubliOuvert(open);
          if (!open) {
            setOubliEnvoye(false);
            setOubliEmail("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mot de passe oublié</DialogTitle>
            <DialogDescription>
              Indiquez votre adresse e-mail : nous vous envoyons un lien de réinitialisation.
            </DialogDescription>
          </DialogHeader>

          {oubliEnvoye ? (
            <div className="flex flex-col items-center gap-2 py-4 text-center">
              <Mail className="size-8 text-success" />
              <p className="text-sm font-medium">E-mail envoyé</p>
              <p className="text-sm text-muted-foreground">
                Si un compte existe pour {oubliEmail}, un lien de réinitialisation vient de lui être
                envoyé. Pensez à vérifier vos courriers indésirables.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="oubli-email">Adresse e-mail</Label>
                <Input
                  id="oubli-email"
                  type="email"
                  value={oubliEmail}
                  onChange={(e) => setOubliEmail(e.target.value)}
                  placeholder="prenom.nom@exemple.fr"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOubliOuvert(false)}>
                  Annuler
                </Button>
                <Button
                  onClick={handleForgotPassword}
                  disabled={oubliEnCours || !oubliEmail.trim()}
                >
                  {oubliEnCours && <Loader2 className="size-4 animate-spin" />}
                  Envoyer le lien
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
