"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, History, Loader2, RotateCcw, SplitSquareHorizontal } from "lucide-react";
import { toast } from "sonner";

import { useApiList } from "@/hooks/use-api-list";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiPatch } from "@/lib/api";
import { diffTexte } from "@/lib/diff";
import { cn, formatDateTime } from "@/lib/utils";
import type { VersionDocument } from "@/types";

/**
 * Historique des versions d'un document (spec section 29, écrans D69-D72) : un instantané par
 * transition clé (transmission à l'encadrant, décision de l'encadrant). Réutilisé par les
 * écrans étudiant et encadrant - `retourHref` change, `peutRestaurer` (réservé à l'étudiant
 * propriétaire, voir versions.service#restaurer côté backend) aussi.
 */
export function HistoriqueVersions({
  documentId,
  retourHref,
  peutRestaurer = false,
}: {
  documentId: string;
  retourHref: string;
  peutRestaurer?: boolean;
}) {
  const { data, isLoading, refetch } = useApiList<VersionDocument>("versions", {
    filtres: { documentId },
    tri: "numero",
    ordre: "desc",
    limite: 50,
  });

  const [selection, setSelection] = React.useState<string[]>([]);
  const [comparateurOuvert, setComparateurOuvert] = React.useState(false);
  const [restaurationEnCours, setRestaurationEnCours] = React.useState<string | null>(null);

  const basculerSelection = (id: string) => {
    setSelection((prec) => {
      if (prec.includes(id)) return prec.filter((v) => v !== id);
      if (prec.length >= 2) return [prec[1], id];
      return [...prec, id];
    });
  };

  const [idAncien, idNouveau] = React.useMemo(() => {
    if (selection.length !== 2) return [null, null] as const;
    const [a, b] = selection
      .map((id) => data.find((v) => v.id === id)!)
      .sort((x, y) => x.numero - y.numero);
    return [a?.id ?? null, b?.id ?? null] as const;
  }, [selection, data]);

  const versionAncienne = data.find((v) => v.id === idAncien) ?? null;
  const versionNouvelle = data.find((v) => v.id === idNouveau) ?? null;

  const lignesDiff = React.useMemo(() => {
    if (!versionAncienne || !versionNouvelle) return [];
    return diffTexte(versionAncienne.texteExtrait ?? "", versionNouvelle.texteExtrait ?? "");
  }, [versionAncienne, versionNouvelle]);

  const restaurer = async (version: VersionDocument) => {
    setRestaurationEnCours(version.id);
    try {
      await apiPatch("documents", documentId, {
        statut: version.statut,
        scoreConformite: version.scoreConformite,
        scoreForme: version.scoreForme,
        scoreFond: version.scoreFond,
        scoreCoherence: version.scoreCoherence,
        urlFichier: version.urlFichier,
        dateMaj: new Date().toISOString(),
      });
      toast.success(`Version V${version.numero} restaurée.`);
      setSelection([]);
      refetch();
    } catch {
      toast.error("La restauration a échoué.");
    } finally {
      setRestaurationEnCours(null);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Historique des versions"
        description="Un instantané est capturé à chaque transmission à l'encadrant et à chaque décision. Sélectionnez deux versions pour les comparer."
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={selection.length !== 2}
              onClick={() => setComparateurOuvert(true)}
            >
              <SplitSquareHorizontal className="size-4" />
              Comparer
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={retourHref}>
                <ArrowLeft className="size-4" />
                Retour
              </Link>
            </Button>
          </div>
        }
      />

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : data.length === 0 ? (
            <EmptyState
              icon={History}
              title="Aucune version pour l'instant"
              description="Une version sera créée dès la première transmission à l'encadrant."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead>Version</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Auteur</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Date</TableHead>
                  {peutRestaurer && <TableHead className="text-right">Action</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((version, index) => (
                  <TableRow key={version.id}>
                    <TableCell>
                      <Checkbox
                        checked={selection.includes(version.id)}
                        onCheckedChange={() => basculerSelection(version.id)}
                        aria-label={`Sélectionner la version ${version.numero}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">V{version.numero}</TableCell>
                    <TableCell>
                      <StatusBadge statut={version.statut} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {version.auteur === "etudiant" ? "Étudiant" : "Encadrant"}
                    </TableCell>
                    <TableCell>{version.scoreConformite} / 100</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(version.createdAt)}
                    </TableCell>
                    {peutRestaurer && (
                      <TableCell className="text-right">
                        {index > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={restaurationEnCours !== null}
                            onClick={() => restaurer(version)}
                          >
                            {restaurationEnCours === version.id ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <RotateCcw className="size-4" />
                            )}
                            Restaurer
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={comparateurOuvert} onOpenChange={setComparateurOuvert}>
        <DialogContent className="max-h-[80vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Comparaison V{versionAncienne?.numero} → V{versionNouvelle?.numero}
            </DialogTitle>
            <DialogDescription>
              Lignes supprimées en rouge, ajoutées en vert. Le texte comparé est celui extrait au
              moment de chaque version (absent pour les versions antérieures à cette
              fonctionnalité).
            </DialogDescription>
          </DialogHeader>
          {lignesDiff.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Aucun texte disponible pour l&apos;une de ces deux versions.
            </p>
          ) : (
            <pre className="overflow-x-auto rounded-lg border bg-muted/30 p-3 text-xs leading-relaxed whitespace-pre-wrap">
              {lignesDiff.map((ligne, index) => (
                <div
                  key={index}
                  className={cn(
                    ligne.type === "ajoutee" &&
                      "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
                    ligne.type === "supprimee" && "bg-destructive/15 text-destructive line-through"
                  )}
                >
                  {ligne.type === "ajoutee" ? "+ " : ligne.type === "supprimee" ? "- " : "  "}
                  {ligne.texte || " "}
                </div>
              ))}
            </pre>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setComparateurOuvert(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
