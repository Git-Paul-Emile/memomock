"use client";

import * as React from "react";
import { Trash2, UserCog } from "lucide-react";
import { toast } from "sonner";

import { useApiList } from "@/hooks/use-api-list";
import { useApiResource } from "@/hooks/use-api-resource";
import {
  useMonEtablissement,
  usePromotions,
  useReferentielEtablissement,
} from "@/hooks/use-etablissement";
import { DialogueInvitation } from "@/components/etablissement/dialogue-invitation";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { Toolbar } from "@/components/shared/toolbar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { apiDelete, apiList, apiPatch, apiPost } from "@/lib/api";
import { ETABLISSEMENT_INCONNU } from "@/lib/etablissement";
import { getInitials } from "@/lib/utils";
import { LIBELLES_TYPE_DOCUMENT } from "@/types";
import type { AffectationEncadrant, Classe, Filiere, Groupe, PublicUser } from "@/types";

const PAR_PAGE = 10;

function useAffectations(etablissementId?: string) {
  const { data, isLoading, refetch } = useApiResource<AffectationEncadrant[]>(
    ["affectations-encadrant", etablissementId],
    async () => {
      const reponse = await apiList<AffectationEncadrant>("affectations-encadrant", {
        filtres: { etablissementId },
        limite: 500,
      });
      return reponse.data;
    },
    { enabled: !!etablissementId }
  );

  return { affectations: data ?? [], isLoading, refetch };
}

