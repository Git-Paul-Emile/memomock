"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle2, GraduationCap, Loader2, Search, UserRoundCheck } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/context/auth-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { apiList, apiPatch, apiPost, apiPublic } from "@/lib/api";
import { cn, getInitials } from "@/lib/utils";
import { APP_NAME } from "@/lib/constants";
import type { Classe, DemandeEncadrement, EncadrantPublic, Invitation, PublicUser } from "@/types";

/**
 * Écran « Rattachement à un encadrant » côté étudiant.
 *
 * Intervient juste après l'inscription si l'étudiant n'est pas encore lié à un encadrant.
 * Deux modes : saisie d'un code d'invitation transmis par l'encadrant, ou recherche par nom
 * / établissement d'un encadrant déjà référencé sur la plateforme. La liste des encadrants
 * provient de la base (endpoint public /api/public/encadrants).
 */
export default function RattachementEncadrantPage() {
  const { user, definirUtilisateur } = useAuth();
  const [mode, setMode] = React.useState<"code" | "classe" | "recherche">("code");
  const [code, setCode] = React.useState("");
  const [codeClasse, setCodeClasse] = React.useState("");
  const [recherche, setRecherche] = React.useState("");
  const [selection, setSelection] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState("");
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

  const rejoindreParCode = async () => {
    const res = await apiList<Invitation>("invitations", {
      filtres: { code: code.trim().toUpperCase() },
      limite: 1,
    });
    const invitation = res.data[0];
    if (!invitation || invitation.statut === "expiree") throw new Error("Code invalide");
    const misAJour = await apiPatch<PublicUser>("users", user!.id, {
      encadrantId: invitation.encadrantId,
    });
    await apiPatch<Invitation>("invitations", invitation.id, { statut: "acceptee" });
    definirUtilisateur(misAJour);
  };

  // CRUD standard : on résout la classe par son code, puis on met à jour le profil de
  // l'utilisateur connecté.
  const rejoindreParCodeClasse = async () => {
    const res = await apiList<Classe>("classes", {
      filtres: { code: codeClasse.trim().toUpperCase() },
      limite: 1,
    });
    const classe = res.data[0];
    if (!classe) throw new Error("Classe introuvable");
    const misAJour = await apiPatch<PublicUser>("users", user!.id, {
      classeId: classe.id,
      etablissementId: classe.etablissementId,
      encadrantId: classe.encadrantIds[0] ?? user!.encadrantId,
    });
    definirUtilisateur(misAJour);
  };

  // Contrairement aux modes "code" (l'encadrant/l'établissement a initié le contact), une
  // recherche libre crée une demande soumise à acceptation (spec sections 63, 65) plutôt qu'un
  // rattachement immédiat.
  const demanderEncadrement = async () => {
    await apiPost<DemandeEncadrement>("demandes-encadrement", {
      etudiantId: user!.id,
      encadrantId: selection,
      message: message.trim() || null,
      statut: "en_attente",
      createdAt: new Date().toISOString(),
    });
    await apiPost("notifications", {
      userId: selection,
      titre: "Nouvelle demande d'encadrement",
      message: `${user!.prenom} ${user!.nom} souhaite être encadré·e par vous.`,
      type: "systeme",
      lu: false,
      date: new Date().toISOString(),
    });
  };

  const valider = async () => {
    setEnCours(true);
    try {
      if (mode === "code") await rejoindreParCode();
      else if (mode === "classe") await rejoindreParCodeClasse();
      else await demanderEncadrement();
      setConfirme(true);
    } catch {
      toast.error(
        mode === "code"
          ? "Ce code d'invitation est invalide. Vérifiez-le auprès de votre encadrant."
          : mode === "classe"
            ? "Ce code de classe est invalide. Vérifiez-le auprès de votre établissement."
            : "Le rattachement a échoué. Réessayez dans quelques instants."
      );
    } finally {
      setEnCours(false);
    }
  };

  const peutValider =
    mode === "code"
      ? code.trim().length >= 4
      : mode === "classe"
        ? codeClasse.trim().length >= 4
        : selection !== null;

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
                <p className="text-sm font-medium">
                  {mode === "recherche" ? "Demande envoyée" : "Rattachement confirmé"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {mode === "recherche"
                    ? "Votre demande a été transmise à l'encadrant. Vous serez notifié·e dès sa réponse."
                    : "Vous êtes désormais lié à votre encadrant. Vous pouvez soumettre votre premier document dès maintenant."}
                </p>
                <Button asChild className="mt-2 w-full">
                  <Link href="/etudiant/dashboard">Accéder à mon espace</Link>
                </Button>
              </div>
            ) : (
              <>
                <div className="mb-4 grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setMode("code")}
                    className={cn(
                      "rounded-md border px-2 py-1.5 text-xs font-medium transition-colors sm:text-sm",
                      mode === "code"
                        ? "border-primary bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent"
                    )}
                  >
                    Code encadrant
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("classe")}
                    className={cn(
                      "rounded-md border px-2 py-1.5 text-xs font-medium transition-colors sm:text-sm",
                      mode === "classe"
                        ? "border-primary bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent"
                    )}
                  >
                    Code de classe
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("recherche")}
                    className={cn(
                      "rounded-md border px-2 py-1.5 text-xs font-medium transition-colors sm:text-sm",
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
                ) : mode === "classe" ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="codeClasse">Code de classe</Label>
                    <Input
                      id="codeClasse"
                      value={codeClasse}
                      onChange={(e) => setCodeClasse(e.target.value.toUpperCase())}
                      placeholder="Ex : CLASSE-4KX9"
                      className="tracking-widest"
                    />
                    <p className="text-xs text-muted-foreground">
                      Ce code vous rattache automatiquement à votre établissement, votre classe et
                      un encadrant (spec section 12).
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
                              "flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors",
                              selection === e.id ? "border-primary bg-primary/5" : "hover:bg-accent"
                            )}
                          >
                            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium">
                              {getInitials(e.nom, e.prenom)}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium">
                                {e.prenom} {e.nom}
                              </p>
                              <p className="text-xs text-muted-foreground">{e.filiere}</p>
                              <div className="mt-1.5 flex flex-wrap items-center gap-1">
                                {e.domainesExpertise?.map((d) => (
                                  <Badge key={d} variant="outline" className="text-[10px]">
                                    {d}
                                  </Badge>
                                ))}
                                <Badge
                                  variant={e.disponible === false ? "secondary" : "success"}
                                  className="text-[10px]"
                                >
                                  {e.disponible === false ? "Complet" : "Disponible"}
                                </Badge>
                                {typeof e.nbEtudiantsSuivis === "number" && (
                                  <span className="text-[10px] text-muted-foreground">
                                    {e.nbEtudiantsSuivis} étudiant(s) suivi(s)
                                  </span>
                                )}
                              </div>
                            </div>
                            {selection === e.id && (
                              <UserRoundCheck className="size-4 shrink-0 text-primary" />
                            )}
                          </button>
                        ))
                      )}
                    </div>
                    {selection && (
                      <div className="space-y-1.5">
                        <Label htmlFor="message">
                          Décrivez brièvement votre projet ou votre besoin (facultatif)
                        </Label>
                        <Textarea
                          id="message"
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          placeholder="Ex : Mémoire de Master en informatique sur l'IA générative, recherche d'un encadrant en NLP."
                          rows={3}
                        />
                      </div>
                    )}
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
