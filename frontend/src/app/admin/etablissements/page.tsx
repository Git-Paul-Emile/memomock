"use client";

import * as React from "react";
import { Building2, Plus } from "lucide-react";
import { toast } from "sonner";

import { useApiResource } from "@/hooks/use-api-resource";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { SelectPays } from "@/components/shared/select-pays";
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
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiList, apiPatch, apiPost } from "@/lib/api";
import { genererCodeInvitation } from "@/lib/etablissement";
import { LIBELLES_DEVISE, PAYS_PAR_DEFAUT, trouverPays } from "@/lib/afrique";
import { journaliser } from "@/lib/audit";
import type {
  Abonnement,
  Departement,
  Etablissement,
  Filiere,
  Forfait,
  PublicUser,
} from "@/types";

interface Ligne {
  etablissement: Etablissement;
  admin: PublicUser | null;
  departements: number;
  filieres: number;
  etudiants: number;
  encadreurs: number;
  forfait: Forfait | null;
}

/** Vue super-admin de tous les établissements de la plateforme (spec v2, partie VII). */
export default function AdminEtablissementsPage() {
  const [nom, setNom] = React.useState("");
  const [ville, setVille] = React.useState("");
  const [pays, setPays] = React.useState(PAYS_PAR_DEFAUT);
  const [enCours, setEnCours] = React.useState(false);

  const { data, isLoading, refetch } = useApiResource<Ligne[]>(["admin-etablissements"], async () => {
    const [etabs, users, deps, fils, abos, forfaits] = await Promise.all([
      apiList<Etablissement>("etablissements", { limite: 500 }),
      apiList<PublicUser>("users", { limite: 5000 }),
      apiList<Departement>("departements", { limite: 2000 }),
      apiList<Filiere>("filieres", { limite: 2000 }),
      apiList<Abonnement>("abonnements", { limite: 500 }),
      apiList<Forfait>("forfaits", { limite: 50 }),
    ]);
    return etabs.data.map((etablissement) => {
      const membres = users.data.filter((u) => u.etablissementId === etablissement.id);
      const abo = abos.data.find((a) => a.etablissementId === etablissement.id && a.statut === "actif");
      return {
        etablissement,
        admin: users.data.find((u) => u.id === etablissement.adminId) ?? null,
        departements: deps.data.filter((d) => d.etablissementId === etablissement.id).length,
        filieres: fils.data.filter((f) => f.etablissementId === etablissement.id).length,
        etudiants: membres.filter((u) => u.role === "etudiant").length,
        encadreurs: membres.filter((u) => u.role === "encadrant").length,
        forfait: forfaits.data.find((f) => f.id === abo?.forfaitId) ?? null,
      };
    });
  });

  const creer = async () => {
    if (!nom.trim()) return;
    const p = trouverPays(pays);
    setEnCours(true);
    try {
      const cree = await apiPost<Etablissement>("etablissements", {
        nom: nom.trim(),
        adminId: "",
        pays,
        ville: ville.trim() || null,
        devise: p?.devise ?? "XOF",
        createdAt: new Date().toISOString(),
      });
      await journaliser("Création d'établissement", cree.nom, p?.nom ?? pays);
      setNom("");
      setVille("");
      toast.success("Établissement créé. Invitez son administrateur depuis « Utilisateurs ».");
      refetch();
    } catch {
      toast.error("La création a échoué.");
    } finally {
      setEnCours(false);
    }
  };

  const lignes = data ?? [];

  // Désignation de l'administrateur (spec v2, partie VII) : compte existant → rattachement
  // immédiat ; sinon, code d'invitation à transmettre, utilisé à l'inscription.
  const [aDesigner, setADesigner] = React.useState<Etablissement | null>(null);
  const [emailAdmin, setEmailAdmin] = React.useState("");
  const [codeGenere, setCodeGenere] = React.useState<string | null>(null);

  const designer = async () => {
    if (!aDesigner || !emailAdmin.trim()) return;
    const email = emailAdmin.trim().toLowerCase();
    try {
      const existants = await apiList<PublicUser>("users", { filtres: { email }, limite: 1 });
      const compte = existants.data[0];
      if (compte) {
        if (compte.role === "admin") {
          toast.error("Un super-administrateur ne peut pas administrer un établissement.");
          return;
        }
        await apiPatch("users", compte.id, { role: "admin_etablissement", etablissementId: aDesigner.id });
        await apiPatch("etablissements", aDesigner.id, { adminId: compte.id });
        await journaliser("Désignation d'administrateur", aDesigner.nom, email);
        toast.success(`${compte.prenom} ${compte.nom} administre désormais « ${aDesigner.nom} ».`);
        setADesigner(null);
        refetch();
        return;
      }
      const code = genererCodeInvitation("ADM");
      await apiPost("invitations-etablissement", {
        etablissementId: aDesigner.id,
        email,
        role: "admin_etablissement",
        classeId: null,
        code,
        statut: "en_attente",
        createdAt: new Date().toISOString(),
      });
      await journaliser("Invitation d'administrateur", aDesigner.nom, email);
      setCodeGenere(code);
    } catch {
      toast.error("La désignation a échoué.");
    }
  };

  return (
    <div>
      <PageHeader
        title="Établissements"
        description="Universités et écoles utilisant la plateforme en Afrique de l'Ouest et centrale."
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Nouvel établissement</CardTitle>
          <CardDescription>La devise de facturation découle du pays (F CFA pour l&apos;UEMOA et la CEMAC).</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-[1fr_200px_160px_auto] sm:items-end">
          <div className="space-y-1.5">
            <Label htmlFor="etab-nom">Nom</Label>
            <Input id="etab-nom" value={nom} onChange={(e) => setNom(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="etab-pays">Pays</Label>
            <SelectPays id="etab-pays" avecIndicatif={false} value={pays} onChange={(e) => setPays(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="etab-ville">Ville</Label>
            <Input id="etab-ville" value={ville} onChange={(e) => setVille(e.target.value)} />
          </div>
          <Button onClick={creer} disabled={enCours || !nom.trim()}>
            <Plus className="size-4" />
            Créer
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : lignes.length === 0 ? (
            <EmptyState icon={Building2} title="Aucun établissement" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Établissement</TableHead>
                  <TableHead>Pays</TableHead>
                  <TableHead>Administrateur</TableHead>
                  <TableHead className="text-right">Dép. / filières</TableHead>
                  <TableHead className="text-right">Encadreurs</TableHead>
                  <TableHead className="text-right">Étudiants</TableHead>
                  <TableHead>Forfait</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lignes.map((l) => {
                  const p = trouverPays(l.etablissement.pays);
                  return (
                    <TableRow key={l.etablissement.id}>
                      <TableCell className="font-medium">
                        {l.etablissement.nom}
                        {l.etablissement.ville && (
                          <span className="block text-xs text-muted-foreground">{l.etablissement.ville}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {p?.nom ?? "-"}
                        {l.etablissement.devise && (
                          <span className="block text-xs text-muted-foreground">
                            {LIBELLES_DEVISE[l.etablissement.devise]}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {l.admin ? `${l.admin.prenom} ${l.admin.nom}` : <Badge variant="outline">À désigner</Badge>}
                        <button
                          type="button"
                          className="ml-2 text-xs text-primary hover:underline"
                          onClick={() => {
                            setADesigner(l.etablissement);
                            setEmailAdmin("");
                            setCodeGenere(null);
                          }}
                        >
                          {l.admin ? "Changer" : "Désigner"}
                        </button>
                      </TableCell>
                      <TableCell className="text-right">
                        {l.departements} / {l.filieres}
                      </TableCell>
                      <TableCell className="text-right">{l.encadreurs}</TableCell>
                      <TableCell className="text-right">{l.etudiants}</TableCell>
                      <TableCell>{l.forfait?.nom ?? <span className="text-muted-foreground">Aucun</span>}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!aDesigner} onOpenChange={(ouvert) => !ouvert && setADesigner(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Administrateur de « {aDesigner?.nom} »</DialogTitle>
            <DialogDescription>
              Saisissez l&apos;e-mail de la personne. Si elle a déjà un compte, elle est désignée
              immédiatement ; sinon, un code lui permettra de s&apos;inscrire comme administrateur
              de cet établissement.
            </DialogDescription>
          </DialogHeader>
          {codeGenere ? (
            <div className="space-y-2 text-sm">
              <p>Aucun compte pour cette adresse. Transmettez ce code d&apos;inscription :</p>
              <code className="block rounded-md border bg-muted px-3 py-2 text-center text-lg font-semibold tracking-widest">
                {codeGenere}
              </code>
              <p className="text-muted-foreground">
                À l&apos;inscription, choisir le rôle « Établissement » et saisir ce code.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="email-admin">E-mail</Label>
              <Input id="email-admin" type="email" value={emailAdmin} onChange={(e) => setEmailAdmin(e.target.value)} />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setADesigner(null)}>
              Fermer
            </Button>
            {!codeGenere && (
              <Button onClick={designer} disabled={!emailAdmin.trim()}>
                Désigner
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
