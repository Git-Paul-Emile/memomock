"use client";

import * as React from "react";
import { ChevronDown, Info, ScrollText } from "lucide-react";
import { toast } from "sonner";

import { useApiResource } from "@/hooks/use-api-resource";
import { useMonEtablissement } from "@/hooks/use-etablissement";
import { Pilule } from "@/components/etablissement/pilule";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { apiList, apiPatch, apiPost } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  LIBELLES_POSITION_PAGINATION,
  LIBELLES_STYLE_REDACTIONNEL,
  LIBELLES_VOIX_REDACTION,
} from "@/types";
import type {
  FormatCitation,
  NormesEtablissement,
  PositionPagination,
  StyleRedactionnel,
  VoixRedaction,
} from "@/types";

const FORMATS_CITATION: FormatCitation[] = ["APA 7", "APA 6", "ISO 690", "Chicago", "MLA"];
const TYPES_SOURCES = [
  "Revues scientifiques",
  "Ouvrages",
  "Thèses",
  "Rapports officiels",
  "Sites web",
];
const POLICES = ["Times New Roman", "Arial", "Calibri"];
const TAILLES = ["11pt", "12pt"];
const INTERLIGNES = ["Simple", "1.5", "Double"];

/**
 * Valeurs de départ appliquées à un établissement qui n'a jamais enregistré ses normes.
 * Elles ne sont PAS écrites en base tant que l'administrateur n'a pas validé : le formulaire
 * s'ouvre pré-rempli, l'enregistrement crée alors l'enregistrement (POST) puis le met à jour
 * (PATCH) - voir `enregistrer` ci-dessous.
 */
const NORMES_PAR_DEFAUT: Omit<NormesEtablissement, "id" | "etablissementId" | "updatedAt"> = {
  formatCitation: "APA 7",
  sourcesMinimum: 20,
  typesSourcesAcceptees: ["Revues scientifiques", "Ouvrages", "Thèses"],
  partiesIntroduction: 5,
  positionPagination: "bas_de_page",
  styleRedactionnel: "academique_formel",
  voix: "impersonnelle",
  police: "Times New Roman",
  taillePolice: "12pt",
  interligne: "1.5",
  margesCm: "2.5",
};

type Brouillon = typeof NORMES_PAR_DEFAUT;

/** Isole les champs éditables d'un enregistrement de normes (sans id / clés techniques). */
function extraireBrouillon(normes: NormesEtablissement): Brouillon {
  return {
    formatCitation: normes.formatCitation,
    sourcesMinimum: normes.sourcesMinimum,
    typesSourcesAcceptees: normes.typesSourcesAcceptees,
    partiesIntroduction: normes.partiesIntroduction,
    positionPagination: normes.positionPagination,
    styleRedactionnel: normes.styleRedactionnel,
    voix: normes.voix,
    police: normes.police,
    taillePolice: normes.taillePolice,
    interligne: normes.interligne,
    margesCm: normes.margesCm,
  };
}

