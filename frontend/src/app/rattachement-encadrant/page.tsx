"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle2, GraduationCap, Loader2, Search, UserRoundCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { apiPost, apiPublic } from "@/lib/api";
import { cn, getInitials } from "@/lib/utils";
import { APP_NAME } from "@/lib/constants";
import type { EncadrantPublic } from "@/types";

/**
 * Écran « Rattachement à un encadrant » côté étudiant.
 *
 * Intervient juste après l'inscription si l'étudiant n'est pas encore lié à un encadrant.
 * Deux modes : saisie d'un code d'invitation transmis par l'encadrant, ou recherche par nom
 * / établissement d'un encadrant déjà référencé sur la plateforme. La liste des encadrants
 * provient de la base (endpoint public /api/public/encadrants).
 */
export default function RattachementEncadrantPage() {
  const [mode, setMode] = React.useState<"code" | "recherche">("code");
  const [code, setCode] = React.useState("");
  const [recherche, setRecherche] = React.useState("");
  const [selection, setSelection] = React.useState<string | null>(null);
  const [enCours, setEnCours] = React.useState(false);
  const [confirme, setConfirme] = React.useState(false);
  const [encadrants, setEncadrants] = React.useState<EncadrantPublic[]>([]);
  const [chargement, setChargement] = React.useState(true);

  React.useEffect(() => {
    apiPublic<EncadrantPublic[]>("encadrants")
      .then(setEncadrants)
      .catch(() => setEncadrants([]))
      .finally(() => setChargement(false));
  }, []);

  const resultats = encadrants.filter((e) =>
    `${e.prenom} ${e.nom} ${e.filiere ?? ""}`.toLowerCase().includes(recherche.toLowerCase())
  );

  const valider = async () => {
    setEnCours(true);
    try {
      await apiPost(
        "users/me/rattacher-encadrant",
        mode === "code" ? { code: code.trim().toUpperCase() } : { encadrantId: selection }
      );
      setConfirme(true);
    } catch {
      toast.error(
        mode === "code"
          ? "Ce code d'invitation est invalide. Vérifiez-le auprès de votre encadrant."
          : "Le rattachement a échoué. Réessayez dans quelques instants."
      );
    } finally {
      setEnCours(false);
    }
  };

  const peutValider = mode === "code" ? code.trim().length >= 4 : selection !== null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <Link href="/" className="flex items-center justify-center gap-2 text-lg font-semibold">
          <GraduationCap className="size-6 text-primary" />
          {APP_NAME}
        </Link>

        <Card>
          <CardHeader>
            <CardTitle>Rejoindre un encadrant</CardTitle>
            <CardDescription>
              Pour recevoir un accompagnement personnalisé, rattachez-vous à l&apos;encadrant qui
              suivra votre mémoire.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {confirme ? (
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <CheckCircle2 className="size-10 text-success" />
                <p className="text-sm font-medium">Rattachement confirmé</p>
                <p className="text-sm text-muted-foreground">
                  Vous êtes désormais lié à votre encadrant. Vous pouvez soumettre votre premier
                  document dès maintenant.
                </p>
                <Button asChild className="mt-2 w-full">
                  <Link href="/etudiant/dashboard">Accéder à mon espace</Link>
                </Button>
              </div>
            ) : (
              <>
                <div className="mb-4 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMode("code")}
                    className={cn(
                      "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
                      mode === "code"
                        ? "border-primary bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent"
                    )}
                  >
                    Code d&apos;invitation
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("recherche")}
                    className={cn(
                      "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
                      mode === "recherche"
                        ? "border-primary bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent"
                    )}
                  >
                    Rechercher
                  </button>
                </div>

                {mode === "code" ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="code">Code transmis par votre encadrant</Label>
                    <Input
                      id="code"
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      placeholder="Ex : MEMO-4KX9"
                      className="tracking-widest"
                    />
                    <p className="text-xs text-muted-foreground">
                      Ce code figure dans l&apos;e-mail d&apos;invitation reçu de votre encadrant.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={recherche}
                        onChange={(e) => setRecherche(e.target.value)}
                        placeholder="Nom de l'encadrant ou établissement…"
                        className="pl-8"
                      />
                    </div>
                    <div className="space-y-2">
                      {chargement ? (
                        <div className="space-y-2">
                          <Skeleton className="h-14 w-full" />
                          <Skeleton className="h-14 w-full" />
                        </div>
                      ) : resultats.length === 0 ? (
                        <p className="py-4 text-center text-sm text-muted-foreground">
                          Aucun encadrant ne correspond à votre recherche.
                        </p>
                      ) : (
                        resultats.map((e) => (
                          <button
                            key={e.id}
                            type="button"
                            onClick={() => setSelection(e.id)}
                            className={cn(
                              "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                              selection === e.id ? "border-primary bg-primary/5" : "hover:bg-accent"
                            )}
                          >
                            <div className="flex size-9 items-center justify-center rounded-full bg-muted text-sm font-medium">
                              {getInitials(e.nom, e.prenom)}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium">
                                {e.prenom} {e.nom}
                              </p>
                              <p className="text-xs text-muted-foreground">{e.filiere}</p>
                            </div>
                            {selection === e.id && (
                              <UserRoundCheck className="size-4 text-primary" />
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}

                <Button
                  className="mt-5 w-full"
                  onClick={valider}
                  disabled={!peutValider || enCours}
                >
                  {enCours && <Loader2 className="size-4 animate-spin" />}
                  Confirmer le rattachement
                </Button>

                <Separator className="my-4" />
                <p className="text-center text-sm text-muted-foreground">
                  Vous n&apos;avez pas encore de code ? Demandez-le à votre encadrant, ou{" "}
                  <Link href="/aide" className="font-medium text-primary hover:underline">
                    contactez le support
                  </Link>
                  .
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
