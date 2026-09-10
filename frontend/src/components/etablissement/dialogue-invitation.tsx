"use client";

import * as React from "react";
import { Copy, Mail } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
import { apiPost } from "@/lib/api";
import { genererCodeInvitation } from "@/lib/etablissement";
import type { Classe, InvitationEtablissement, RoleInvitable } from "@/types";

/**
 * Invitation par e-mail émise par l'établissement, pour un professeur ou pour un apprenant.
 *
 * Composant unique paramétré par `role` plutôt que deux dialogues quasi identiques : la seule
 * différence fonctionnelle est le rattachement à une classe, demandé pour un apprenant
 * uniquement (spec section 1 : « un étudiant invité via un code est automatiquement rattaché à
 * la bonne classe »). Le code généré porte ce rattachement.
 */
export function DialogueInvitation({
  etablissementId,
  classes,
  role,
  onInvitation,
}: {
  etablissementId: string;
  classes: Classe[];
  role: RoleInvitable;
  onInvitation?: () => void;
}) {
  const [ouvert, setOuvert] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [classeId, setClasseId] = React.useState<string | undefined>(undefined);
  const [enCours, setEnCours] = React.useState(false);
  // Un code par ouverture du dialogue : régénéré à chaque fois qu'on rouvre, jamais réutilisé
  // d'une invitation à l'autre.
  const [code, setCode] = React.useState(() =>
    genererCodeInvitation(role === "encadrant" ? "ENC" : "ETU")
  );

  const ouvrir = (valeur: boolean) => {
    if (valeur) setCode(genererCodeInvitation(role === "encadrant" ? "ENC" : "ETU"));
    setOuvert(valeur);
  };

  const envoyer = async () => {
    if (!email.trim()) return;
    setEnCours(true);
    try {
      await apiPost<InvitationEtablissement>("invitations-etablissement", {
        etablissementId,
        email: email.trim(),
        role,
        classeId: classeId ?? null,
        code,
        statut: "en_attente",
        createdAt: new Date().toISOString(),
      });
      setEmail("");
      setClasseId(undefined);
      setOuvert(false);
      onInvitation?.();
      toast.success("Invitation enregistrée.");
    } catch {
      toast.error("L'envoi a échoué.");
    } finally {
      setEnCours(false);
    }
  };

  const copierCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success(`Code copié : ${code}`);
    } catch {
      // `navigator.clipboard` n'est disponible qu'en contexte sécurisé (HTTPS ou localhost) :
      // on affiche le code plutôt que de laisser l'utilisateur sans solution.
      toast.error(`Copie impossible. Code à transmettre : ${code}`);
    }
  };

  return (
    <Dialog open={ouvert} onOpenChange={ouvrir}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Mail className="size-4" />
          {role === "encadrant" ? "Inviter un professeur" : "Inviter des apprenants"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {role === "encadrant" ? "Inviter un professeur" : "Inviter un apprenant"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="invitation-email">Adresse e-mail</Label>
            <Input
              id="invitation-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={role === "encadrant" ? "professeur@ecole.fr" : "apprenant@ecole.fr"}
            />
          </div>
          {role === "etudiant" && (
            <div className="space-y-1.5">
              <Label>Classe de rattachement</Label>
              <Select value={classeId} onValueChange={setClasseId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sélectionner une classe" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((classe) => (
                    <SelectItem key={classe.id} value={classe.id}>
                      {classe.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <Button type="button" variant="outline" className="w-full" onClick={copierCode}>
            <Copy className="size-4" />
            Copier le code unique : {code}
          </Button>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOuvert(false)}>
            Annuler
          </Button>
          <Button onClick={envoyer} disabled={!email.trim() || enCours}>
            Envoyer l&apos;invitation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
