"use client";

import * as React from "react";
import { Eye, GraduationCap } from "lucide-react";

import { useApiList } from "@/hooks/use-api-list";
import { useApiResource } from "@/hooks/use-api-resource";
import {
  useDocumentsEtablissement,
  useMonEtablissement,
  useReferentielEtablissement,
} from "@/hooks/use-etablissement";
import { DialogueInvitation } from "@/components/etablissement/dialogue-invitation";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { StatusBadge } from "@/components/shared/status-badge";
import { Toolbar } from "@/components/shared/toolbar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiList } from "@/lib/api";
import {
  ETABLISSEMENT_INCONNU,
  estApprenantInactif,
  LIBELLES_STATUT_APPRENANT,
  NIVEAUX_ETABLISSEMENT,
  statutApprenant,
  VARIANT_STATUT_APPRENANT,
  type StatutApprenant,
} from "@/lib/etablissement";
import { formatDateTime, getInitials } from "@/lib/utils";
import { LIBELLES_TYPE_DOCUMENT } from "@/types";
import type { DocumentSubmission, PublicUser } from "@/types";

const PAR_PAGE = 10;
const TOUS = "tous";

/** Statuts proposés dans le filtre, dans l'ordre du cycle de vie d'un mémoire. */
const STATUTS_APPRENANT: StatutApprenant[] = [
  "pas_de_depot",
  "a_corriger",
  "attente_encadrant",
  "en_revision",
  "valide",
];

