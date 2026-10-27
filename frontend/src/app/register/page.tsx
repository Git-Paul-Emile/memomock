"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { GraduationCap, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/context/auth-context";
import { espaceParDefaut, lienOnboarding } from "@/components/layout/route-guard";
import { useApiList } from "@/hooks/use-api-list";
import { apiPatch, apiPost, ApiError } from "@/lib/api";
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
import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/constants";
import { PAYS_PAR_DEFAUT, trouverPays } from "@/lib/afrique";
import { SelectPays } from "@/components/shared/select-pays";
import { CodeInvalideError, utiliserCode } from "@/lib/invitations";
import type { EncadrantPublic, Etablissement, RoleInscription } from "@/types";

// Format international strict (ex : +221771234567) : "+" et indicatif pays obligatoires.
const TELEPHONE_REGEX = /^\+[1-9]\d{7,14}$/;
const INDICATIF_REGEX = /^\+\d{1,3}$/;

// Trois rôles auto-inscriptibles : étudiant, encadrant, et administrateur d'établissement (une
// école crée elle-même son espace, spec section 6). `admin` (super-admin plateforme) n'est pas un
// rôle qu'on demande - voir RoleInscription.
const schemaBase = z.object({
  role: z.enum(["etudiant", "encadrant", "admin_etablissement"]),
  prenom: z.string().min(2, "Prénom trop court"),
  nom: z.string().min(2, "Nom trop court"),
  email: z.string().email("Adresse e-mail invalide"),
  pays: z.string().min(2, "Choisissez votre pays"),
  telephone: z.string().regex(TELEPHONE_REGEX, "Numéro invalide (format : +221771234567)"),
  motDePasse: z.string().min(6, "6 caractères minimum"),
  filiere: z.string().optional(),
  encadrantId: z.string().optional(),
  etablissementNom: z.string().optional(),
  etablissementVille: z.string().optional(),
  // Code reçu d'un encadreur, d'une classe ou d'un établissement (facultatif).
  codeInvitation: z.string().optional(),
});

type FormValues = z.infer<typeof schemaBase>;

