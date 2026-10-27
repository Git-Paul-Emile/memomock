"use client";

import * as React from "react";
import { Check, Wand2, X } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/context/auth-context";
import { useApiResource } from "@/hooks/use-api-resource";
import { useSyncedState } from "@/hooks/use-synced-state";
import { PageHeader } from "@/components/shared/page-header";
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
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { apiDelete, apiList, apiPatch } from "@/lib/api";
import { STATUT_REGLE_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { LIBELLES_NIVEAU_REGLE, LIBELLES_TYPE_DOCUMENT } from "@/types";
import type { NiveauRegle, RegleApprise, StatutRegle, TypeDocument } from "@/types";

const NIVEAUX: NiveauRegle[] = ["ponctuelle", "projet", "type_document", "discipline", "generale"];
const TYPES_DOCUMENT: TypeDocument[] = ["licence", "master", "doctorat"];

const VARIANT_STATUT: Record<StatutRegle, "default" | "success" | "outline"> = {
  proposee: "outline",
  adoptee: "success",
  ignoree: "default",
  desactivee: "default",
};

export default function JumeauNumeriquePage() {
  const { user } = useAuth();

  const { data, isLoading } = useApiResource<RegleApprise[]>(
    ["regles-apprises", user?.id],
    async () => {
      const res = await apiList<RegleApprise>("regles-apprises", {
        filtres: { encadrantId: user!.id },
        tri: "dateApprentissage",
        ordre: "desc",
        limite: 200,
      });
      return res.data;
    },
    { enabled: !!user }
  );

  // Dupliqué en état local pour permettre la mise à jour optimiste du statut d'une règle
  // (adoptée/ignorée) sans attendre un refetch réseau.
  const [regles, setRegles] = useSyncedState<RegleApprise[]>(data, []);

  const ignorer = async (regle: RegleApprise) => {
    const misAJour = await apiPatch<RegleApprise>("regles-apprises", regle.id, {
      statut: "ignoree",
    });
    setRegles((prev) => prev.map((r) => (r.id === regle.id ? misAJour : r)));
    toast.success("Règle ignorée.");
  };

  // Dialogue de validation (spec section 24, E28) : l'adoption d'une règle proposée choisit
  // toujours explicitement sa portée - jamais implicitement générale.
  const [regleAAdopter, setRegleAAdopter] = React.useState<RegleApprise | null>(null);
  const [niveauChoisi, setNiveauChoisi] = React.useState<NiveauRegle>("ponctuelle");
  const [typeDocumentChoisi, setTypeDocumentChoisi] = React.useState<TypeDocument>("master");
  const [disciplineChoisie, setDisciplineChoisie] = React.useState("");
  const [enCoursAdoption, setEnCoursAdoption] = React.useState(false);

  const ouvrirDialogueAdoption = (regle: RegleApprise) => {
    setRegleAAdopter(regle);
    setNiveauChoisi(regle.documentId ? "ponctuelle" : "generale");
    setDisciplineChoisie("");
  };

  const confirmerAdoption = async () => {
    if (!regleAAdopter) return;
    if ((niveauChoisi === "ponctuelle" || niveauChoisi === "projet") && !regleAAdopter.documentId) {
      toast.error("Cette règle n'est associée à aucun document.");
      return;
    }
    if (niveauChoisi === "discipline" && !disciplineChoisie.trim()) {
      toast.error("Merci de préciser la discipline.");
      return;
    }
    setEnCoursAdoption(true);
    try {
      const misAJour = await apiPatch<RegleApprise>("regles-apprises", regleAAdopter.id, {
        statut: "adoptee",
        niveau: niveauChoisi,
        ...(niveauChoisi === "ponctuelle" || niveauChoisi === "projet"
          ? { documentId: regleAAdopter.documentId }
          : {}),
        ...(niveauChoisi === "type_document" ? { typeDocument: typeDocumentChoisi } : {}),
        ...(niveauChoisi === "discipline" ? { discipline: disciplineChoisie.trim() } : {}),
      });
      setRegles((prev) => prev.map((r) => (r.id === misAJour.id ? misAJour : r)));
      toast.success("Règle adoptée : elle sera appliquée aux prochaines analyses.");
      setRegleAAdopter(null);
    } catch {
      toast.error("L'adoption a échoué. Réessayez dans quelques instants.");
    } finally {
      setEnCoursAdoption(false);
    }
  };

  // Contrôle des règles adoptées (spec v2, § 38) : modifier, désactiver, supprimer.
  const [regleAModifier, setRegleAModifier] = React.useState<RegleApprise | null>(null);
  const [texteModifie, setTexteModifie] = React.useState("");

  const enregistrerModification = async () => {
    if (!regleAModifier || !texteModifie.trim()) return;
    const misAJour = await apiPatch<RegleApprise>("regles-apprises", regleAModifier.id, {
      regle: texteModifie.trim(),
    });
    setRegles((prev) => prev.map((r) => (r.id === misAJour.id ? misAJour : r)));
    setRegleAModifier(null);
    toast.success("Règle modifiée.");
  };

  const basculerActivation = async (regle: RegleApprise) => {
    const statut = regle.statut === "desactivee" ? "adoptee" : "desactivee";
    const misAJour = await apiPatch<RegleApprise>("regles-apprises", regle.id, { statut });
    setRegles((prev) => prev.map((r) => (r.id === misAJour.id ? misAJour : r)));
    toast.success(statut === "desactivee" ? "Règle désactivée : l'IA ne l'applique plus." : "Règle réactivée.");
  };

  const supprimer = async (regle: RegleApprise) => {
    await apiDelete("regles-apprises", regle.id);
    setRegles((prev) => prev.filter((r) => r.id !== regle.id));
    toast.success("Règle supprimée.");
  };

  const adoptees = regles.filter((r) => r.statut === "adoptee" || r.statut === "desactivee");
  const proposees = regles.filter((r) => r.statut === "proposee");

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Ce que MemoAssistant a appris"
        description="Après chacune de vos corrections, l'IA compare la version qu'elle avait analysée à la vôtre (Diff Engine) et propose des préférences. Rien n'est appliqué sans votre accord : vous choisissez la portée, et vous pouvez modifier, désactiver ou supprimer chaque règle."
      />

      {regles.length === 0 ? (
        <EmptyState
          icon={Wand2}
          title="Aucune règle apprise pour le moment"
          description="Elles apparaîtront ici au fur et à mesure de vos validations et demandes de révision."
        />
      ) : (
        <div className="space-y-6">
          {proposees.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-medium text-muted-foreground">
                Propositions en attente ({proposees.length})
              </h2>
              <div className="space-y-3">
                {proposees.map((regle) => (
                  <Card key={regle.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-3">
                        <CardTitle className="text-sm font-medium leading-snug">
                          {regle.regle}
                        </CardTitle>
                        <Badge variant={VARIANT_STATUT[regle.statut]}>
                          {STATUT_REGLE_LABELS[regle.statut]}
                        </Badge>
                      </div>
                      <CardDescription>
                        Source : {regle.source} · {formatDate(regle.dateApprentissage)} · portée
                        suggérée : {LIBELLES_NIVEAU_REGLE[regle.niveau].toLowerCase()}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Progress value={regle.confiance} className="h-1.5 flex-1" />
                        <span className="text-xs text-muted-foreground">
                          {regle.confiance}% de confiance
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => ouvrirDialogueAdoption(regle)}>
                          <Check className="size-4" />
                          Adopter
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => ignorer(regle)}>
                          <X className="size-4" />
                          Ignorer
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          <div>
            <h2 className="mb-3 text-sm font-medium text-muted-foreground">
              Règles adoptées ({adoptees.length})
            </h2>
            <div className="space-y-3">
              {adoptees.map((regle) => (
                <Card key={regle.id} className={regle.statut === "desactivee" ? "opacity-60" : undefined}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-3">
                      <CardTitle className="text-sm font-medium leading-snug">
                        {regle.regle}
                      </CardTitle>
                      <div className="flex shrink-0 gap-1.5">
                        <Badge variant="outline">{LIBELLES_NIVEAU_REGLE[regle.niveau]}</Badge>
                        <Badge variant={VARIANT_STATUT[regle.statut]}>
                          {STATUT_REGLE_LABELS[regle.statut]}
                        </Badge>
                      </div>
                    </div>
                    <CardDescription>
                      Source : {regle.source} · {formatDate(regle.dateApprentissage)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Progress value={regle.confiance} className="h-1.5 flex-1" />
                      <span className="text-xs text-muted-foreground">
                        {regle.confiance}% de confiance
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setRegleAModifier(regle);
                          setTexteModifie(regle.regle);
                        }}
                      >
                        Modifier
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => basculerActivation(regle)}>
                        {regle.statut === "desactivee" ? "Réactiver" : "Désactiver"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => supprimer(regle)}>
                        <X className="size-4" />
                        Supprimer
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}

      <Dialog open={!!regleAModifier} onOpenChange={(ouvert) => !ouvert && setRegleAModifier(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier la règle</DialogTitle>
            <DialogDescription>
              Reformulez la préférence telle que l&apos;IA doit l&apos;appliquer lors des prochaines
              analyses.
            </DialogDescription>
          </DialogHeader>
          <Input value={texteModifie} onChange={(e) => setTexteModifie(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRegleAModifier(null)}>
              Annuler
            </Button>
            <Button onClick={enregistrerModification} disabled={!texteModifie.trim()}>
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!regleAAdopter} onOpenChange={(ouvert) => !ouvert && setRegleAAdopter(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adopter cette règle</DialogTitle>
            <DialogDescription>
              Choisissez la portée d&apos;application - cela évite qu&apos;une correction ponctuelle
              devienne automatiquement une règle générale.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <p className="rounded-md bg-muted p-3 text-sm">{regleAAdopter?.regle}</p>
            <div className="space-y-1.5">
              <Label>Portée</Label>
              <Select value={niveauChoisi} onValueChange={(v) => setNiveauChoisi(v as NiveauRegle)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NIVEAUX.map((n) => (
                    <SelectItem
                      key={n}
                      value={n}
                      disabled={
                        (n === "ponctuelle" || n === "projet") && !regleAAdopter?.documentId
                      }
                    >
                      {LIBELLES_NIVEAU_REGLE[n]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {niveauChoisi === "type_document" && (
              <div className="space-y-1.5">
                <Label>Type de document</Label>
                <Select
                  value={typeDocumentChoisi}
                  onValueChange={(v) => setTypeDocumentChoisi(v as TypeDocument)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPES_DOCUMENT.map((t) => (
                      <SelectItem key={t} value={t}>
                        {LIBELLES_TYPE_DOCUMENT[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {niveauChoisi === "discipline" && (
              <div className="space-y-1.5">
                <Label htmlFor="discipline-regle">Discipline</Label>
                <Input
                  id="discipline-regle"
                  value={disciplineChoisie}
                  onChange={(e) => setDisciplineChoisie(e.target.value)}
                  placeholder="Ex : Informatique"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRegleAAdopter(null)}>
              Annuler
            </Button>
            <Button onClick={confirmerAdoption} disabled={enCoursAdoption}>
              Confirmer l&apos;adoption
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