/** Suivi des apprenants d'un établissement et de la conformité de leurs mémoires. */
export default function ApprenantsPage() {
  const { etablissement, isLoading: chargementEtab } = useMonEtablissement();
  const referentiel = useReferentielEtablissement(etablissement?.id);
  const { documentsParEtudiant } = useDocumentsEtablissement();

  const [page, setPage] = React.useState(1);
  const [recherche, setRecherche] = React.useState("");
  const [filiereId, setFiliereId] = React.useState<string>(TOUS);
  const [niveau, setNiveau] = React.useState<string>(TOUS);
  const [classeId, setClasseId] = React.useState<string>(TOUS);
  const [statut, setStatut] = React.useState<string>(TOUS);
  const [selection, setSelection] = React.useState<PublicUser | null>(null);

  /**
   * Le statut d'un apprenant est DÉRIVÉ de son dernier document : l'API `users` ne sait donc
   * pas l'appliquer comme filtre. Tant qu'aucun filtre de statut n'est actif, pagination, tri,
   * recherche et filtres structurels sont entièrement délégués au serveur (_page, _limit,
   * _sort, q, classeId). Dès qu'un statut est demandé, on bascule sur une pagination locale
   * (chargement de la cohorte puis filtrage), sinon la page affichée ne contiendrait qu'une
   * fraction arbitraire des apprenants concernés et le compteur serait faux.
   *
   * En production, cette bascule disparaît : la ressource `GET /etablissements/:id/apprenants`
   * exposerait `statut` comme filtre serveur, calculé en base par jointure sur le document.
   */
  const filtrageLocal = statut !== TOUS;

  const classesFiltrees = React.useMemo(
    () =>
      referentiel.classes.filter(
        (classe) =>
          (filiereId === TOUS || classe.filiereId === filiereId) &&
          (niveau === TOUS || classe.niveau === niveau)
      ),
    [referentiel.classes, filiereId, niveau]
  );

  // Filière et niveau ne sont pas portés par l'utilisateur mais par sa classe : le filtre
  // envoyé au serveur reste `classeId`, la filière/le niveau ne faisant que restreindre les
  // classes sélectionnables.
  const classeFiltre = classeId !== TOUS ? classeId : undefined;

  const {
    data: lignes,
    total,
    totalPages,
    isLoading,
  } = useApiList<PublicUser>("users", {
    filtres: {
      etablissementId: etablissement?.id ?? ETABLISSEMENT_INCONNU,
      role: "etudiant",
      ...(classeFiltre ? { classeId: classeFiltre } : {}),
    },
    page: filtrageLocal ? 1 : page,
    limite: filtrageLocal ? 500 : PAR_PAGE,
    recherche,
    tri: "nom",
  });

  const idsClassesRetenues = React.useMemo(
    () => new Set(classesFiltrees.map((classe) => classe.id)),
    [classesFiltrees]
  );

  const apprenantsFiltres = React.useMemo(() => {
    let resultat = lignes;

    // Filière / niveau sans classe précise : on restreint aux classes correspondantes.
    if (classeId === TOUS && (filiereId !== TOUS || niveau !== TOUS)) {
      resultat = resultat.filter(
        (apprenant) => apprenant.classeId && idsClassesRetenues.has(apprenant.classeId)
      );
    }

    if (filtrageLocal) {
      resultat = resultat.filter(
        (apprenant) => statutApprenant(documentsParEtudiant.get(apprenant.id)) === statut
      );
    }

    return resultat;
  }, [
    lignes,
    classeId,
    filiereId,
    niveau,
    idsClassesRetenues,
    filtrageLocal,
    statut,
    documentsParEtudiant,
  ]);

  const totalAffiche = filtrageLocal ? apprenantsFiltres.length : total;
  const totalPagesAffiche = filtrageLocal
    ? Math.max(1, Math.ceil(apprenantsFiltres.length / PAR_PAGE))
    : totalPages;
  const apprenantsPage = filtrageLocal
    ? apprenantsFiltres.slice((page - 1) * PAR_PAGE, page * PAR_PAGE)
    : apprenantsFiltres;

  const reinitialiserPage =
    <T,>(setter: (valeur: T) => void) =>
    (valeur: T) => {
      setter(valeur);
      setPage(1);
    };

  if (chargementEtab || isLoading || referentiel.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Apprenants"
        description="Suivez les mémoires et leur conformité académique."
        actions={
          etablissement && (
            <DialogueInvitation
              etablissementId={etablissement.id}
              classes={referentiel.classes}
              role="etudiant"
            />
          )
        }
      />

      <Toolbar
        recherche={recherche}
        onRechercheChange={reinitialiserPage(setRecherche)}
        placeholderRecherche="Rechercher un apprenant…"
      >
        <Select
          value={filiereId}
          onValueChange={reinitialiserPage((valeur: string) => {
            setFiliereId(valeur);
            setClasseId(TOUS);
          })}
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TOUS}>Toutes les filières</SelectItem>
            {referentiel.filieres.map((filiere) => (
              <SelectItem key={filiere.id} value={filiere.id}>
                {filiere.nom}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={niveau}
          onValueChange={reinitialiserPage((valeur: string) => {
            setNiveau(valeur);
            setClasseId(TOUS);
          })}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TOUS}>Tous les niveaux</SelectItem>
            {NIVEAUX_ETABLISSEMENT.map((valeur) => (
              <SelectItem key={valeur} value={valeur}>
                {LIBELLES_TYPE_DOCUMENT[valeur]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={classeId} onValueChange={reinitialiserPage(setClasseId)}>
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TOUS}>Toutes les classes</SelectItem>
            {classesFiltrees.map((classe) => (
              <SelectItem key={classe.id} value={classe.id}>
                {classe.nom}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statut} onValueChange={reinitialiserPage(setStatut)}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TOUS}>Tous les statuts</SelectItem>
            {STATUTS_APPRENANT.map((valeur) => (
              <SelectItem key={valeur} value={valeur}>
                {LIBELLES_STATUT_APPRENANT[valeur]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Toolbar>

      {apprenantsPage.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="Aucun apprenant"
          description="Aucun apprenant ne correspond à ces critères."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Apprenant</TableHead>
                  <TableHead>Filière</TableHead>
                  <TableHead>Niveau</TableHead>
                  <TableHead>Classe</TableHead>
                  <TableHead>Groupe</TableHead>
                  <TableHead>Encadreur</TableHead>
                  <TableHead className="w-40">Score IA</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apprenantsPage.map((apprenant) => {
                  const document = documentsParEtudiant.get(apprenant.id) ?? null;
                  const classe = referentiel.classes.find((item) => item.id === apprenant.classeId);
                  const filiere = referentiel.filieres.find(
                    (item) => item.id === classe?.filiereId
                  );
                  const groupe = referentiel.groupes.find((item) => item.id === apprenant.groupeId);
                  const encadrant = apprenant.encadrantId
                    ? referentiel.encadrantsParId.get(apprenant.encadrantId)
                    : undefined;
                  const statutLigne = statutApprenant(document);
                  const inactif = estApprenantInactif(
                    document,
                    document?.dateMaj ?? apprenant.createdAt
                  );

                  return (
                    <TableRow key={apprenant.id}>
                      <TableCell className="font-medium">
                        {apprenant.prenom} {apprenant.nom}
                        {inactif && (
                          <Badge variant="warning" className="ml-2">
                            Inactif
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {filiere?.nom ?? apprenant.filiere ?? "—"}
                      </TableCell>
                      <TableCell>{classe ? LIBELLES_TYPE_DOCUMENT[classe.niveau] : "—"}</TableCell>
                      <TableCell>{classe?.nom ?? "—"}</TableCell>
                      <TableCell>{groupe?.nom ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {encadrant ? `${encadrant.prenom} ${encadrant.nom}` : "—"}
                      </TableCell>
                      <TableCell>
                        {document ? (
                          <div className="flex items-center gap-2">
                            <Progress value={document.scoreConformite} className="w-20" />
                            <span className="text-xs font-medium">{document.scoreConformite}%</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={VARIANT_STATUT_APPRENANT[statutLigne]}>
                          {LIBELLES_STATUT_APPRENANT[statutLigne]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Voir la fiche de ${apprenant.prenom} ${apprenant.nom}`}
                          onClick={() => setSelection(apprenant)}
                        >
                          <Eye className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Pagination
        page={page}
        totalPages={totalPagesAffiche}
        total={totalAffiche}
        limite={PAR_PAGE}
        onPageChange={setPage}
      />

      <FicheApprenant apprenant={selection} onClose={() => setSelection(null)} />
    </div>
  );
}

/**
 * Fiche détaillée d'un apprenant, ouverte à la demande. L'historique complet de ses documents
 * n'est chargé qu'à l'ouverture du panneau (`enabled`), et non pour chaque ligne du tableau.
 */
function FicheApprenant({
  apprenant,
  onClose,
}: {
  apprenant: PublicUser | null;
  onClose: () => void;
}) {
  const { data: documents, isLoading } = useApiResource<DocumentSubmission[]>(
    ["documents-apprenant", apprenant?.id],
    async () => {
      const reponse = await apiList<DocumentSubmission>("documents", {
        filtres: { etudiantId: apprenant!.id },
        limite: 50,
        tri: "dateMaj",
        ordre: "desc",
      });
      return reponse.data;
    },
    { enabled: !!apprenant }
  );

  const historique = documents ?? [];

  return (
    <Sheet open={!!apprenant} onOpenChange={(ouvert) => !ouvert && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-3">
            <Avatar className="size-10">
              <AvatarFallback>
                {apprenant ? getInitials(apprenant.nom, apprenant.prenom) : ""}
              </AvatarFallback>
            </Avatar>
            <span>
              {apprenant?.prenom} {apprenant?.nom}
              <span className="block text-xs font-normal text-muted-foreground">
                {apprenant?.email}
              </span>
            </span>
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 px-4 pb-6">
          <div>
            <h3 className="mb-2 text-sm font-semibold">Historique des soumissions</h3>
            {isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : historique.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune soumission pour le moment.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Titre</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historique.map((document) => (
                    <TableRow key={document.id}>
                      <TableCell>
                        <span className="block font-medium">{document.titre}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(document.dateMaj)}
                        </span>
                      </TableCell>
                      <TableCell className="font-semibold">{document.scoreConformite}%</TableCell>
                      <TableCell>
                        <StatusBadge statut={document.statut} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          <p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
            L&apos;administration de l&apos;établissement a une vue de pilotage : le contenu des
            mémoires reste accessible au seul encadreur de l&apos;apprenant et à celui-ci
            (cloisonnement RBAC, voir <code>components/layout/route-guard.tsx</code>).
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
