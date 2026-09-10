"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  BadgeCheck,
  BarChart3,
  Building2,
  FileText,
  GitBranch,
  UserCheck,
  UserCog,
  Users,
} from "lucide-react";

import {
  useDocumentsEtablissement,
  useMonEtablissement,
  usePromotions,
  useReferentielEtablissement,
} from "@/hooks/use-etablissement";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DELAI_INACTIVITE_JOURS,
  estApprenantInactif,
  joursEcoules,
  moyenneArrondie,
  statutApprenant,
} from "@/lib/etablissement";
import { formatDateTime } from "@/lib/utils";
import { LIBELLES_TYPE_DOCUMENT } from "@/types";
import type { DocumentSubmission, PublicUser } from "@/types";

/** Fenêtre au-delà de laquelle un apprenant n'est plus compté comme « actif ». */
const FENETRE_ACTIVITE_JOURS = 30;
const NB_EVENEMENTS_RECENTS = 10;

/** Tableau de bord de l'espace établissement (spec section 94). */
export default function EtablissementDashboardPage() {
  const { etablissement, isLoading: chargementEtab } = useMonEtablissement();
  const { promotionActive } = usePromotions(etablissement?.id);
  const referentiel = useReferentielEtablissement(etablissement?.id);
  const {
    documents,
    documentsParEtudiant,
    isLoading: chargementDocuments,
  } = useDocumentsEtablissement();

  /**
   * Tous les indicateurs sont recalculés en une passe à partir des mêmes données déjà
   * chargées : aucune requête supplémentaire, et une seule définition de « actif », « en
   * cours » ou « inactif » (celle de `lib/etablissement.ts`), partagée avec la liste des
   * apprenants - deux écrans ne peuvent donc pas afficher deux chiffres différents.
   */
  const indicateurs = React.useMemo(() => {
    const maintenant = new Date();
    const etudiants = referentiel.etudiants;
    const idsEtudiants = new Set(etudiants.map((etudiant) => etudiant.id));

    let apprenantsActifs = 0;
    let inactifs = 0;
    const scores: number[] = [];

    for (const etudiant of etudiants) {
      const document = documentsParEtudiant.get(etudiant.id) ?? null;
      const aDepose = statutApprenant(document) !== "pas_de_depot";

      if (
        aDepose &&
        document &&
        joursEcoules(document.dateMaj, maintenant) <= FENETRE_ACTIVITE_JOURS
      ) {
        apprenantsActifs += 1;
      }
      if (document) scores.push(document.scoreConformite);
      if (estApprenantInactif(document, document?.dateMaj ?? etudiant.createdAt, maintenant)) {
        inactifs += 1;
      }
    }

    const documentsEtablissement = documents.filter((document) =>
      idsEtudiants.has(document.etudiantId)
    );
    const memoiresEnCours = documentsEtablissement.filter(
      (document) => document.statut !== "valide" && document.statut !== "brouillon"
    ).length;
    const validesCeMois = documentsEtablissement.filter((document) => {
      if (document.statut !== "valide") return false;
      const date = new Date(document.dateMaj);
      return (
        date.getMonth() === maintenant.getMonth() && date.getFullYear() === maintenant.getFullYear()
      );
    }).length;

    return {
      apprenantsActifs,
      inactifs,
      memoiresEnCours,
      validesCeMois,
      scoreMoyen: moyenneArrondie(scores),
      evenementsRecents: documentsEtablissement.slice(0, NB_EVENEMENTS_RECENTS),
    };
  }, [referentiel.etudiants, documents, documentsParEtudiant]);

  if (chargementEtab || referentiel.isLoading || chargementDocuments) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!etablissement) {
    return (
      <EmptyState
        icon={Building2}
        title="Établissement introuvable"
        description="Votre compte n'est rattaché à aucun établissement pour l'instant."
      />
    );
  }

  const indicateursCles = [
    {
      titre: "Apprenants actifs",
      valeur: indicateurs.apprenantsActifs,
      detail: `sur ${referentiel.nbEtudiants} inscrits`,
      icone: UserCheck,
    },
    {
      titre: "Mémoires en cours",
      valeur: indicateurs.memoiresEnCours,
      detail: "hors mémoires validés",
      icone: FileText,
    },
    {
      titre: "Score moyen IA",
      valeur: indicateurs.scoreMoyen === null ? "—" : `${indicateurs.scoreMoyen}%`,
      detail: "conformité des derniers dépôts",
      icone: BarChart3,
    },
    {
      titre: "Validés ce mois",
      valeur: indicateurs.validesCeMois,
      detail: "mémoires acceptés par un encadreur",
      icone: BadgeCheck,
    },
  ];

  const compteursStructure = [
    {
      titre: "Filières",
      valeur: referentiel.filieres.length,
      icone: GitBranch,
      href: "/etablissement/filieres",
    },
    {
      titre: "Classes",
      valeur: referentiel.classes.length,
      icone: Users,
      href: "/etablissement/classes",
    },
    {
      titre: "Professeurs",
      valeur: referentiel.encadrants.length,
      icone: UserCog,
      href: "/etablissement/professeurs",
    },
    {
      titre: "Apprenants",
      valeur: referentiel.nbEtudiants,
      icone: Users,
      href: "/etablissement/apprenants",
    },
  ];

  return (
    <div>
      <PageHeader
        title={etablissement.nom}
        description={
          promotionActive
            ? `Vue d'ensemble · Promotion ${promotionActive.libelle}`
            : "Vue d'ensemble de votre espace établissement."
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {indicateursCles.map((indicateur) => (
          <Card key={indicateur.titre}>
            <CardHeader className="flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {indicateur.titre}
              </CardTitle>
              <indicateur.icone className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{indicateur.valeur}</p>
              <p className="mt-1 text-xs text-muted-foreground">{indicateur.detail}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {indicateurs.inactifs > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
          <AlertTriangle className="size-5 shrink-0 text-warning" />
          <span className="font-medium">
            {indicateurs.inactifs} apprenant
            {indicateurs.inactifs > 1 ? "s" : ""} sans dépôt depuis plus de {DELAI_INACTIVITE_JOURS}{" "}
            jours
          </span>
          <Button variant="link" size="sm" className="ml-auto h-auto p-0" asChild>
            <Link href="/etablissement/apprenants">Voir la liste →</Link>
          </Button>
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {compteursStructure.map((compteur) => (
          <Card key={compteur.titre}>
            <CardContent className="flex items-center justify-between py-4">
              <div>
                <p className="text-xs text-muted-foreground">{compteur.titre}</p>
                <p className="text-xl font-semibold">{compteur.valeur}</p>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href={compteur.href} aria-label={`Gérer : ${compteur.titre}`}>
                  <compteur.icone className="size-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <ActiviteRecente
        documents={indicateurs.evenementsRecents}
        etudiantsParId={new Map(referentiel.etudiants.map((etudiant) => [etudiant.id, etudiant]))}
        nomClasse={(classeId) =>
          referentiel.classes.find((classe) => classe.id === classeId)?.nom ?? "—"
        }
        niveauClasse={(classeId) => {
          const classe = referentiel.classes.find((item) => item.id === classeId);
          return classe ? LIBELLES_TYPE_DOCUMENT[classe.niveau] : "—";
        }}
      />

      {referentiel.classes.length === 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Pour commencer</CardTitle>
            <CardDescription>
              Créez une filière, puis une classe, pour obtenir un code que vos étudiants pourront
              utiliser afin de rejoindre automatiquement le bon espace.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild size="sm">
              <Link href="/etablissement/filieres">Créer une filière</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/etablissement/promotions/nouvelle">Créer une promotion</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/etablissement/classes">Créer une classe</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/** Dernières soumissions analysées par MemoAI, tous apprenants de l'établissement confondus. */
function ActiviteRecente({
  documents,
  etudiantsParId,
  nomClasse,
  niveauClasse,
}: {
  documents: DocumentSubmission[];
  etudiantsParId: Map<string, PublicUser>;
  nomClasse: (classeId: string | null | undefined) => string;
  niveauClasse: (classeId: string | null | undefined) => string;
}) {
  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="text-base">Activité récente</CardTitle>
        <CardDescription>Dernières soumissions analysées par MemoAI.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {documents.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">Aucune soumission pour le moment.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Apprenant</TableHead>
                <TableHead>Mémoire</TableHead>
                <TableHead>Niveau</TableHead>
                <TableHead>Classe</TableHead>
                <TableHead>Score IA</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Dernière activité</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((document) => {
                const etudiant = etudiantsParId.get(document.etudiantId);
                return (
                  <TableRow key={document.id}>
                    <TableCell className="font-medium">
                      {etudiant ? `${etudiant.prenom} ${etudiant.nom}` : "—"}
                    </TableCell>
                    <TableCell className="max-w-64 truncate">{document.titre}</TableCell>
                    <TableCell>{niveauClasse(etudiant?.classeId)}</TableCell>
                    <TableCell>{nomClasse(etudiant?.classeId)}</TableCell>
                    <TableCell className="font-semibold">{document.scoreConformite}%</TableCell>
                    <TableCell>
                      <StatusBadge statut={document.statut} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(document.dateMaj)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
