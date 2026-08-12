"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/context/auth-context";
import { PageHeader } from "@/components/shared/page-header";
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

const schema = z.object({
  titre: z.string().min(5, "Le titre doit contenir au moins 5 caractères"),
  typeDocument: z.enum(["licence", "master", "doctorat"]),
  discipline: z.string().min(1, "La discipline est requise"),
  sujet: z.string().optional(),
  problematique: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const TYPES_DOCUMENT: TypeDocument[] = ["licence", "master", "doctorat"];

/**
 * Écran « Créer un document » (spec D5/C3.3-C3.5) : renseigne les métadonnées du mémoire
 * (titre, type, discipline, sujet, problématique) AVANT l'import du fichier. Le document est
 * créé en statut `brouillon` ; l'étape suivante (import du fichier) se fait sur
 * `/etudiant/soumission?documentId=...`.
 */
export default function NouveauDocumentPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { typeDocument: "master" },
  });

  const onSubmit = async (values: FormValues) => {
    if (!user?.encadrantId) {
      toast.error("Aucun encadrant n'est associé à votre compte.");
      return;
    }
    setIsSubmitting(true);
    try {
      const document = await apiPost<DocumentSubmission>("documents/brouillon", {
        titre: values.titre,
        encadrantId: user.encadrantId,
        typeDocument: values.typeDocument,
        discipline: values.discipline,
        ...(values.sujet ? { sujet: values.sujet } : {}),
        ...(values.problematique ? { problematique: values.problematique } : {}),
      });
      toast.success("Document créé. Importez maintenant votre fichier.");
      router.push(`/etudiant/soumission?documentId=${document.id}`);
    } catch {
      toast.error("La création du document a échoué.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Nouveau document"
        description="Décrivez votre projet de mémoire. Vous importerez le fichier à l'étape suivante."
      />

      <Card>
        <CardHeader>
          <CardTitle>Informations générales</CardTitle>
          <CardDescription>
            Ces informations aident l&apos;IA à orienter son analyse.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="titre">Titre du mémoire</Label>
              <Input
                id="titre"
                placeholder="Ex : Impact de l'IA générative sur la pédagogie universitaire"
                aria-invalid={!!errors.titre}
                {...register("titre")}
              />
              {errors.titre && <p className="text-xs text-destructive">{errors.titre.message}</p>}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Type de document</Label>
                <Select
                  value={watch("typeDocument")}
                  onValueChange={(v) => setValue("typeDocument", v as TypeDocument)}
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
                  placeholder="Ex : Informatique"
                  aria-invalid={!!errors.discipline}
                  {...register("discipline")}
                />
                {errors.discipline && (
                  <p className="text-xs text-destructive">{errors.discipline.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sujet">Sujet (facultatif)</Label>
              <Input
                id="sujet"
                placeholder="Sujet provisoire de votre mémoire"
                {...register("sujet")}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="problematique">Problématique (facultatif)</Label>
              <Textarea
                id="problematique"
                rows={3}
                placeholder="Votre question de recherche, si elle est déjà définie…"
                {...register("problematique")}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ArrowRight className="size-4" />
              )}
              Continuer vers l&apos;import du fichier
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
