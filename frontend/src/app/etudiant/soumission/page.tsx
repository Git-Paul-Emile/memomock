"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { FileUp, Loader2, UploadCloud } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/context/auth-context";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { apiGet, apiPost, apiUpload } from "@/lib/api";
import { formatFileSize } from "@/lib/utils";
import type { DocumentSubmission, PublicUser } from "@/types";

const schema = z.object({
  titre: z.string().min(5, "Le titre doit contenir au moins 5 caractères"),
});

type FormValues = z.infer<typeof schema>;

const EXTENSIONS_ACCEPTEES = [".pdf", ".doc", ".docx"];

export default function SoumissionPage() {
  return (
    <React.Suspense fallback={null}>
      <SoumissionContenu />
    </React.Suspense>
  );
}

// `useSearchParams` exige une frontière Suspense (voir /reinitialiser-mot-de-passe pour le même
// principe) : composant interne isolé pour que le wrapper ci-dessus puisse l'englober.
function SoumissionContenu() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  // Présent quand on arrive depuis /etudiant/documents/nouveau (document créé en `brouillon`,
  // métadonnées déjà saisies) : cet écran ne fait alors plus qu'importer le fichier, sans
  // redemander le titre. Absent : comportement historique, création + import en une étape.
  const documentId = searchParams.get("documentId");

  const [fichier, setFichier] = React.useState<File | null>(null);
  const [erreurFichier, setErreurFichier] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [encadrant, setEncadrant] = React.useState<PublicUser | null>(null);
  const [brouillon, setBrouillon] = React.useState<DocumentSubmission | null>(null);
  const [chargementBrouillon, setChargementBrouillon] = React.useState(!!documentId);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  React.useEffect(() => {
    if (user?.encadrantId) {
      apiGet<PublicUser>("users", user.encadrantId)
        .then(setEncadrant)
        .catch(() => {});
    }
  }, [user?.encadrantId]);

  React.useEffect(() => {
    if (!documentId) return;
    apiGet<DocumentSubmission>("documents", documentId)
      .then(setBrouillon)
      .catch(() => toast.error("Ce document est introuvable."))
      .finally(() => setChargementBrouillon(false));
  }, [documentId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const extension = "." + f.name.split(".").pop()?.toLowerCase();
    if (!EXTENSIONS_ACCEPTEES.includes(extension)) {
      setErreurFichier("Format non supporté. Utilisez un fichier PDF, DOC ou DOCX.");
      setFichier(null);
      return;
    }
    setErreurFichier(null);
    setFichier(f);
  };

  /** Import du fichier sur un document déjà créé en `brouillon` (métadonnées déjà saisies). */
  const importerSurBrouillon = async () => {
    if (!fichier || !documentId) return;
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("fichier", fichier);
      const document = await apiUpload<DocumentSubmission>(
        `documents/${documentId}/importer-fichier`,
        formData
      );

      if (document.encadrantId) {
        await apiPost("notifications", {
          userId: document.encadrantId,
          titre: "Nouveau document à analyser",
          message: `${user?.prenom} ${user?.nom} a soumis « ${document.titre} ».`,
          type: "soumission",
          lu: false,
          date: new Date().toISOString(),
          lienDocumentId: document.id,
        });
      }

      toast.success("Fichier importé avec succès. L'analyse automatique va démarrer.");
      router.push(`/etudiant/documents/${document.id}/analyse`);
    } catch {
      toast.error("Une erreur est survenue lors de l'import.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmit = async (values: FormValues) => {
    if (!fichier) {
      setErreurFichier("Merci de sélectionner un fichier.");
      return;
    }
    if (!user?.encadrantId) {
      toast.error("Aucun encadrant n'est associé à votre compte.");
      return;
    }
    setIsSubmitting(true);
    try {
      const maintenant = new Date().toISOString();
      // Upload réel : le fichier part vers Cloudinary via le backend (voir
      // POST /api/documents/upload), qui crée directement le Document avec l'URL renvoyée -
      // contrairement à l'ancien flux qui n'enregistrait que le nom/la taille du fichier sans
      // jamais le stocker réellement.
      const formData = new FormData();
      formData.append("fichier", fichier);
      formData.append("titre", values.titre);
      formData.append("etudiantId", user.id);
      formData.append("encadrantId", user.encadrantId);

      const document = await apiUpload<DocumentSubmission>("documents/upload", formData);

      await apiPost("notifications", {
        userId: user.encadrantId,
        titre: "Nouveau document à analyser",
        message: `${user.prenom} ${user.nom} a soumis « ${values.titre} ».`,
        type: "soumission",
        lu: false,
        date: maintenant,
        lienDocumentId: document.id,
      });

      toast.success("Document soumis avec succès. L'analyse automatique va démarrer.");
      router.push(`/etudiant/documents/${document.id}/analyse`);
    } catch {
      toast.error("Une erreur est survenue lors de la soumission.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (chargementBrouillon) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const zoneFichier = (
    <div className="space-y-1.5">
      <Label htmlFor="fichier">Fichier (PDF, DOC ou DOCX)</Label>
      <label
        htmlFor="fichier"
        className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed px-4 py-8 text-center transition-colors hover:bg-accent/50"
      >
        {fichier ? (
          <>
            <FileUp className="size-6 text-primary" />
            <p className="text-sm font-medium">{fichier.name}</p>
            <p className="text-xs text-muted-foreground">{formatFileSize(fichier.size)}</p>
          </>
        ) : (
          <>
            <UploadCloud className="size-6 text-muted-foreground" />
            <p className="text-sm font-medium">Cliquez pour choisir un fichier</p>
            <p className="text-xs text-muted-foreground">PDF, DOC ou DOCX - 20 Mo max</p>
          </>
        )}
        <input
          id="fichier"
          type="file"
          accept=".pdf,.doc,.docx"
          className="hidden"
          onChange={handleFileChange}
        />
      </label>
      {erreurFichier && <p className="text-xs text-destructive">{erreurFichier}</p>}
    </div>
  );

  // Mode « compléter un brouillon » : le titre et les métadonnées sont déjà connus, il ne reste
  // qu'à importer le fichier.
  if (documentId) {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader
          title="Importer votre fichier"
          description="Votre document sera automatiquement analysé (forme, fond) puis transmis à votre encadrant une fois le score de conformité atteint."
        />
        <Card>
          <CardHeader>
            <CardTitle>{brouillon?.titre ?? "Document"}</CardTitle>
            <CardDescription>
              {encadrant
                ? `Encadrant assigné : ${encadrant.prenom} ${encadrant.nom}`
                : "Chargement de votre encadrant…"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {zoneFichier}
            <Button
              className="w-full"
              disabled={isSubmitting || !fichier}
              onClick={importerSurBrouillon}
            >
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              Importer et lancer l&apos;analyse
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Soumettre un document"
        description="Votre document sera automatiquement analysé (forme, fond) puis transmis à votre encadrant une fois le score de conformité atteint."
      />

      <Card>
        <CardHeader>
          <CardTitle>Nouveau mémoire</CardTitle>
          <CardDescription>
            {encadrant
              ? `Encadrant assigné : ${encadrant.prenom} ${encadrant.nom}`
              : "Chargement de votre encadrant…"}
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

            {zoneFichier}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              Soumettre pour analyse
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