/** Référentiel académique par défaut de l'établissement (spec section 100). */
export default function NormesPage() {
  const { etablissement, isLoading: chargementEtab } = useMonEtablissement();

  const {
    data: normes,
    isLoading,
    refetch,
  } = useApiResource<NormesEtablissement | null>(
    ["normes-etablissement", etablissement?.id],
    async () => {
      const reponse = await apiList<NormesEtablissement>("normes-etablissement", {
        filtres: { etablissementId: etablissement!.id },
        limite: 1,
      });
      return reponse.data[0] ?? null;
    },
    { enabled: !!etablissement }
  );

  const [brouillon, setBrouillon] = React.useState<Brouillon>(NORMES_PAR_DEFAUT);
  const [modifie, setModifie] = React.useState(false);
  const [enCours, setEnCours] = React.useState(false);
  const [sectionsOuvertes, setSectionsOuvertes] = React.useState<number[]>([1, 2, 3]);
  // Identifiant des normes actuellement recopiées dans le brouillon. Sert de garde au
  // recalage ci-dessous : on ne réinitialise que quand l'enregistrement source change
  // (chargement initial, ou POST qui crée une nouvelle ressource), pas à chaque requête.
  const [sourceBrouillon, setSourceBrouillon] = React.useState<string | null>(null);

  // Recalage pendant le rendu (pattern React « ajuster un état quand une prop change ») plutôt
  // qu'un effet : évite un rendu intermédiaire avec le brouillon périmé.
  if (normes && normes.id !== sourceBrouillon) {
    setSourceBrouillon(normes.id);
    setBrouillon(extraireBrouillon(normes));
    setModifie(false);
  }

  const changer = <C extends keyof Brouillon>(cle: C, valeur: Brouillon[C]) => {
    setBrouillon((actuel) => ({ ...actuel, [cle]: valeur }));
    setModifie(true);
  };

  const basculerTypeSource = (type: string) => {
    const actuels = brouillon.typesSourcesAcceptees;
    changer(
      "typesSourcesAcceptees",
      actuels.includes(type) ? actuels.filter((item) => item !== type) : [...actuels, type]
    );
  };

  const basculerSection = (numero: number) => {
    setSectionsOuvertes((actuelles) =>
      actuelles.includes(numero)
        ? actuelles.filter((item) => item !== numero)
        : [...actuelles, numero]
    );
  };

  const enregistrer = async () => {
    if (!etablissement) return;
    setEnCours(true);
    try {
      const charge = {
        ...brouillon,
        // Les champs numériques transitent par des <input> : on les normalise ici plutôt que
        // de laisser des chaînes atterrir en base.
        sourcesMinimum: Number(brouillon.sourcesMinimum) || 0,
        partiesIntroduction: Number(brouillon.partiesIntroduction) || 0,
        etablissementId: etablissement.id,
        updatedAt: new Date().toISOString(),
      };

      if (normes) {
        await apiPatch<NormesEtablissement>("normes-etablissement", normes.id, charge);
      } else {
        await apiPost<NormesEtablissement>("normes-etablissement", charge);
      }

      refetch();
      setModifie(false);
      toast.success("Normes enregistrées.");
    } catch {
      toast.error("L'enregistrement a échoué.");
    } finally {
      setEnCours(false);
    }
  };

  if (chargementEtab || isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!etablissement) {
    return (
      <EmptyState
        icon={ScrollText}
        title="Établissement introuvable"
        description="Votre compte n'est rattaché à aucun établissement pour l'instant."
      />
    );
  }

  return (
    <div className="mx-auto max-w-3xl pb-24">
      <PageHeader
        title="Normes par défaut"
        description="Référentiel académique de l'établissement."
      />

      <p className="mb-5 flex gap-3 rounded-lg border bg-muted p-4 text-sm text-muted-foreground">
        <Info className="size-5 shrink-0" />
        Ces normes sont appliquées par défaut à tous les encadreurs. Chaque professeur peut les
        redéfinir pour ses propres classes depuis son profil pédagogique.
      </p>

      <div className="space-y-4">
        <Section
          numero={1}
          titre="Citations et bibliographie"
          ouvertes={sectionsOuvertes}
          onToggle={basculerSection}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Format</Label>
              <Select
                value={brouillon.formatCitation}
                onValueChange={(valeur) => changer("formatCitation", valeur as FormatCitation)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FORMATS_CITATION.map((format) => (
                    <SelectItem key={format} value={format}>
                      {format}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sources-minimum">Nombre minimum de sources</Label>
              <Input
                id="sources-minimum"
                type="number"
                min={0}
                value={brouillon.sourcesMinimum}
                onChange={(event) => changer("sourcesMinimum", Number(event.target.value))}
              />
            </div>
          </div>

          <div className="mt-5 space-y-2">
            <Label>Types de sources acceptées</Label>
            <div className="flex flex-wrap gap-2">
              {TYPES_SOURCES.map((type) => (
                <Pilule
                  key={type}
                  actif={brouillon.typesSourcesAcceptees.includes(type)}
                  onClick={() => basculerTypeSource(type)}
                >
                  {type}
                </Pilule>
              ))}
            </div>
          </div>
        </Section>

        <Section
          numero={2}
          titre="Structure du document"
          ouvertes={sectionsOuvertes}
          onToggle={basculerSection}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="parties-introduction">Parties de l&apos;introduction</Label>
              <Input
                id="parties-introduction"
                type="number"
                min={0}
                value={brouillon.partiesIntroduction}
                onChange={(event) => changer("partiesIntroduction", Number(event.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Pagination</Label>
              <Select
                value={brouillon.positionPagination}
                onValueChange={(valeur) =>
                  changer("positionPagination", valeur as PositionPagination)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(LIBELLES_POSITION_PAGINATION) as PositionPagination[]).map(
                    (position) => (
                      <SelectItem key={position} value={position}>
                        {LIBELLES_POSITION_PAGINATION[position]}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-5 space-y-2">
            <Label>Style rédactionnel</Label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(LIBELLES_STYLE_REDACTIONNEL) as StyleRedactionnel[]).map((style) => (
                <Pilule
                  key={style}
                  actif={brouillon.styleRedactionnel === style}
                  onClick={() => changer("styleRedactionnel", style)}
                >
                  {LIBELLES_STYLE_REDACTIONNEL[style]}
                </Pilule>
              ))}
            </div>
          </div>

          <div className="mt-5 space-y-2">
            <Label>Voix</Label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(LIBELLES_VOIX_REDACTION) as VoixRedaction[]).map((voix) => (
                <Pilule
                  key={voix}
                  actif={brouillon.voix === voix}
                  onClick={() => changer("voix", voix)}
                >
                  {LIBELLES_VOIX_REDACTION[voix]}
                </Pilule>
              ))}
            </div>
          </div>
        </Section>

        <Section
          numero={3}
          titre="Mise en page"
          ouvertes={sectionsOuvertes}
          onToggle={basculerSection}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Police</Label>
              <Select
                value={brouillon.police}
                onValueChange={(valeur) => changer("police", valeur)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {POLICES.map((police) => (
                    <SelectItem key={police} value={police}>
                      {police}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Taille</Label>
              <Select
                value={brouillon.taillePolice}
                onValueChange={(valeur) => changer("taillePolice", valeur)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TAILLES.map((taille) => (
                    <SelectItem key={taille} value={taille}>
                      {taille}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Interligne</Label>
              <Select
                value={brouillon.interligne}
                onValueChange={(valeur) => changer("interligne", valeur)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INTERLIGNES.map((interligne) => (
                    <SelectItem key={interligne} value={interligne}>
                      {interligne}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="marges">Marges (cm)</Label>
              <Input
                id="marges"
                value={brouillon.margesCm}
                onChange={(event) => changer("margesCm", event.target.value)}
              />
            </div>
          </div>
        </Section>
      </div>

      {/* Barre d'enregistrement fixe : le formulaire est long, l'action ne doit jamais sortir
          de l'écran. Le point ambre signale des modifications non enregistrées. */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 p-3 backdrop-blur md:left-64">
        <div className="mx-auto flex max-w-3xl items-center justify-end gap-3">
          {modifie && (
            <span className="text-xs text-muted-foreground">Modifications non enregistrées</span>
          )}
          <Button onClick={enregistrer} disabled={!modifie || enCours} className="relative">
            {modifie && (
              <span className="absolute -right-1 -top-1 size-3 rounded-full border-2 border-background bg-warning" />
            )}
            Enregistrer les modifications
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Section repliable du référentiel. */
function Section({
  numero,
  titre,
  ouvertes,
  onToggle,
  children,
}: {
  numero: number;
  titre: string;
  ouvertes: number[];
  onToggle: (numero: number) => void;
  children: React.ReactNode;
}) {
  const ouverte = ouvertes.includes(numero);
  const idContenu = `normes-section-${numero}`;

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <button
        type="button"
        onClick={() => onToggle(numero)}
        aria-expanded={ouverte}
        aria-controls={idContenu}
        className="flex w-full items-center justify-between p-5 text-left"
      >
        <span className="font-semibold">
          {numero}. {titre}
        </span>
        <ChevronDown className={cn("size-4 transition-transform", ouverte && "rotate-180")} />
      </button>
      {ouverte && (
        <CardContent id={idContenu} className="border-t pb-5 pt-5">
          {children}
        </CardContent>
      )}
    </Card>
  );
}
