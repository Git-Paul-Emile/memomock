"use client";

import * as React from "react";
import { Copy, Link2, Loader2, Mail, Plus, Send, UserPlus, X } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/context/auth-context";
import { useApiList } from "@/hooks/use-api-list";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiPost } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type { Invitation } from "@/types";

/** Code d'invitation lisible, propre à un encadrant (partagé par toutes ses invitations). */
function genererCodeInvitation() {
  return `MEMO-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

/**
 * Écran « Invitation d'étudiants » côté encadrant.
 *
 * Permet de rattacher ses étudiants une fois le profil méthodologique configuré : saisie
 * d'adresses e-mail à inviter, ou partage d'un code / lien d'invitation. La liste des
 * invitations (en attente ou acceptées) provient de la base (GET /api/invitations).
 */
export default function InvitationsPage() {
  const { user } = useAuth();
  const [emails, setEmails] = React.useState<string[]>([]);
  const [saisie, setSaisie] = React.useState("");
  const [copie, setCopie] = React.useState(false);
  const [envoiEnCours, setEnvoiEnCours] = React.useState(false);
  // Généré une seule fois côté client tant qu'aucune invitation n'existe encore côté serveur
  // (voir plus bas : dès qu'une invitation existe, son code fait foi et remplace ce brouillon).
  const [codeGenere] = React.useState(genererCodeInvitation);

  const {
    data: invitations,
    isLoading,
    refetch,
  } = useApiList<Invitation>("invitations", {
    filtres: { encadrantId: user?.id },
    tri: "date",
    ordre: "desc",
    limite: 100,
  });

  // Le code d'invitation partagé est commun à l'encadrant : on réutilise celui de ses
  // invitations existantes pour rester cohérent, sinon le brouillon généré côté client.
  const codeInvitation = invitations[0]?.code ?? codeGenere;

  const ajouterEmail = () => {
    const valeur = saisie.trim().toLowerCase();
    if (valeur && /.+@.+\..+/.test(valeur) && !emails.includes(valeur)) {
      setEmails((prev) => [...prev, valeur]);
      setSaisie("");
    }
  };

  const copierCode = () => {
    navigator.clipboard?.writeText(codeInvitation).catch(() => {});
    setCopie(true);
    setTimeout(() => setCopie(false), 1500);
  };

  const envoyerInvitations = async () => {
    if (emails.length === 0) return;
    setEnvoiEnCours(true);
    try {
      await Promise.all(
        emails.map((email) =>
          apiPost("invitations", {
            email,
            code: codeInvitation,
            statut: "en_attente",
          })
        )
      );
      toast.success(
        `${emails.length} invitation${emails.length > 1 ? "s" : ""} envoyée${emails.length > 1 ? "s" : ""}.`
      );
      setEmails([]);
      refetch();
    } catch {
      toast.error("L'envoi des invitations a échoué. Réessayez dans quelques instants.");
    } finally {
      setEnvoiEnCours(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Inviter des étudiants"
        description="Rattachez vos étudiants pour qu'ils bénéficient automatiquement de votre profil méthodologique."
      />

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Mail className="size-4 text-primary" />
              Inviter par e-mail
            </CardTitle>
            <CardDescription>
              Ajoutez une ou plusieurs adresses, puis envoyez les invitations.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={saisie}
                onChange={(e) => setSaisie(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    ajouterEmail();
                  }
                }}
                placeholder="prenom.nom@etu.exemple.fr"
                type="email"
              />
              <Button variant="outline" onClick={ajouterEmail}>
                <Plus className="size-4" />
                Ajouter
              </Button>
            </div>

            {emails.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {emails.map((email) => (
                  <Badge key={email} variant="secondary" className="gap-1 pl-2.5">
                    {email}
                    <button
                      type="button"
                      onClick={() => setEmails((prev) => prev.filter((e) => e !== email))}
                      className="ml-0.5 rounded-full hover:text-destructive"
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            <Button
              disabled={emails.length === 0 || envoiEnCours}
              onClick={envoyerInvitations}
              className="w-full sm:w-auto"
            >
              {envoiEnCours ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              Envoyer{" "}
              {emails.length > 0
                ? `${emails.length} invitation${emails.length > 1 ? "s" : ""}`
                : "les invitations"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Link2 className="size-4 text-primary" />
              Partager un code d&apos;invitation
            </CardTitle>
            <CardDescription>
              Communiquez ce code à vos étudiants : ils l&apos;utiliseront lors de leur
              rattachement.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-md border bg-muted px-3 py-2 text-center text-lg font-semibold tracking-widest">
                {codeInvitation}
              </code>
              <Button variant="outline" onClick={copierCode}>
                <Copy className="size-4" />
                {copie ? "Copié !" : "Copier"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserPlus className="size-4 text-primary" />
              Invitations
            </CardTitle>
            <CardDescription>Suivi des invitations envoyées.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Adresse e-mail</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Envoyée le</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={3}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ) : invitations.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="py-6 text-center text-sm text-muted-foreground"
                    >
                      Aucune invitation envoyée pour le moment.
                    </TableCell>
                  </TableRow>
                ) : (
                  invitations.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">{inv.email}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            inv.statut === "acceptee"
                              ? "success"
                              : inv.statut === "expiree"
                                ? "secondary"
                                : "warning"
                          }
                        >
                          {inv.statut === "acceptee"
                            ? "Acceptée"
                            : inv.statut === "expiree"
                              ? "Expirée"
                              : "En attente"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatDate(inv.date)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
