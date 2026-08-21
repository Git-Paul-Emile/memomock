"use client";

import * as React from "react";
import { Copy, Megaphone, Plus, Search, Trash2, UserPlus, Users, X } from "lucide-react";
import { toast } from "sonner";

import { useApiList } from "@/hooks/use-api-list";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { apiGet, apiList, apiPatch, apiPost } from "@/lib/api";
import { LIBELLES_TYPE_DOCUMENT } from "@/types";
import { getInitials } from "@/lib/utils";
import type { Classe, Groupe, PublicUser } from "@/types";

/**
 * Détail d'une classe (spec sections 9-12, 71) : groupes, encadreurs rattachés, étudiants
 * rattachés. Composant partagé entre `/etablissement/classes/[id]` et `/encadrant/classes/[id]` -
 * les deux espaces ont besoin exactement des mêmes capacités de gestion.
 */
export function DetailClasse({
  classe,
  onClasseMiseAJour,
}: {
  classe: Classe;
  onClasseMiseAJour: (classe: Classe) => void;
}) {
  const [copie, setCopie] = React.useState(false);

  const copierCode = () => {
    navigator.clipboard?.writeText(classe.code).catch(() => {});
    setCopie(true);
    setTimeout(() => setCopie(false), 1500);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Code de rattachement</CardTitle>
          <CardDescription>
            Les étudiants saisissent ce code (page « Rejoindre un encadrant ») pour rejoindre
            automatiquement cette classe.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-md border bg-muted px-3 py-2 text-center text-lg font-semibold tracking-widest">
              {classe.code}
            </code>
            <Button variant="outline" onClick={copierCode}>
              <Copy className="size-4" />
              {copie ? "Copié !" : "Copier"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <SectionDiffusion classeId={classe.id} />
      <SectionGroupes classe={classe} />
      <SectionEncadrants classe={classe} onClasseMiseAJour={onClasseMiseAJour} />
      <SectionEtudiants classe={classe} />
    </div>
  );
}

/** Diffusion d'une consigne à toute la classe (spec sections 91-92) - une notification par étudiant. */
function SectionDiffusion({ classeId }: { classeId: string }) {
  const { data: etudiants } = useApiList<PublicUser>("users", {
    filtres: { classeId },
    limite: 100,
  });
  const [ouvert, setOuvert] = React.useState(false);
  const [texte, setTexte] = React.useState("");
  const [enCours, setEnCours] = React.useState(false);

  const envoyer = async () => {
    if (!texte.trim() || etudiants.length === 0) return;
    setEnCours(true);
    try {
      const maintenant = new Date().toISOString();
      await Promise.all(
        etudiants.map((e) =>
          apiPost("notifications", {
            userId: e.id,
            titre: "Message de votre encadrant",
            message: texte.trim(),
            type: "systeme",
            lu: false,
            date: maintenant,
          })
        )
      );
      toast.success(`Message envoyé à ${etudiants.length} étudiant(s).`);
      setTexte("");
      setOuvert(false);
    } catch {
      toast.error("L'envoi a échoué.");
    } finally {
      setEnCours(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between">
        <div>
          <CardTitle className="text-base">Communiquer avec la classe</CardTitle>
          <CardDescription>
            Diffusez une consigne ou une information à tous les étudiants de cette classe.
          </CardDescription>
        </div>
        <Dialog open={ouvert} onOpenChange={setOuvert}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" disabled={etudiants.length === 0}>
              <Megaphone className="size-4" />
              Envoyer un message
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Message à la classe</DialogTitle>
              <DialogDescription>
                Sera envoyé en notification aux {etudiants.length} étudiant(s) de cette classe.
              </DialogDescription>
            </DialogHeader>
            <Textarea
              value={texte}
              onChange={(e) => setTexte(e.target.value)}
              placeholder="Ex : Tous les étudiants doivent corriger la pagination de leur document."
              rows={4}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setOuvert(false)}>
                Annuler
              </Button>
              <Button onClick={envoyer} disabled={!texte.trim() || enCours}>
                Envoyer à la classe
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
    </Card>
  );
}

function SectionGroupes({ classe }: { classe: Classe }) {
  const { data: groupes, isLoading, refetch } = useApiList<Groupe>("groupes", {
    filtres: { classeId: classe.id },
    limite: 50,
  });
  const [ouvert, setOuvert] = React.useState(false);
  const [nom, setNom] = React.useState("");
  const [enCours, setEnCours] = React.useState(false);

  const creer = async () => {
    if (!nom.trim()) return;
    setEnCours(true);
    try {
      await apiPost<Groupe>("groupes", {
        classeId: classe.id,
        nom: nom.trim(),
        createdAt: new Date().toISOString(),
      });
      setNom("");
      setOuvert(false);
      refetch();
    } catch {
      toast.error("La création du groupe a échoué.");
    } finally {
      setEnCours(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between">
        <div>
          <CardTitle className="text-base">Groupes</CardTitle>
          <CardDescription>Sous-divisions de la classe (spec section 10).</CardDescription>
        </div>
        <Dialog open={ouvert} onOpenChange={setOuvert}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="size-4" />
              Ajouter
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouveau groupe</DialogTitle>
              <DialogDescription>Ex : « Groupe A ».</DialogDescription>
            </DialogHeader>
            <div className="space-y-1.5">
              <Label htmlFor="groupe-nom">Nom</Label>
              <Input id="groupe-nom" value={nom} onChange={(e) => setNom(e.target.value)} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOuvert(false)}>
                Annuler
              </Button>
              <Button onClick={creer} disabled={!nom.trim() || enCours}>
                Créer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-10 w-full" />
        ) : groupes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun groupe pour l&apos;instant.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {groupes.map((g) => (
              <Badge key={g.id} variant="secondary">
                {g.nom}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SectionEncadrants({
  classe,
  onClasseMiseAJour,
}: {
  classe: Classe;
  onClasseMiseAJour: (classe: Classe) => void;
}) {
  const [encadrants, setEncadrants] = React.useState<PublicUser[]>([]);
  const [chargement, setChargement] = React.useState(true);
  const [recherche, setRecherche] = React.useState("");
  const [resultats, setResultats] = React.useState<PublicUser[]>([]);
  const [ouvert, setOuvert] = React.useState(false);

  React.useEffect(() => {
    let annule = false;
    Promise.all(
      classe.encadrantIds.map((id) => apiGet<PublicUser>("users", id).catch(() => null))
    )
      .then((res) => {
        if (!annule) setEncadrants(res.filter((e): e is PublicUser => !!e));
      })
      .finally(() => {
        if (!annule) setChargement(false);
      });
    return () => {
      annule = true;
    };
  }, [classe.encadrantIds]);

  React.useEffect(() => {
    if (!ouvert || !recherche.trim()) return;
    let annule = false;
    apiList<PublicUser>("users", { filtres: { role: "encadrant" }, recherche: recherche.trim(), limite: 10 })
      .then((res) => {
        if (!annule) setResultats(res.data.filter((e) => !classe.encadrantIds.includes(e.id)));
      })
      .catch(() => {
        if (!annule) setResultats([]);
      });
    return () => {
      annule = true;
    };
  }, [recherche, ouvert, classe.encadrantIds]);

  const ajouter = async (encadrant: PublicUser) => {
    const misAJour = await apiPatch<Classe>("classes", classe.id, {
      encadrantIds: [...classe.encadrantIds, encadrant.id],
    });
    onClasseMiseAJour(misAJour);
    setEncadrants((prev) => [...prev, encadrant]);
    setRecherche("");
    setOuvert(false);
    toast.success(`${encadrant.prenom} ${encadrant.nom} ajouté·e à la classe.`);
  };

  const retirer = async (id: string) => {
    const misAJour = await apiPatch<Classe>("classes", classe.id, {
      encadrantIds: classe.encadrantIds.filter((e) => e !== id),
    });
    onClasseMiseAJour(misAJour);
    setEncadrants((prev) => prev.filter((e) => e.id !== id));
  };

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between">
        <div>
          <CardTitle className="text-base">Encadreurs</CardTitle>
          <CardDescription>
            Une classe peut être suivie par plusieurs encadreurs (spec section 71).
          </CardDescription>
        </div>
        <Dialog
          open={ouvert}
          onOpenChange={(open) => {
            setOuvert(open);
            if (!open) {
              setRecherche("");
              setResultats([]);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="size-4" />
              Ajouter
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajouter un encadreur</DialogTitle>
              <DialogDescription>Recherchez par nom ou e-mail.</DialogDescription>
            </DialogHeader>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                placeholder="Rechercher un encadrant…"
                className="pl-8"
              />
            </div>
            <div className="max-h-64 space-y-1 overflow-y-auto">
              {resultats.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => ajouter(e)}
                  className="flex w-full items-center gap-3 rounded-lg border p-2.5 text-left hover:bg-accent"
                >
                  <div className="flex size-8 items-center justify-center rounded-full bg-muted text-xs font-medium">
                    {getInitials(e.nom, e.prenom)}
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {e.prenom} {e.nom}
                    </p>
                    <p className="text-xs text-muted-foreground">{e.email}</p>
                  </div>
                </button>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-2">
        {chargement ? (
          <Skeleton className="h-10 w-full" />
        ) : encadrants.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun encadreur rattaché.</p>
        ) : (
          encadrants.map((e) => (
            <div key={e.id} className="flex items-center justify-between rounded-lg border p-2.5">
              <div className="flex items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded-full bg-muted text-xs font-medium">
                  {getInitials(e.nom, e.prenom)}
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {e.prenom} {e.nom}
                  </p>
                  <p className="text-xs text-muted-foreground">{e.email}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => retirer(e.id)}>
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function SectionEtudiants({ classe }: { classe: Classe }) {
  const {
    data: etudiants,
    isLoading,
    refetch,
  } = useApiList<PublicUser>("users", {
    filtres: { classeId: classe.id },
    limite: 100,
  });
  const [ouvert, setOuvert] = React.useState(false);
  const [saisie, setSaisie] = React.useState("");
  const [emails, setEmails] = React.useState<string[]>([]);
  const [enCours, setEnCours] = React.useState(false);

  const ajouterEmail = () => {
    const valeur = saisie.trim().toLowerCase();
    if (valeur && /.+@.+\..+/.test(valeur) && !emails.includes(valeur)) {
      setEmails((prev) => [...prev, valeur]);
      setSaisie("");
    }
  };

  const rattacherEtudiants = async () => {
    setEnCours(true);
    try {
      const resultats = await Promise.all(
        emails.map(async (email) => {
          const res = await apiList<PublicUser>("users", {
            filtres: { email, role: "etudiant" },
            limite: 1,
          });
          const etudiant = res.data[0];
          if (!etudiant) return { email, trouve: false };
          await apiPatch("users", etudiant.id, {
            classeId: classe.id,
            etablissementId: classe.etablissementId,
          });
          return { email, trouve: true };
        })
      );
      const rattaches = resultats.filter((r) => r.trouve).length;
      const introuvables = resultats.filter((r) => !r.trouve).map((r) => r.email);
      if (rattaches > 0) toast.success(`${rattaches} étudiant(s) rattaché(s) à la classe.`);
      if (introuvables.length > 0) {
        toast.error(`Aucun compte étudiant trouvé pour : ${introuvables.join(", ")}.`);
      }
      setEmails([]);
      setOuvert(false);
      refetch();
    } finally {
      setEnCours(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between">
        <div>
          <CardTitle className="text-base">Étudiants</CardTitle>
          <CardDescription>{etudiants.length} étudiant(s) rattaché(s) à cette classe.</CardDescription>
        </div>
        <Dialog open={ouvert} onOpenChange={setOuvert}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <UserPlus className="size-4" />
              Rattacher
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rattacher des étudiants</DialogTitle>
              <DialogDescription>
                Ils doivent déjà posséder un compte MemoAI (sinon, partagez plutôt le code de
                classe ci-dessus).
              </DialogDescription>
            </DialogHeader>
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
            <DialogFooter>
              <Button variant="outline" onClick={() => setOuvert(false)}>
                Annuler
              </Button>
              <Button onClick={rattacherEtudiants} disabled={emails.length === 0 || enCours}>
                Rattacher
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <Skeleton className="h-10 w-full" />
        ) : etudiants.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Aucun étudiant"
            description="Partagez le code de classe ou rattachez un étudiant existant par e-mail."
          />
        ) : (
          etudiants.map((e) => (
            <div key={e.id} className="flex items-center gap-3 rounded-lg border p-2.5">
              <div className="flex size-8 items-center justify-center rounded-full bg-muted text-xs font-medium">
                {getInitials(e.nom, e.prenom)}
              </div>
              <div>
                <p className="text-sm font-medium">
                  {e.prenom} {e.nom}
                </p>
                <p className="text-xs text-muted-foreground">{e.email}</p>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export function libelleNiveauClasse(classe: Classe) {
  return LIBELLES_TYPE_DOCUMENT[classe.niveau];
}
