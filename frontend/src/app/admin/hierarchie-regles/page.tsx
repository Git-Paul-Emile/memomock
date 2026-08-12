"use client";

import * as React from "react";
import { AlertTriangle, CheckCircle2, GitBranch } from "lucide-react";

import { useApiList } from "@/hooks/use-api-list";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { LIBELLES_TYPE_DOCUMENT } from "@/types";
import type { ProfilEncadrant, PublicUser, TypeDocument } from "@/types";

interface GroupeRegles {
  typeDocument: TypeDocument;
  discipline: string;
  profils: ProfilEncadrant[];
  seuils: number[];
  conflit: boolean;
}

/**
 * Écran « Profils méthodologiques et conflits de règles » (spec écrans F24-F26).
 *
 * Depuis le retrait de la notion d'établissement, il n'y a plus de niveau institutionnel
 * au-dessus des encadrants : les profils méthodologiques sont désormais l'unique source des
 * exigences appliquées aux étudiants. Cet écran conserve donc sa seule fonction réellement
 * utile - détecter un conflit concret et vérifiable : des profils portant le même type de
 * document × discipline mais des seuils de soumission différents, révélant des attentes
 * incohérentes entre encadrants pour des étudiants pourtant comparables.
 */
export default function HierarchieReglesPage() {
  const { data: profils, isLoading } = useApiList<ProfilEncadrant>("profils-encadrant", {
    limite: 200,
  });
  const { data: utilisateurs } = useApiList<PublicUser>("users", { limite: 200 });

  const nomEncadrant = React.useMemo(() => {
    const table = new Map(utilisateurs.map((u) => [u.id, `${u.prenom} ${u.nom}`]));
    return (encadrantId: string) => table.get(encadrantId) ?? encadrantId;
  }, [utilisateurs]);

  const groupes = React.useMemo<GroupeRegles[]>(() => {
    const table = new Map<string, GroupeRegles>();
    for (const profil of profils.filter((p) => p.actif)) {
      const cle = `${profil.typeDocument}::${profil.discipline}`;
      const existant = table.get(cle);
      if (existant) {
        existant.profils.push(profil);
        existant.seuils.push(profil.seuilSoumission);
      } else {
        table.set(cle, {
          typeDocument: profil.typeDocument,
          discipline: profil.discipline,
          profils: [profil],
          seuils: [profil.seuilSoumission],
          conflit: false,
        });
      }
    }
    return Array.from(table.values())
      .map((groupe) => ({
        ...groupe,
        conflit: new Set(groupe.seuils).size > 1,
      }))
      .sort((a, b) => (a.discipline < b.discipline ? -1 : 1));
  }, [profils]);

  return (
    <div>
      <PageHeader
        title="Profils méthodologiques et conflits de règles"
        description="Vue transversale des exigences définies par chaque encadrant, et détection des attentes divergentes."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <GitBranch className="size-4 text-primary" />
            Profils actifs par type de mémoire × discipline
          </CardTitle>
          <CardDescription>
            Un conflit potentiel apparaît quand plusieurs profils du même type × discipline exigent
            un seuil de soumission différent.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : groupes.length === 0 ? (
            <EmptyState icon={GitBranch} title="Aucun profil méthodologique actif" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Discipline</TableHead>
                  <TableHead>Encadrants</TableHead>
                  <TableHead>Seuils de soumission</TableHead>
                  <TableHead className="text-right">Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupes.map((groupe) => (
                  <TableRow key={`${groupe.typeDocument}::${groupe.discipline}`}>
                    <TableCell>{LIBELLES_TYPE_DOCUMENT[groupe.typeDocument]}</TableCell>
                    <TableCell className="font-medium">{groupe.discipline}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {groupe.profils.map((p) => nomEncadrant(p.encadrantId)).join(", ")}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {groupe.seuils.map((s) => `${s} %`).join(" · ")}
                    </TableCell>
                    <TableCell className="text-right">
                      {groupe.conflit ? (
                        <Badge variant="warning" className="gap-1">
                          <AlertTriangle className="size-3" />
                          Conflit potentiel
                        </Badge>
                      ) : (
                        <Badge variant="success" className="gap-1">
                          <CheckCircle2 className="size-3" />
                          Cohérent
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
