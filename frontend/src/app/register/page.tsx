"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { GraduationCap, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { useAuth, CODE_PROFIL_INCOMPLET } from "@/context/auth-context";
import { espaceParDefaut, lienOnboarding } from "@/components/layout/route-guard";
import { useApiList } from "@/hooks/use-api-list";
import { messageErreurFirebase } from "@/lib/firebase-errors";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/constants";
import type { PublicUser, RoleInscription } from "@/types";

// Format international strict (ex : +221771234567) : "+" et indicatif pays obligatoires. Même
// règle que côté backend (voir backend/src/validators/auth/schemaTelephone.js).
const TELEPHONE_REGEX = /^\+[1-9]\d{7,14}$/;

// Seuls deux rôles sont proposés : la plateforme met en relation un étudiant et son encadrant,
// sans passer par une institution. `admin` n'est pas un rôle qu'on demande - voir RoleInscription.
const schemaBase = z.object({
  role: z.enum(["etudiant", "encadrant"]),
  prenom: z.string().min(2, "Prénom trop court"),
  nom: z.string().min(2, "Nom trop court"),
  email: z.string().email("Adresse e-mail invalide"),
  telephone: z.string().regex(TELEPHONE_REGEX, "Numéro invalide (format : +221771234567)"),
  motDePasse: z.string().min(6, "6 caractères minimum"),
  filiere: z.string().optional(),
  encadrantId: z.string().optional(),
});

type FormValues = z.infer<typeof schemaBase>;

export default function RegisterPage() {
  const { register: creerCompte } = useAuth();
  const router = useRouter();
  const [role, setRole] = React.useState<RoleInscription>("etudiant");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  
  // Endpoint public dédié (voir backend/src/modules/public) : accessible avant même la création
  // du compte, contrairement à /users qui est protégé.
  const { data: encadrants } = useApiList<PublicUser>("public/encadrants", { limite: 100 });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schemaBase),
    defaultValues: { role: "etudiant" },
  });

  const encadrantId = watch("encadrantId");
  const telephone = watch("telephone");

  const onSubmit = async (values: FormValues) => {
    if (role === "etudiant" && !values.encadrantId) {
      toast.error("Merci de sélectionner votre encadrant.");
      return;
    }
    setIsSubmitting(true);
    try {
      const user = await creerCompte({ ...values, role });
      toast.success(`Compte créé, bienvenue ${user.prenom} !`);
      router.push(lienOnboarding(user.role) ?? espaceParDefaut(user.role));
    } catch (err) {
      toast.error(messageErreurFirebase(err, "Impossible de créer le compte."));
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
            <CardTitle>Créer un compte</CardTitle>
            <CardDescription>Choisissez votre profil pour commencer.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-5 grid grid-cols-2 gap-2">
              {(["etudiant", "encadrant"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    setRole(r);
                    setValue("role", r);
                  }}
                  className={cn(
                    "rounded-md border px-2 py-2 text-xs font-medium transition-colors sm:text-sm",
                    role === r
                      ? "border-primary bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent"
                  )}
                >
                  {r === "etudiant" ? "Étudiant·e" : "Encadrant·e"}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="prenom">Prénom</Label>
                  <Input id="prenom" aria-invalid={!!errors.prenom} {...register("prenom")} />
                  {errors.prenom && (
                    <p className="text-xs text-destructive">{errors.prenom.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="nom">Nom</Label>
                  <Input id="nom" aria-invalid={!!errors.nom} {...register("nom")} />
                  {errors.nom && <p className="text-xs text-destructive">{errors.nom.message}</p>}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">Adresse e-mail</Label>
                <Input
                  id="email"
                  type="email"
                  aria-invalid={!!errors.email}
                  {...register("email")}
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="telephone">Numéro de téléphone</Label>
                <Input
                  id="telephone"
                  placeholder="+221771234567"
                  aria-invalid={!!errors.telephone}
                  {...register("telephone")}
                />
                {errors.telephone && (
                  <p className="text-xs text-destructive">{errors.telephone.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="motDePasse">Mot de passe</Label>
                <PasswordInput
                  id="motDePasse"
                  aria-invalid={!!errors.motDePasse}
                  {...register("motDePasse")}
                />
                {errors.motDePasse && (
                  <p className="text-xs text-destructive">{errors.motDePasse.message}</p>
                )}
              </div>

              {role === "etudiant" && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="filiere">Filière (facultatif)</Label>
                    <Input
                      id="filiere"
                      placeholder="Ex : Master 2 Informatique"
                      {...register("filiere")}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Encadrant·e</Label>
                    <Select value={encadrantId} onValueChange={(v) => setValue("encadrantId", v)}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Sélectionnez votre encadrant" />
                      </SelectTrigger>
                      <SelectContent>
                        {encadrants.map((e) => (
                          <SelectItem key={e.id} value={e.id}>
                            {e.prenom} {e.nom}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            <p className="mt-2 text-center text-xs text-muted-foreground">
              
            </p>

            <p className="mt-4 text-center text-sm text-muted-foreground">
              Déjà un compte ?{" "}
              <Link href="/login" className="font-medium text-primary hover:underline">
                Se connecter
              </Link>
            </p>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              En créant un compte, vous acceptez notre{" "}
              <Link href="/confidentialite" className="hover:underline">
                politique de confidentialité
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
