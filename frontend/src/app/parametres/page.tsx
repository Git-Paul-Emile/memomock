"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Download, Loader2, Lock, LogOut, Monitor, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/context/auth-context";
import { PageHeader } from "@/components/shared/page-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { apiDelete, apiGet, apiList, apiPatch } from "@/lib/api";
import { obtenirSessionId } from "@/lib/session-id";
import { getInitials } from "@/lib/utils";
import { ROLE_LABELS } from "@/lib/constants";
import type {
  CanalNotification,
  DocumentSubmission,
  Notification,
  PublicUser,
  SessionConnexion,
} from "@/types";

const CANAL_LABELS: Record<CanalNotification, string> = {
  email: "E-mail + dans l'application",
  in_app: "Dans l'application uniquement",
};

const TELEPHONE_REGEX = /^\+[1-9]\d{7,14}$/;

const schemaProfil = z.object({
  prenom: z.string().min(2, "Prénom trop court"),
  nom: z.string().min(2, "Nom trop court"),
  email: z.string().email("Adresse e-mail invalide"),
  telephone: z
    .string()
    .regex(TELEPHONE_REGEX, "Numéro invalide (format : +221771234567)")
    .or(z.literal("")),
  filiere: z.string().optional(),
});

type FormValues = z.infer<typeof schemaProfil>;