/** Gestion des encadreurs d'un établissement et de leurs affectations (spec section 11). */
export default function ProfesseursPage() {
  const { etablissement, isLoading: chargementEtab } = useMonEtablissement();
  const { promotionActive } = usePromotions(etablissement?.id);
  const referentiel = useReferentielEtablissement(etablissement?.id);
  const { affectations, refetch: rafraichirAffectations } = useAffectations(etablissement?.id);

  const [page, setPage] = React.useState(1);
  const [recherche, setRecherche] = React.useState("");
  const [selection, setSelection] = React.useState<PublicUser | null>(null);

  // Recherche et pagination sont déléguées à l'API (q=, _page, _limit) via useApiList : aucune
  // liste complète n'est chargée côté client pour être filtrée ensuite.
  const {
    data: professeurs,
    total,
    totalPages,
    isLoading,
    refetch,
  } = useApiList<PublicUser>("users", {
    filtres: { etablissementId: etablissement?.id ?? ETABLISSEMENT_INCONNU, role: "encadrant" },
    page,
    limite: PAR_PAGE,
    recherche,
    tri: "nom",
  });

  const affectationsParEncadrant = React.useMemo(() => {
    const index = new Map<string, AffectationEncadrant[]>();
    for (const affectation of affectations) {
      const liste = index.get(affectation.encadrantId) ?? [];
      liste.push(affectation);
      index.set(affectation.encadrantId, liste);
    }
    return index;
  }, [affectations]);

  const changerRecherche = (valeur: string) => {
    setRecherche(valeur);
    setPage(1);
  };

  const basculerActivation = async (professeur: PublicUser) => {
    const actif = professeur.actif !== false;
    try {
      await apiPatch<PublicUser>("users", professeur.id, { actif: !actif });
      refetch();
      toast.success(actif ? "Compte désactivé." : "Compte réactivé.");
    } catch {
      toast.error("La mise à jour a échoué.");
    }
  };

  if (chargementEtab || isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Professeurs"
        description="Affectez les encadreurs aux filières, classes et groupes."
        actions={
          etablissement && (
            <DialogueInvitation
              etablissementId={etablissement.id}
              classes={referentiel.classes}
              role="encadrant"
            />
          )
        }
      />

      <Toolbar
        recherche={recherche}
        onRechercheChange={changerRecherche}
        placeholderRecherche="Rechercher un professeur…"
      />

      {professeurs.length === 0 ? (
        <EmptyState
          icon={UserCog}
          title="Aucun professeur"
          description="Invitez un encadreur par e-mail pour qu'il rejoigne votre établissement."
        />
      ) : (
        <Card>
          <CardContent className="divide-y p-0">
            {professeurs.map((professeur) => {
              const affectationsDuProf = affectationsParEncadrant.get(professeur.id) ?? [];
              const filieres = new Set(
                affectationsDuProf
                  .map(
                    (affectation) =>
                      referentiel.filieres.find((filiere) => filiere.id === affectation.filiereId)
                        ?.nom
                  )
                  .filter(Boolean) as string[]
              );
              const classes = new Set(
                affectationsDuProf.map((affectation) => affectation.classeId).filter(Boolean)
              );
              const actif = professeur.actif !== false;

              return (
                <div
                  key={professeur.id}
                  className="flex flex-wrap items-center gap-4 p-4 sm:flex-nowrap"
                >
                  <Avatar className="size-9">
                    <AvatarFallback>
                      {getInitials(professeur.nom, professeur.prenom)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-40 flex-1">
                    <p className="text-sm font-medium">
                      {professeur.prenom} {professeur.nom}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {filieres.size > 0
                        ? [...filieres].join(", ")
                        : (professeur.domainesExpertise ?? []).join(", ") || professeur.email}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {classes.size} classe{classes.size > 1 ? "s" : ""}
                    <br />
                    {referentiel.apprenantsParEncadrant.get(professeur.id) ?? 0} apprenant(s)
                  </p>
                  <Badge variant={actif ? "success" : "outline"}>
                    {actif ? "Actif" : "Désactivé"}
                  </Badge>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setSelection(professeur)}>
                      Affecter
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => basculerActivation(professeur)}
                    >
                      {actif ? "Désactiver" : "Réactiver"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <Pagination
        page={page}
        totalPages={totalPages}
        total={total}
        limite={PAR_PAGE}
        onPageChange={setPage}
      />

      {etablissement && (
        <PanneauAffectation
          professeur={selection}
          onClose={() => setSelection(null)}
          etablissementId={etablissement.id}
          promotionId={promotionActive?.id ?? null}
          filieres={referentiel.filieres}
          classes={referentiel.classes}
          groupesParClasse={referentiel.groupesParClasse}
          affectations={selection ? (affectationsParEncadrant.get(selection.id) ?? []) : []}
          onChange={rafraichirAffectations}
        />
      )}
    </div>
  );
}

/** Panneau latéral d'affectation d'un encadreur à un périmètre (filière / classe / groupe). */
function PanneauAffectation({
  professeur,
  onClose,
  etablissementId,
  promotionId,
  filieres,
  classes,
  groupesParClasse,
  affectations,
  onChange,
}: {
  professeur: PublicUser | null;
  onClose: () => void;
  etablissementId: string;
  promotionId: string | null;
  filieres: Filiere[];
  classes: Classe[];
  groupesParClasse: Map<string, Groupe[]>;
  affectations: AffectationEncadrant[];
  onChange: () => void;
}) {
  const [filiereId, setFiliereId] = React.useState<string | undefined>(undefined);
  const [classeId, setClasseId] = React.useState<string | undefined>(undefined);
  const [groupeId, setGroupeId] = React.useState<string | undefined>(undefined);
  const [enCours, setEnCours] = React.useState(false);

  // Les classes proposées sont restreintes à la filière choisie, et les groupes à la classe
  // choisie : l'interface ne laisse pas composer une affectation incohérente.
  const classesFiltrees = filiereId
    ? classes.filter((classe) => classe.filiereId === filiereId)
    : classes;
  const groupes = classeId ? (groupesParClasse.get(classeId) ?? []) : [];

  const ajouter = async () => {
    if (!professeur || !classeId) return;
    const classe = classes.find((item) => item.id === classeId);
    setEnCours(true);
    try {
      await apiPost<AffectationEncadrant>("affectations-encadrant", {
        etablissementId,
        encadrantId: professeur.id,
        promotionId: classe?.promotionId ?? promotionId,
        filiereId: filiereId ?? classe?.filiereId ?? null,
        niveau: classe?.niveau ?? null,
        classeId,
        groupeId: groupeId ?? null,
        createdAt: new Date().toISOString(),
      });

      // `Classe.encadrantIds` reste la source de vérité côté accès aux documents : on la tient
      // synchronisée avec l'affectation, sinon l'encadreur serait affecté « sur le papier »
      // sans voir les mémoires de sa classe.
      if (classe && !classe.encadrantIds.includes(professeur.id)) {
        await apiPatch<Classe>("classes", classe.id, {
          encadrantIds: [...classe.encadrantIds, professeur.id],
        });
      }

      setGroupeId(undefined);
      onChange();
      toast.success("Affectation ajoutée.");
    } catch {
      toast.error("L'affectation a échoué.");
    } finally {
      setEnCours(false);
    }
  };

  const retirer = async (affectation: AffectationEncadrant) => {
    try {
      await apiDelete("affectations-encadrant", affectation.id);
      onChange();
      toast.success("Affectation retirée.");
    } catch {
      toast.error("Le retrait a échoué.");
    }
  };

  const libelle = (affectation: AffectationEncadrant) => {
    const filiere = filieres.find((item) => item.id === affectation.filiereId)?.nom;
    const classe = classes.find((item) => item.id === affectation.classeId)?.nom;
    const groupe = affectation.groupeId
      ? groupesParClasse
          .get(affectation.classeId ?? "")
          ?.find((item) => item.id === affectation.groupeId)?.nom
      : null;
    return [
      filiere,
      affectation.niveau ? LIBELLES_TYPE_DOCUMENT[affectation.niveau] : null,
      classe,
      groupe,
    ]
      .filter(Boolean)
      .join(" · ");
  };

  return (
    <Sheet open={!!professeur} onOpenChange={(ouvert) => !ouvert && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>
            Affecter {professeur?.prenom} {professeur?.nom}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 px-4 pb-6">
          <div className="space-y-3">
            <p className="text-sm font-semibold">Nouvelle affectation</p>
            <div className="grid grid-cols-2 gap-3">
              <Select
                value={filiereId}
                onValueChange={(valeur) => {
                  setFiliereId(valeur);
                  setClasseId(undefined);
                  setGroupeId(undefined);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Filière" />
                </SelectTrigger>
                <SelectContent>
                  {filieres.map((filiere) => (
                    <SelectItem key={filiere.id} value={filiere.id}>
                      {filiere.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={classeId}
                onValueChange={(valeur) => {
                  setClasseId(valeur);
                  setGroupeId(undefined);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Classe" />
                </SelectTrigger>
                <SelectContent>
                  {classesFiltrees.map((classe) => (
                    <SelectItem key={classe.id} value={classe.id}>
                      {classe.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={groupeId} onValueChange={setGroupeId} disabled={groupes.length === 0}>
                <SelectTrigger className="col-span-2 w-full">
                  <SelectValue
                    placeholder={groupes.length === 0 ? "Aucun groupe" : "Groupe (optionnel)"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {groupes.map((groupe) => (
                    <SelectItem key={groupe.id} value={groupe.id}>
                      {groupe.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="secondary"
              className="w-full"
              onClick={ajouter}
              disabled={!classeId || enCours}
            >
              Ajouter l&apos;affectation
            </Button>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold">Affectations actuelles</p>
            {affectations.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucune affectation pour l&apos;instant.
              </p>
            ) : (
              affectations.map((affectation) => (
                <div
                  key={affectation.id}
                  className="flex items-center gap-2 rounded-lg bg-muted p-3 text-sm"
                >
                  <span className="flex-1">{libelle(affectation)}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Retirer cette affectation"
                    onClick={() => retirer(affectation)}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
