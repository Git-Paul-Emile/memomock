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
import { apiPost } from "@/lib/api";
import { LIBELLES_TYPE_DOCUMENT } from "@/types";
import type { ProfilEncadrant, TypeDocument } from "@/types";

const ETAPES = ["Bienvenue", "Premier profil", "C'est parti"];
const TYPES_DOCUMENT: TypeDocument[] = ["licence", "master", "doctorat"];

/**
 * Onboarding encadrant (spec C4.6-C4.7) : crée le premier profil méthodologique (type de
 * document + discipline). L'import des ressources (guides, modèles, normes, exigences - C4.8-
 * C4.11) se fait ensuite sur `/encadrant/profil`, déjà un écran complet - pas de duplication ici.
 */
export default function OnboardingEncadrantPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [etape, setEtape] = React.useState(1);
  const [typeDocument, setTypeDocument] = React.useState<TypeDocument>("master");
  const [discipline, setDiscipline] = React.useState("");
  const [nom, setNom] = React.useState("");
  const [enCours, setEnCours] = React.useState(false);

  const terminer = async () => {
    if (!discipline.trim()) {
      toast.error("Merci d'indiquer une discipline.");
      return;
    }
    setEnCours(true);
    try {
      await apiPost<ProfilEncadrant>("profils-encadrant", {
        typeDocument,
        discipline: discipline.trim(),
        ...(nom.trim() ? { nom: nom.trim() } : {}),
      });
      router.push("/encadrant/profil");
    } catch {
      toast.error("La création de votre profil a échoué (existe-t-il peut-être déjà ?).");
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
                  Configurons ensemble votre premier profil méthodologique - le cœur de
                  MemoAssistant AI.
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
                <CardTitle>Votre premier profil</CardTitle>
                <CardDescription>
                  Un profil regroupe vos exigences pour un type de mémoire et une discipline. Vous
                  pourrez en créer d&apos;autres ensuite (ex. « Master - Informatique », « Doctorat
                  - Informatique »).
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
                <div className="space-y-1.5">
                  <Label htmlFor="nom">Nom affiché (facultatif)</Label>
                  <Input
                    id="nom"
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    placeholder={`${LIBELLES_TYPE_DOCUMENT[typeDocument]} - ${discipline || "…"}`}
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
              <CardHeader className="items-center text-center">
                <Sparkles className="mb-2 size-10 text-primary" />
                <CardTitle>Presque prêt !</CardTitle>
                <CardDescription>
                  Il ne reste qu&apos;à importer vos guides, modèles et normes pour que l&apos;IA
                  apprenne vos exigences.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" onClick={terminer} disabled={enCours}>
                  {enCours && <Loader2 className="size-4 animate-spin" />}
                  Créer mon profil
                </Button>
              </CardContent>
            </>
          )}
        </Card>
      </OnboardingWizard>
    </div>
  );
}
