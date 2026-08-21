"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CalendarClock,
  ClipboardCheck,
  FileStack,
  Hourglass,
  PackageCheck,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/context/auth-context";
import { useApiList } from "@/hooks/use-api-list";
import { useApiResource } from "@/hooks/use-api-resource";
import { PageHeader } from "@/components/shared/page-header";
import { Toolbar } from "@/components/shared/toolbar";
import { Pagination } from "@/components/shared/pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { apiGet, apiList, apiPost } from "@/lib/api";
import { resoudreChapitres } from "@/lib/canevas";
import { STATUT_DOCUMENT_LABELS, STATUTS_FILTRABLES } from "@/lib/constants";
import { resoudreLivrables } from "@/lib/livrables";
import { retardsDocument, retardsSeances, type Retard } from "@/lib/retards";
import { formatDate, getInitials } from "@/lib/utils";
import type {
  ChapitreCanevas,
  Classe,
  CritereChapitre,
  DocumentSubmission,
  Livrable,
  ProfilEncadrant,
  PublicUser,
  Seance,
  ValidationChapitre,
} from "@/types";

interface RetardEtudiant {
  etudiant: PublicUser;
  retards: Retard[];
}

const LIMITE_PAGE = 8;

export default function EncadrantDashboardPage() {
  const { user } = useAuth();
  const [recherche, setRecherche] = React.useState("");
  const [statut, setStatut] = React.useState<string>("tous");
  const [classeFiltre, setClasseFiltre] = React.useState<string>("toutes");
  const [page, setPage] = React.useState(1);

  const { data: etudiants } = useApiList<PublicUser>("users", {
    filtres: { encadrantId: user?.id },
    limite: 100,
  });
  const etudiantsParId = React.useMemo(
    () => Object.fromEntries(etudiants.map((e) => [e.id, e])),
    [etudiants]
  );

  const { data: toutesLesClasses } = useApiList<Classe>("classes", { limite: 200 });
  const mesClasses = toutesLesClasses.filter((c) => user && c.encadrantIds.includes(user.id));

  const { data: tousLesDocuments } = useApiList<DocumentSubmission>("documents", {
    filtres: { encadrantId: user?.id },
    limite: 200,
  });

  const aTraiter = tousLesDocuments.filter((d) => d.statut === "pret_pour_encadrant").length;
  const enRelecture = tousLesDocuments.filter((d) => d.statut === "en_relecture").length;
  const valides = tousLesDocuments.filter((d) => d.statut === "valide").length;

  const { data: retardsParEtudiant, refetch: refetchRetards } = useApiResource<RetardEtudiant[]>(
    ["retards-encadrant", user?.id, tousLesDocuments.map((d) => d.id).join(",")],
    async () => {
      const seancesRes = await apiList<Seance>("seances", {
        filtres: { encadrantId: user!.id },
        limite: 200,
      });
      const documentsActifs = tousLesDocuments.filter((d) => d.statut !== "valide" && d.statut !== "refuse");
      const resultat: RetardEtudiant[] = [];

      for (const etudiant of etudiants) {
        const retards: Retard[] = retardsSeances(
          seancesRes.data.filter((s) => s.etudiantId === etudiant.id)
        );

        const documentEtudiant = documentsActifs.find((d) => d.etudiantId === etudiant.id);
        if (documentEtudiant?.profilEncadrantId) {
          const profil = await apiGet<ProfilEncadrant>(
            "profils-encadrant",
            documentEtudiant.profilEncadrantId
          ).catch(() => null);
          if (profil) {
            const livrablesRes = await apiList<Livrable>("livrables", {
              filtres: { documentId: documentEtudiant.id },
              limite: 50,
            });
            const livrablesAffiches = resoudreLivrables(profil.livrablesAttendus, livrablesRes.data);
            let chapitresAffiches: ReturnType<typeof resoudreChapitres> = [];
            if (profil.canevasId) {
              const [chapitresRes, criteresRes, validationsRes] = await Promise.all([
                apiList<ChapitreCanevas>("chapitres-canevas", {
                  filtres: { canevasId: profil.canevasId },
                  limite: 100,
                }),
                apiList<CritereChapitre>("criteres-chapitre", { limite: 500 }),
                apiList<ValidationChapitre>("validations-chapitre", {
                  filtres: { documentId: documentEtudiant.id },
                  limite: 100,
                }),
              ]);
              chapitresAffiches = resoudreChapitres(
                chapitresRes.data,
                criteresRes.data,
                validationsRes.data
              );
            }
            retards.push(
              ...retardsDocument(documentEtudiant, livrablesAffiches, chapitresAffiches)
            );
          }
        }

        if (retards.length > 0) resultat.push({ etudiant, retards });
      }

      return resultat;
    },
    { enabled: !!user && etudiants.length > 0 }
  );

  // Feature 81 : "Livrables à corriger" et "Séances cette semaine", tels que donnés en exemple
  // dans le cahier des charges pour le tableau de bord encadreur.
  const { data: livrablesACorriger } = useApiResource<number>(
    ["livrables-a-corriger", user?.id, tousLesDocuments.map((d) => d.id).join(",")],
    async () => {
      const documentsActifs = tousLesDocuments.filter(
        (d) => d.statut !== "valide" && d.statut !== "refuse"
      );
      let total = 0;
      for (const doc of documentsActifs) {
        const res = await apiList<Livrable>("livrables", {
          filtres: { documentId: doc.id, statut: "soumis" },
          limite: 50,
        });
        total += res.total;
      }
      return total;
    },
    { enabled: !!user && tousLesDocuments.length > 0 }
  );

  const { data: seancesEncadrant } = useApiList<Seance>("seances", {
    filtres: { encadrantId: user?.id },
    limite: 200,
  });
  const debutSemaine = new Date();
  debutSemaine.setHours(0, 0, 0, 0);
  const finSemaine = new Date(debutSemaine);
  finSemaine.setDate(finSemaine.getDate() + 7);
  const seancesCetteSemaine = seancesEncadrant.filter((s) => {
    const dateSeance = new Date(s.dateHeure);
    return s.statut === "planifiee" && dateSeance >= debutSemaine && dateSeance < finSemaine;
  }).length;

  const relancer = async (etudiantId: string) => {
    await apiPost("notifications", {
      userId: etudiantId,
      titre: "Rappel : échéance dépassée",
      message: "Votre encadrant vous rappelle qu'une ou plusieurs échéances de suivi sont dépassées.",
      type: "retard",
      lu: false,
      date: new Date().toISOString(),
    });
    toast.success("Rappel envoyé.");
  };

  const relancerTous = async () => {
    if (!retardsParEtudiant) return;
    await Promise.all(retardsParEtudiant.map((r) => relancer(r.etudiant.id)));
    refetchRetards();
  };

  // Filtre par classe (spec section 88) : le mock ne sait filtrer que par égalité exacte d'un
  // champ, or un document n'a pas de `classeId` propre (seul l'étudiant en a un) - on récupère
  // donc tous les documents de l'encadrant puis on les recoupe côté client avec les étudiants de
  // la classe choisie, avec une pagination calculée localement.
  const classeActive = classeFiltre !== "toutes";
  const { data: documentsPourFiltreClasse } = useApiList<DocumentSubmission>("documents", {
    limite: 500,
    filtres: { encadrantId: user?.id, statut: statut === "tous" ? undefined : statut },
  });

  const idsEtudiantsClasse = React.useMemo(
    () => new Set(etudiants.filter((e) => e.classeId === classeFiltre).map((e) => e.id)),
    [etudiants, classeFiltre]
  );

  const documentsFiltresParClasse = React.useMemo(() => {
    if (!classeActive) return [];
    const rechercheBasse = recherche.trim().toLowerCase();
    return documentsPourFiltreClasse
      .filter((d) => idsEtudiantsClasse.has(d.etudiantId))
      .filter((d) => !rechercheBasse || d.titre.toLowerCase().includes(rechercheBasse));
  }, [classeActive, documentsPourFiltreClasse, idsEtudiantsClasse, recherche]);

  const { data: dataPagineeServeur, total, totalPages, isLoading } = useApiList<DocumentSubmission>(
    "documents",
    {
      page,
      limite: LIMITE_PAGE,
      tri: "dateMaj",
      ordre: "desc",
      recherche,
      filtres: { encadrantId: user?.id, statut: statut === "tous" ? undefined : statut },
    }
  );

  const data = classeActive
    ? documentsFiltresParClasse.slice((page - 1) * LIMITE_PAGE, page * LIMITE_PAGE)
    : dataPagineeServeur;
  const totalAffiche = classeActive ? documentsFiltresParClasse.length : total;
  const totalPagesAffiche = classeActive
    ? Math.max(1, Math.ceil(documentsFiltresParClasse.length / LIMITE_PAGE))
    : totalPages;

  return (
    <div>
      <PageHeader
        title={`Bonjour ${user?.prenom}`}
        description="Vue d'ensemble des documents soumis par vos étudiants."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Users className="size-4" />
              Étudiants suivis
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{etudiants.length}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Hourglass className="size-4" />À relire
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{aTraiter}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <FileStack className="size-4" />
              En relecture
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{enRelecture}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <ClipboardCheck className="size-4" />
              Validés
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{valides}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <AlertTriangle className="size-4" />
              En retard
            </CardTitle>
          </CardHeader>
          <CardContent
            className={`text-2xl font-semibold ${retardsParEtudiant?.length ? "text-destructive" : ""}`}
          >
            {retardsParEtudiant?.length ?? 0}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <PackageCheck className="size-4" />
              Livrables à corriger
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{livrablesACorriger ?? 0}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <CalendarClock className="size-4" />
              Séances cette semaine
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{seancesCetteSemaine}</CardContent>
        </Card>
      </div>

      {!!retardsParEtudiant?.length && (
        <Card className="mb-6">
          <CardHeader className="flex-row items-start justify-between">
            <div>
              <CardTitle className="text-base">Étudiants en retard</CardTitle>
              <CardDescription>
                Échéances de livrables, chapitres ou séances non tenues.
              </CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={relancerTous}>
              Relancer tout le monde
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {retardsParEtudiant.map(({ etudiant, retards }) => (
              <div key={etudiant.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">
                    {etudiant.prenom} {etudiant.nom}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {retards.map((r, i) => (
                      <Badge key={i} variant="destructive" className="text-[10px]">
                        {r.libelle}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => relancer(etudiant.id)}>
                  Relancer
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Documents reçus</CardTitle>
        </CardHeader>
        <CardContent>
          <Toolbar
            recherche={recherche}
            onRechercheChange={(v) => {
              setRecherche(v);
              setPage(1);
            }}
            placeholderRecherche="Rechercher un document…"
          >
            <Select
              value={statut}
              onValueChange={(v) => {
                setStatut(v);
                setPage(1);
              }}
            >
              <SelectTrigger size="sm" className="w-52">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                {STATUTS_FILTRABLES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s === "tous" ? "Tous les statuts" : STATUT_DOCUMENT_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {mesClasses.length > 0 && (
              <Select
                value={classeFiltre}
                onValueChange={(v) => {
                  setClasseFiltre(v);
                  setPage(1);
                }}
              >
                <SelectTrigger size="sm" className="w-52">
                  <SelectValue placeholder="Classe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="toutes">Toutes les classes</SelectItem>
                  {mesClasses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </Toolbar>

          {!isLoading && data.length === 0 ? (
            <EmptyState
              icon={FileStack}
              title="Aucun document trouvé"
              description="Ajustez votre recherche ou vos filtres."
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Étudiant</TableHead>
                    <TableHead>Titre</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Mise à jour</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((doc) => {
                    const etudiant = etudiantsParId[doc.etudiantId];
                    return (
                      <TableRow key={doc.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="size-7">
                              <AvatarFallback>
                                {etudiant ? getInitials(etudiant.nom, etudiant.prenom) : "?"}
                              </AvatarFallback>
                            </Avatar>
                            <span className="whitespace-nowrap text-sm">
                              {etudiant ? `${etudiant.prenom} ${etudiant.nom}` : "-"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs truncate font-medium">{doc.titre}</TableCell>
                        <TableCell>
                          <StatusBadge statut={doc.statut} />
                        </TableCell>
                        <TableCell>{doc.scoreConformite} / 100</TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(doc.dateMaj)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/encadrant/documents/${doc.id}/relecture`}>Ouvrir</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <Pagination
                page={page}
                totalPages={totalPagesAffiche}
                total={totalAffiche}
                limite={LIMITE_PAGE}
                onPageChange={setPage}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
