"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Check, Download, Eye, FileText, FileType, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { useApiResource } from "@/hooks/use-api-resource";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { apiGet } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { DocumentSubmission } from "@/types";

/**
 * Écran « Export » côté étudiant.
 *
 * Choix du format PDF ou Word, mise en forme d'origine conservée. Le document ciblé est chargé
 * depuis la base.
 */
const FORMATS = [
  {
    cle: "pdf",
    titre: "PDF",
    extension: ".pdf",
    description: "Idéal pour l'impression et le partage en lecture seule.",
    icone: FileText,
  },
  {
    cle: "word",
    titre: "Word",
    extension: ".docx",
    description: "Modifiable dans Microsoft Word ou LibreOffice.",
    icone: FileType,
  },
];

export default function ExportPage() {
  const { id } = useParams<{ id: string }>();
  const { data: document } = useApiResource<DocumentSubmission | null>(
    ["document-export", id],
    () => apiGet<DocumentSubmission>("documents", id).catch(() => null)
  );
  const [format, setFormat] = React.useState("pdf");
  const [conserverMiseEnForme, setConserverMiseEnForme] = React.useState(true);
  const [inclureCommentaires, setInclureCommentaires] = React.useState(false);
  const [enCours, setEnCours] = React.useState(false);
  const [pret, setPret] = React.useState(false);

  // Aucune conversion de format n'est effectuée côté serveur (pas de génération Word/PDF à la
  // volée) : le fichier téléchargé est le fichier original réellement soumis par l'étudiant
  // (stocké sur Cloudinary à l'upload, voir `document.urlFichier`), ce qui préserve sa mise en
  // forme d'origine à l'identique - l'objectif énoncé dans le cahier des charges.
  const telecharger = async () => {
    if (!document?.urlFichier) {
      toast.error("Aucun fichier disponible pour ce document.");
      return;
    }
    setEnCours(true);
    try {
      const reponse = await fetch(document.urlFichier);
      if (!reponse.ok) throw new Error("Téléchargement impossible.");
      const blob = await reponse.blob();
      const urlObjet = URL.createObjectURL(blob);
      const lien = window.document.createElement("a");
      lien.href = urlObjet;
      lien.download = document.nomFichier || `document${format === "pdf" ? ".pdf" : ".docx"}`;
      lien.click();
      URL.revokeObjectURL(urlObjet);
      setPret(true);
    } catch {
      toast.error("L'export a échoué. Réessayez dans quelques instants.");
    } finally {
      setEnCours(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Exporter le document"
        description="Téléchargez une version de votre mémoire avec sa mise en forme d'origine préservée."
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/etudiant/documents/${id}/apercu`}>
                <Eye className="size-4" />
                Prévisualiser
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/etudiant/documents/${id}/correction`}>
                <ArrowLeft className="size-4" />
                Retour au document
              </Link>
            </Button>
          </>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Format d&apos;export</CardTitle>
          <CardDescription>
            {document
              ? `${document.titre} - version ${document.version}`
              : "Chargement du document…"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            {FORMATS.map((f) => {
              const Icone = f.icone;
              const actif = format === f.cle;
              return (
                <button
                  key={f.cle}
                  type="button"
                  onClick={() => {
                    setFormat(f.cle);
                    setPret(false);
                  }}
                  className={cn(
                    "flex flex-col gap-2 rounded-lg border p-4 text-left transition-colors",
                    actif ? "border-primary bg-primary/5" : "hover:bg-accent"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <Icone
                      className={cn("size-6", actif ? "text-primary" : "text-muted-foreground")}
                    />
                    {actif && <Check className="size-4 text-primary" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {f.titre} <span className="text-muted-foreground">{f.extension}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">{f.description}</p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="space-y-3 rounded-lg border p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="mef" className="text-sm">
                  Conserver la mise en forme d&apos;origine
                </Label>
                <p className="text-xs text-muted-foreground">
                  Marges, styles, police et structure du document initial.
                </p>
              </div>
              <Switch
                id="mef"
                checked={conserverMiseEnForme}
                onCheckedChange={setConserverMiseEnForme}
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="comm" className="text-sm">
                  Inclure les commentaires de l&apos;IA
                </Label>
                <p className="text-xs text-muted-foreground">
                  Ajoute les suggestions non appliquées en annotations.
                </p>
              </div>
              <Switch
                id="comm"
                checked={inclureCommentaires}
                onCheckedChange={setInclureCommentaires}
              />
            </div>
          </div>

          {pret ? (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-success/40 bg-success/5 py-6 text-center">
              <Check className="size-7 text-success" />
              <p className="text-sm font-medium">Votre fichier a été téléchargé</p>
              <Button onClick={telecharger} disabled={enCours}>
                <Download className="size-4" />
                Télécharger à nouveau
              </Button>
            </div>
          ) : (
            <Button
              className="w-full"
              onClick={telecharger}
              disabled={enCours || !document?.urlFichier}
            >
              {enCours ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              Télécharger le fichier {format === "pdf" ? ".pdf" : ".docx"}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
