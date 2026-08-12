"use client";

import * as React from "react";
import { ShieldOff, Users } from "lucide-react";
import { toast } from "sonner";

import { useApiList } from "@/hooks/use-api-list";
import { PageHeader } from "@/components/shared/page-header";
import { Toolbar } from "@/components/shared/toolbar";
import { Pagination } from "@/components/shared/pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiPatch } from "@/lib/api";
import { ROLE_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import type { PublicUser, Role } from "@/types";

const ROLES_FILTRABLES: (Role | "tous")[] = ["tous", "etudiant", "encadrant", "admin"];

/**
 * Écran « Gestion des utilisateurs » (spec écrans F8-F11) : liste, recherche, changement de
 * rôle et activation/désactivation - réservé aux administrateurs (voir users.service#update,
 * ces trois champs sont explicitement refusés à tout appelant non-admin).
 */
export default function AdminUtilisateursPage() {
  const [recherche, setRecherche] = React.useState("");
  const [role, setRole] = React.useState<string>("tous");
  const [page, setPage] = React.useState(1);
  const [enCours, setEnCours] = React.useState<string | null>(null);

  const { data, total, totalPages, isLoading, refetch } = useApiList<PublicUser>("users", {
    page,
    limite: 10,
    tri: "createdAt",
    ordre: "desc",
    recherche,
    filtres: { role: role === "tous" ? undefined : role },
  });

  const changerRole = async (utilisateur: PublicUser, nouveauRole: Role) => {
    setEnCours(utilisateur.id);
    try {
      await apiPatch("users", utilisateur.id, { role: nouveauRole });
      toast.success(`Rôle mis à jour : ${ROLE_LABELS[nouveauRole]}.`);
      refetch();
    } catch {
      toast.error("La mise à jour du rôle a échoué.");
    } finally {
      setEnCours(null);
    }
  };

  const basculerActif = async (utilisateur: PublicUser) => {
    setEnCours(utilisateur.id);
    try {
      await apiPatch("users", utilisateur.id, { actif: utilisateur.actif === false });
      toast.success(utilisateur.actif === false ? "Compte réactivé." : "Compte désactivé.");
      refetch();
    } catch {
      toast.error("La mise à jour a échoué.");
    } finally {
      setEnCours(null);
    }
  };

  // Écran F14 « Création d'un rôle personnalisé » : un libellé purement affiché, sans effet sur
  // les permissions RBAC - enregistré à la perte de focus plutôt qu'à chaque frappe.
  const changerLibelleRole = async (utilisateur: PublicUser, libelle: string) => {
    const valeur = libelle.trim() || null;
    if (valeur === (utilisateur.libelleRolePersonnalise ?? null)) return;
    try {
      await apiPatch("users", utilisateur.id, { libelleRolePersonnalise: valeur });
      toast.success("Libellé mis à jour.");
      refetch();
    } catch {
      toast.error("La mise à jour a échoué.");
    }
  };

  return (
    <div>
      <PageHeader
        title="Gestion des utilisateurs"
        description="Recherchez un compte, changez son rôle ou désactivez-le."
      />

      <Card>
        <CardContent className="pt-6">
          <Toolbar
            recherche={recherche}
            onRechercheChange={(v) => {
              setRecherche(v);
              setPage(1);
            }}
            placeholderRecherche="Rechercher par nom ou e-mail…"
          >
            <Select
              value={role}
              onValueChange={(v) => {
                setRole(v);
                setPage(1);
              }}
            >
              <SelectTrigger size="sm" className="w-48">
                <SelectValue placeholder="Rôle" />
              </SelectTrigger>
              <SelectContent>
                {ROLES_FILTRABLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r === "tous" ? "Tous les rôles" : ROLE_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Toolbar>

          {!isLoading && data.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Aucun utilisateur trouvé"
              description="Ajustez votre recherche."
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Rôle</TableHead>
                    <TableHead>Libellé personnalisé</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Inscription</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">
                        {u.prenom} {u.nom}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{u.email}</TableCell>
                      <TableCell>
                        <Select value={u.role} onValueChange={(v) => changerRole(u, v as Role)}>
                          <SelectTrigger size="sm" className="w-36" disabled={enCours === u.id}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(["etudiant", "encadrant", "admin"] as Role[]).map((r) => (
                              <SelectItem key={r} value={r}>
                                {ROLE_LABELS[r]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          key={u.id}
                          size={20}
                          defaultValue={u.libelleRolePersonnalise ?? ""}
                          placeholder="Ex : Coordinateur"
                          className="h-8 w-40 text-xs"
                          onBlur={(e) => changerLibelleRole(u, e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Badge variant={u.actif === false ? "destructive" : "success"}>
                          {u.actif === false ? "Désactivé" : "Actif"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(u.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={enCours === u.id}
                          onClick={() => basculerActif(u)}
                        >
                          <ShieldOff className="size-4" />
                          {u.actif === false ? "Réactiver" : "Désactiver"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination
                page={page}
                totalPages={totalPages}
                total={total}
                limite={10}
                onPageChange={setPage}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