export default function RegisterPage() {
  const { register: creerCompte, definirUtilisateur } = useAuth();
  const router = useRouter();
  const [role, setRole] = React.useState<RoleInscription>("etudiant");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Liste des encadreurs exposée par le mock json-server sur la ressource top-level `/encadrants`,
  // accessible avant la création du compte.
  const { data: encadrants } = useApiList<EncadrantPublic>("encadrants", { limite: 100 });

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schemaBase),
    defaultValues: {
      role: "etudiant",
      pays: PAYS_PAR_DEFAUT,
      telephone: trouverPays(PAYS_PAR_DEFAUT)!.indicatif,
    },
  });

  const encadrantId = useWatch({ control, name: "encadrantId" });
  const codePays = useWatch({ control, name: "pays" });
  const paysChoisi = trouverPays(codePays) ?? trouverPays(PAYS_PAR_DEFAUT)!;

  // Le changement de pays préremplit l'indicatif si le numéro n'a pas encore été saisi.
  const surChangementPays = (code: string) => {
    const pays = trouverPays(code);
    if (!pays) return;
    const actuel = getValues("telephone") ?? "";
    if (!actuel || INDICATIF_REGEX.test(actuel.trim())) setValue("telephone", pays.indicatif);
  };

  const onSubmit = async (values: FormValues) => {
    const code = values.codeInvitation?.trim();
    if (role === "etudiant" && !values.encadrantId && !code) {
      toast.error("Choisissez votre encadreur ou saisissez le code reçu.");
      return;
    }
    if (role === "admin_etablissement" && !code && !values.etablissementNom?.trim()) {
      toast.error("Merci d'indiquer le nom de votre établissement.");
      return;
    }
    if (!values.telephone.replace(/\s/g, "").startsWith(paysChoisi.indicatif)) {
      toast.error(`Le numéro doit commencer par l'indicatif ${paysChoisi.indicatif} (${paysChoisi.nom}).`);
      return;
    }
    setIsSubmitting(true);
    try {
      const { etablissementVille, codeInvitation: _code, ...donnees } = values;
      let user = await creerCompte({ ...donnees, telephone: values.telephone.replace(/\s/g, ""), role });
      if (code) {
        // Le compte est créé même si le code est refusé : l'utilisateur pourra le ressaisir
        // depuis « Rejoindre un encadreur » ou ses paramètres.
        try {
          const resultat = await utiliserCode(user, code);
          user = resultat.utilisateur;
          definirUtilisateur(user);
          toast.success(resultat.message);
        } catch (err) {
          toast.error(err instanceof CodeInvalideError ? err.message : "Le code n'a pas pu être utilisé.");
        }
      }
      if (role === "admin_etablissement" && !user.etablissementId) {
        const etablissement = await apiPost<Etablissement>("etablissements", {
          nom: values.etablissementNom!.trim(),
          adminId: user.id,
          pays: paysChoisi.code,
          ville: etablissementVille?.trim() || null,
          devise: paysChoisi.devise,
          createdAt: new Date().toISOString(),
        });
        await apiPatch("users", user.id, { etablissementId: etablissement.id });
      }
      toast.success(`Compte créé, bienvenue ${user.prenom} !`);
      router.push(lienOnboarding(user.role) ?? espaceParDefaut(user.role));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Impossible de créer le compte.");
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
            <div className="mb-5 grid grid-cols-3 gap-2">
              {(["etudiant", "encadrant", "admin_etablissement"] as const).map((r) => (
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
                  {r === "etudiant"
                    ? "Étudiant·e"
                    : r === "encadrant"
                      ? "Encadreur·e"
                      : "Établissement"}
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
                <Label htmlFor="pays">Pays</Label>
                <SelectPays
                  id="pays"
                  {...register("pays", { onChange: (e) => surChangementPays(e.target.value) })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="telephone">Numéro de téléphone (WhatsApp de préférence)</Label>
                <Input
                  id="telephone"
                  inputMode="tel"
                  placeholder={`${paysChoisi.indicatif} ${paysChoisi.exempleNumero}`}
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
                    <Label>Encadreur·e</Label>
                    <Select value={encadrantId} onValueChange={(v) => setValue("encadrantId", v)}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Sélectionnez votre encadreur" />
                      </SelectTrigger>
                      <SelectContent>
                        {encadrants.map((e) => (
                          <SelectItem key={e.id} value={e.id}>
                            {e.prenom} {e.nom}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Pas encore d&apos;encadreur ? Choisissez-en un provisoirement, vous pourrez
                      rejoindre une classe par code juste après.
                    </p>
                  </div>
                </>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="codeInvitation">Code d&apos;invitation (facultatif)</Label>
                <Input
                  id="codeInvitation"
                  placeholder="Ex : MASTER-INFO-26"
                  className="uppercase"
                  {...register("codeInvitation")}
                />
                <p className="text-xs text-muted-foreground">
                  Reçu de votre encadreur, de votre classe ou de votre établissement : il vous
                  rattache automatiquement.
                </p>
              </div>

              {role === "admin_etablissement" && (
                <div className="space-y-1.5">
                  <Label htmlFor="etablissementNom">Nom de l&apos;établissement</Label>
                  <Input
                    id="etablissementNom"
                    placeholder="Ex : Institut Supérieur de Management de Dakar"
                    {...register("etablissementNom")}
                  />
                  <Label htmlFor="etablissementVille" className="pt-2">
                    Ville
                  </Label>
                  <Input
                    id="etablissementVille"
                    placeholder="Ex : Dakar, Abidjan, Douala…"
                    {...register("etablissementVille")}
                  />
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                Créer un compte
              </Button>
            </form>

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
