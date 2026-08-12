"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, PartyPopper, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/context/auth-context";
import { OnboardingWizard } from "@/components/onboarding/wizard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { apiPost } from "@/lib/api";
import { LIBELLES_TYPE_DOCUMENT } from "@/types";
import type { DocumentSubmission, TypeDocument } from "@/types";

const ETAPES = ["Bienvenue", "Votre mémoire", "Sujet", "C'est parti"];
const TYPES_DOCUMENT: TypeDocument[] = ["licence", "master", "doctorat"];

/**
 * Onboarding étudiant (spec C3) : crée le premier document en statut `brouillon` (métadonnées
 * seules - voir POST /documents/brouillon, Phase 2). L'import du fichier se fait ensuite sur
 * `/etudiant/soumission?documentId=...`, exactement comme depuis `/etudiant/documents/nouveau`.
 */
export default function OnboardingEtudiantPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [etape, setEtape] = React.useState(1);
  const [typeDocument, setTypeDocument] = React.useState<TypeDocument>("master");
  const [discipline, setDiscipline] = React.useState("");
  const [sujet, setSujet] = React.useState("");
  const [problematique, setProblematique] = React.useState("");
  const [enCours, setEnCours] = React.useState(false);

  const terminer = async () => {
    if (!user?.encadrantId) {
      toast.error("Aucun encadrant n'est associé à votre compte.");
      return;
    }
    setEnCours(true);
    try {
      const document = await apiPost<DocumentSubmission>("documents/brouillon", {
        titre: sujet.trim() || `Mémoire de ${user.prenom}`,
        encadrantId: user.encadrantId,
        typeDocument,
        discipline: discipline.trim(),
        ...(sujet.trim() ? { sujet: sujet.trim() } : {}),
        ...(problematique.trim() ? { problematique: problematique.trim() } : {}),
      });
      router.push(`/etudiant/soumission?documentId=${document.id}`);
    } catch {
      toast.error("La création de votre premier document a échoué.");
    } finally {
      setEnCours(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      <OnboardingWizard etapes={ETAPES} etapeCourante={etape}>
        <Card>
          {etape === 1 && (
            <>
              <CardHeader className="items-center text-center">
                <PartyPopper className="mb-2 size-10 text-primary" />
                <CardTitle>Bienvenue{user ? `, ${user.prenom}` : ""} !</CardTitle>
                <CardDescription>
                  Avant de démarrer, décrivons ensemble votre mémoire en quelques questions.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" onClick={() => setEtape(2)}>
                  Commencer
                  <ArrowRight className="size-4" />
                </Button>
              </CardContent>
            </>
          )}

          {etape === 2 && (
            <>
              <CardHeader>
                <CardTitle>Votre mémoire</CardTitle>
                <CardDescription>
                  Le type de document conditionne le profil de votre encadrant.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Type de document</Label>
                  <Select
                    value={typeDocument}
                    onValueChange={(v) => setTypeDocument(v as TypeDocument)}
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
                <div className="space-y-1.5">
                  <Label htmlFor="discipline">Discipline</Label>
                  <Input
                    id="discipline"
                    value={discipline}
                    onChange={(e) => setDiscipline(e.target.value)}
                    placeholder="Ex : Informatique"
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={() => setEtape(3)}
                  disabled={!discipline.trim()}
                >
                  Continuer
                  <ArrowRight className="size-4" />
                </Button>
              </CardContent>
            </>
          )}

          {etape === 3 && (
            <>
              <CardHeader>
                <CardTitle>Votre sujet</CardTitle>
                <CardDescription>
                  Facultatif - vous pourrez toujours le préciser plus tard.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="sujet">Titre / sujet provisoire</Label>
                  <Input
                    id="sujet"
                    value={sujet}
                    onChange={(e) => setSujet(e.target.value)}
                    placeholder="Ex : Impact de l'IA générative sur la pédagogie universitaire"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="problematique">Problématique</Label>
                  <Textarea
                    id="problematique"
                    rows={3}
                    value={problematique}
                    onChange={(e) => setProblematique(e.target.value)}
                  />
                </div>
                <Button className="w-full" onClick={() => setEtape(4)}>
                  Continuer
                  <ArrowRight className="size-4" />
                </Button>
              </CardContent>
            </>
          )}

          {etape === 4 && (
            <>
              <CardHeader className="items-center text-center">
                <Sparkles className="mb-2 size-10 text-primary" />
                <CardTitle>C&apos;est prêt !</CardTitle>
                <CardDescription>
                  Il ne reste qu&apos;à importer votre fichier pour lancer la première analyse.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" onClick={terminer} disabled={enCours}>
                  {enCours && <Loader2 className="size-4 animate-spin" />}
                  Importer mon fichier
                </Button>
              </CardContent>
            </>
          )}
        </Card>
      </OnboardingWizard>
    </div>
  );
}