export default function ParametresPage() {
  const { user, definirUtilisateur, logout, changerMotDePasse } = useAuth();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [avatarEnCours, setAvatarEnCours] = React.useState(false);
  const [canalEnCours, setCanalEnCours] = React.useState(false);
  const [exportEnCours, setExportEnCours] = React.useState(false);
  const [suppressionOuverte, setSuppressionOuverte] = React.useState(false);
  const [confirmationTexte, setConfirmationTexte] = React.useState("");
  const [suppressionEnCours, setSuppressionEnCours] = React.useState(false);
  const [revocationEnCours, setRevocationEnCours] = React.useState(false);
  const [motDePasseOuvert, setMotDePasseOuvert] = React.useState(false);
  const [motDePasseActuel, setMotDePasseActuel] = React.useState("");
  const [nouveauMotDePasse, setNouveauMotDePasse] = React.useState("");
  const [confirmationMotDePasse, setConfirmationMotDePasse] = React.useState("");
  const [motDePasseEnCours, setMotDePasseEnCours] = React.useState(false);
  const inputAvatarRef = React.useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const sessionIdCourante = obtenirSessionId();

  const { data: sessions = [], isLoading: sessionsChargement } = useQuery({
    queryKey: ["sessions-actives", user?.id],
    queryFn: async () => {
      const res = await apiList<SessionConnexion>("sessions", {
        filtres: { userId: user!.id },
        limite: 50,
      });
      return res.data;
    },
    enabled: !!user,
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schemaProfil),
    values: user
      ? {
          prenom: user.prenom,
          nom: user.nom,
          email: user.email,
          telephone: user.telephone ?? "",
          filiere: user.filiere ?? "",
        }
      : undefined,
  });

  if (!user) return null;

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      // L'e-mail n'est pas modifiable ici : on ne l'envoie pas
      // au backend, dont le validateur de mise à jour de profil (strict) ne l'accepte pas.
      const { email: _email, ...misAJourData } = values;
      const misAJour = await apiPatch<PublicUser>("users", user.id, misAJourData);
      definirUtilisateur(misAJour);
      toast.success("Profil mis à jour.");
    } catch {
      toast.error("Impossible de mettre à jour le profil.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fichier = e.target.files?.[0];
    e.target.value = ""; // permet de re-sélectionner le même fichier plus tard
    if (!fichier) return;
    if (!fichier.type.startsWith("image/")) {
      toast.error("Merci de choisir une image (PNG, JPG, WebP...).");
      return;
    }
    setAvatarEnCours(true);
    try {
      const dataUri = await new Promise<string>((resolve, reject) => {
        const lecteur = new FileReader();
        lecteur.onload = () => resolve(lecteur.result as string);
        lecteur.onerror = () => reject(lecteur.error);
        lecteur.readAsDataURL(fichier);
      });
      const misAJour = await apiPatch<PublicUser>("users", user.id, { avatarUrl: dataUri });
      definirUtilisateur(misAJour);
      toast.success("Photo de profil mise à jour.");
    } catch {
      toast.error("Impossible de mettre à jour la photo de profil.");
    } finally {
      setAvatarEnCours(false);
    }
  };

  const handleCanalChange = async (canal: CanalNotification) => {
    setCanalEnCours(true);
    try {
      const misAJour = await apiPatch<PublicUser>("users", user.id, {
        canalNotificationPrefere: canal,
      });
      definirUtilisateur(misAJour);
      toast.success("Préférence de notification enregistrée.");
    } catch {
      toast.error("Impossible d'enregistrer cette préférence.");
    } finally {
      setCanalEnCours(false);
    }
  };

  // RGPD - droit à la portabilité (art. 20) : télécharge un export JSON complet de toutes les
  // données personnelles rattachées au compte.
  const handleExporterDonnees = async () => {
    setExportEnCours(true);
    try {
      const filtreDocuments =
        user.role === "encadrant" ? { encadrantId: user.id } : { etudiantId: user.id };
      const [profil, documents, notifications] = await Promise.all([
        apiGet<PublicUser>("users", user.id),
        apiList<DocumentSubmission>("documents", { filtres: filtreDocuments, limite: 500 }),
        apiList<Notification>("notifications", { filtres: { userId: user.id }, limite: 500 }),
      ]);
      const donnees = { profil, documents: documents.data, notifications: notifications.data };
      const blob = new Blob([JSON.stringify(donnees, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const lien = document.createElement("a");
      lien.href = url;
      lien.download = `memoai-mes-donnees-${user!.id}.json`;
      lien.click();
      URL.revokeObjectURL(url);
      toast.success("Export téléchargé.");
    } catch {
      toast.error("Impossible d'exporter vos données pour le moment.");
    } finally {
      setExportEnCours(false);
    }
  };

  // RGPD - droit à l'effacement (art. 17), mis en œuvre par anonymisation. Confirmation
  // explicite requise (saisie du mot "SUPPRIMER") avant toute action irréversible.
  const handleSupprimerCompte = async () => {
    setSuppressionEnCours(true);
    try {
      await apiPatch("users", user.id, {
        actif: false,
        nom: "Compte supprimé",
        prenom: "",
        email: `anonymise-${user.id}@memoai.fr`,
        telephone: null,
        avatarUrl: null,
      });
      toast.success("Votre compte a été supprimé.");
      await logout(); // redirige déjà vers /login (voir auth-context.tsx)
    } catch {
      toast.error("Impossible de supprimer votre compte pour le moment.");
      setSuppressionEnCours(false);
    }
  };

  // Spec écran H8-H9 : révoque les sessions des autres appareils. La session courante
  // (identifiée par sessionIdCourante) est explicitement préservée.
  const handleRevoquerSessions = async () => {
    setRevocationEnCours(true);
    try {
      await Promise.all(
        sessions
          .filter((session) => session.id !== sessionIdCourante)
          .map((session) => apiDelete("sessions", session.id))
      );
      toast.success("Les autres sessions ont été déconnectées.");
      await queryClient.invalidateQueries({ queryKey: ["sessions-actives", user.id] });
    } catch {
      toast.error("Impossible de déconnecter les autres sessions.");
    } finally {
      setRevocationEnCours(false);
    }
  };

  // Écran H6 : changement de mot de passe (voir auth-context.tsx).
  const handleChangerMotDePasse = async () => {
    if (nouveauMotDePasse.length < 8) {
      toast.error("Le nouveau mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (nouveauMotDePasse !== confirmationMotDePasse) {
      toast.error("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setMotDePasseEnCours(true);
    try {
      await changerMotDePasse(motDePasseActuel, nouveauMotDePasse);
      toast.success("Mot de passe modifié.");
      setMotDePasseOuvert(false);
      setMotDePasseActuel("");
      setNouveauMotDePasse("");
      setConfirmationMotDePasse("");
    } catch {
      toast.error("Impossible de modifier le mot de passe pour le moment.");
    } finally {
      setMotDePasseEnCours(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Paramètres du compte"
        description="Gérez vos informations personnelles et vos préférences."
      />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => inputAvatarRef.current?.click()}
              disabled={avatarEnCours}
              className="group relative rounded-full"
              title="Changer la photo de profil"
            >
              <Avatar className="size-12">
                {user.avatarUrl && (
                  <AvatarImage src={user.avatarUrl} alt={`${user.prenom} ${user.nom}`} />
                )}
                <AvatarFallback className="text-base">
                  {getInitials(user.nom, user.prenom)}
                </AvatarFallback>
              </Avatar>
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 text-[10px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                {avatarEnCours ? <Loader2 className="size-4 animate-spin" /> : "Modifier"}
              </span>
            </button>
            <input
              ref={inputAvatarRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
            <div>
              <CardTitle className="text-base">
                {user.prenom} {user.nom}
              </CardTitle>
              <CardDescription>{ROLE_LABELS[user.role]}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
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
                readOnly
                className="bg-muted/50"
                {...register("email")}
              />
              <p className="text-xs text-muted-foreground">
                Gérée par votre compte de connexion, non modifiable ici.
              </p>
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
            {user.role === "etudiant" && (
              <div className="space-y-1.5">
                <Label htmlFor="filiere">Filière</Label>
                <Input
                  id="filiere"
                  placeholder="Ex : Master 2 Informatique"
                  {...register("filiere")}
                />
              </div>
            )}
            <Button type="submit" disabled={isSubmitting || !isDirty}>
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              Enregistrer
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notifications</CardTitle>
          <CardDescription>
            Choisissez le canal par lequel vous souhaitez recevoir vos notifications (soumission,
            analyse, correction, validation...).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Canal de notification préféré</Label>
            <Select
              value={user.canalNotificationPrefere ?? "email"}
              onValueChange={(v) => handleCanalChange(v as CanalNotification)}
              disabled={canalEnCours}
            >
              <SelectTrigger className="w-full sm:w-72">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(CANAL_LABELS) as CanalNotification[]).map((canal) => (
                  <SelectItem key={canal} value={canal}>
                    {CANAL_LABELS[canal]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Les notifications sont toujours consultables dans l&apos;application. L&apos;option «
              E-mail » vous envoie en plus un e-mail à chaque notification.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
          <CardHeader>
            <CardTitle className="text-base">Sécurité</CardTitle>
            <CardDescription>
              Mot de passe utilisé pour vous connecter à votre compte.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Dialog open={motDePasseOuvert} onOpenChange={setMotDePasseOuvert}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Lock className="size-4" />
                  Changer le mot de passe
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Changer le mot de passe</DialogTitle>
                  <DialogDescription>
                    Votre mot de passe actuel est requis pour confirmer ce changement.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="mdp-actuel">Mot de passe actuel</Label>
                    <Input
                      id="mdp-actuel"
                      type="password"
                      value={motDePasseActuel}
                      onChange={(e) => setMotDePasseActuel(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="mdp-nouveau">Nouveau mot de passe</Label>
                    <Input
                      id="mdp-nouveau"
                      type="password"
                      value={nouveauMotDePasse}
                      onChange={(e) => setNouveauMotDePasse(e.target.value)}
                      placeholder="8 caractères minimum"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="mdp-confirmation">Confirmer le nouveau mot de passe</Label>
                    <Input
                      id="mdp-confirmation"
                      type="password"
                      value={confirmationMotDePasse}
                      onChange={(e) => setConfirmationMotDePasse(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setMotDePasseOuvert(false)}>
                    Annuler
                  </Button>
                  <Button onClick={handleChangerMotDePasse} disabled={motDePasseEnCours}>
                    {motDePasseEnCours && <Loader2 className="size-4 animate-spin" />}
                    Confirmer
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sessions actives</CardTitle>
          <CardDescription>
            Appareils actuellement connectés à votre compte. Pas de double authentification (2FA)
            sur MemoAssistant AI : ce suivi est votre principal moyen de repérer une connexion que
            vous ne reconnaissez pas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sessionsChargement ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Chargement des sessions…
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune session active enregistrée.</p>
          ) : (
            <ul className="space-y-3">
              {sessions.map((session) => (
                <li key={session.id} className="flex items-start gap-3 text-sm">
                  <Monitor className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="font-medium">
                      {session.appareil ?? "Appareil inconnu"}
                      {session.id === sessionIdCourante && (
                        <span className="ml-2 text-xs font-normal text-primary">
                          (cette session)
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Dernière activité :{" "}
                      {new Date(session.derniereActivite).toLocaleString("fr-FR")}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Button
            variant="outline"
            onClick={handleRevoquerSessions}
            disabled={revocationEnCours || sessions.length <= 1}
          >
            {revocationEnCours ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <LogOut className="size-4" />
            )}
            Déconnecter les autres sessions
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Vos données personnelles</CardTitle>
          <CardDescription>
            Conformément au RGPD, vous pouvez à tout moment récupérer une copie de vos données ou
            supprimer votre compte. Voir notre{" "}
            <Link href="/confidentialite" className="text-primary hover:underline">
              politique de confidentialité
            </Link>
            .
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Exporter mes données</p>
              <p className="text-sm text-muted-foreground">
                Téléchargez un fichier JSON contenant votre profil, vos documents, analyses et
                notifications.
              </p>
            </div>
            <Button variant="outline" onClick={handleExporterDonnees} disabled={exportEnCours}>
              {exportEnCours ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              Exporter
            </Button>
          </div>
          <Separator />
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-destructive">Supprimer mon compte</p>
              <p className="text-sm text-muted-foreground">
                Vos informations personnelles seront anonymisées et votre connexion définitivement
                désactivée. Cette action est irréversible.
              </p>
            </div>
            <Button variant="destructive" onClick={() => setSuppressionOuverte(true)}>
              <ShieldAlert className="size-4" />
              Supprimer
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={suppressionOuverte}
        onOpenChange={(open) => {
          setSuppressionOuverte(open);
          if (!open) setConfirmationTexte("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer définitivement votre compte ?</DialogTitle>
            <DialogDescription>
              Votre nom, e-mail, téléphone et photo seront effacés et votre connexion désactivée.
              Vos documents restent visibles par votre établissement (traçabilité académique) mais
              ne seront plus rattachés à votre identité. Cette action ne peut pas être annulée.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <Label htmlFor="confirmation-suppression">
              Tapez <span className="font-semibold">SUPPRIMER</span> pour confirmer
            </Label>
            <Input
              id="confirmation-suppression"
              value={confirmationTexte}
              onChange={(e) => setConfirmationTexte(e.target.value)}
              placeholder="SUPPRIMER"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSuppressionOuverte(false)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              disabled={confirmationTexte !== "SUPPRIMER" || suppressionEnCours}
              onClick={handleSupprimerCompte}
            >
              {suppressionEnCours && <Loader2 className="size-4 animate-spin" />}
              Supprimer définitivement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
