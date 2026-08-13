"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { GraduationCap, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/context/auth-context";
import { espaceParDefaut, lienOnboarding } from "@/components/layout/route-guard";
import { useApiList } from "@/hooks/use-api-list";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/constants";
import type { PublicUser, RoleInscription } from "@/types";

const TELEPHONE_REGEX = /^\+[1-9]\d{7,14}$/;

const schema = z.object({
  role: z.enum(["etudiant", "encadrant"]),
  telephone: z.string().regex(TELEPHONE_REGEX, "Numéro invalide (format : +221771234567)"),
  filiere: z.string().optional(),
  encadrantId: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

/**
 * Écran de complétion de profil, atteint après une inscription si des informations obligatoires
 * manquent (rôle, téléphone, encadrant...) avant que le compte soit utilisable.
 */
export default function CompleterProfilPage() {
  const { user, isLoading, completerProfil } = useAuth();
  const router = useRouter();
  const [role, setRole] = React.useState<RoleInscription>("etudiant");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const { data: encadrants } = useApiList<PublicUser>("public/encadrants", { limite: 100 });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { role: "etudiant" },
  });

  const encadrantId = watch("encadrantId");

  // Garde-fous : si l'utilisateur n'est pas connecté, retour à la connexion. Si
  // un profil complet existe déjà (rechargement), on renvoie l'utilisateur vers son espace.
  React.useEffect(() => {
    if (isLoading) return;
    if (user) {
      router.replace(espaceParDefaut(user.role));
      return;
    }
    router.replace("/login");
  }, [isLoading, user, router]);

  const onSubmit = async (values: FormValues) => {
    if (values.role === "etudiant" && !values.encadrantId) {
      toast.error("Merci de sélectionner votre encadrant.");
      return;
    }
    setIsSubmitting(true);
    try {
      const profil = await completerProfil({ ...values, role });
      toast.success(`Profil complété, bienvenue ${profil.prenom} !`);
      router.push(lienOnboarding(profil.role) ?? espaceParDefaut(profil.role));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Impossible de compléter votre profil.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <div className="flex items-center justify-center gap-2 text-lg font-semibold">
          <GraduationCap className="size-6 text-primary" />
          {APP_NAME}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Compléter votre profil</CardTitle>
            <CardDescription>
              Encore quelques informations pour finaliser votre inscription.
            </CardDescription>
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
                    "rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                    role === r
                      ? "border-primary bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent"
                  )}
                >
                  {r === "etudiant" ? "Je suis étudiant(e)" : "Je suis encadrant(e)"}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                Finaliser mon inscription
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
