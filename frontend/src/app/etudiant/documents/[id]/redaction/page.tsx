"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  ArrowLeft,
  Bold,
  Heading2,
  Italic,
  List,
  ListOrdered,
  Loader2,
  Lock,
  Save,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { useApiResource } from "@/hooks/use-api-resource";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiGet, apiList, apiPatch, apiPost } from "@/lib/api";
import { chapitresModifies, messageVerrouillage } from "@/lib/verrouillage";
import {
  chargerContenu,
  enregistrerContenu,
  lancerAnalyseDocument,
  resoudreProfil,
} from "@/lib/analyse-document";
import { texteDepuisHtml } from "@/lib/extraction-texte";
import { cn } from "@/lib/utils";
import type { ChapitreCanevas, DocumentSubmission, ValidationChapitre } from "@/types";

interface DonneesRedaction {
  document: DocumentSubmission;
  html: string;
  // Texte enregistré au chargement : référence pour détecter une modification des chapitres
  // verrouillés.
  texteInitial: string;
  chapitresVerrouilles: string[];
}

function htmlDepuisTexte(texte: string): string {
  const echapper = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return texte
    .split(/\n+/)
    .filter(Boolean)
    .map((l) => (l.startsWith("## ") ? `<h2>${echapper(l.slice(3))}</h2>` : `<p>${echapper(l)}</p>`))
    .join("");
}

/** Plan par défaut proposé à un document vide : les chapitres du canevas de l'encadreur. */
function htmlDepuisCanevas(chapitres: ChapitreCanevas[]): string {
  const premiers = chapitres.filter((c) => !c.parentId).sort((a, b) => a.ordre - b.ordre);
  if (premiers.length === 0) return "<h2>Introduction</h2><p></p>";
  return premiers
    .map(
      (c) =>
        `<h2>${c.titre}</h2>` +
        chapitres
          .filter((s) => s.parentId === c.id)
          .map((s) => `<h3>${s.titre}</h3><p></p>`)
          .join("") +
        "<p></p>"
    )
    .join("");
}

function BoutonOutil({
  editor,
  actif,
  onClick,
  libelle,
  children,
}: {
  editor: Editor | null;
  actif: boolean;
  onClick: () => void;
  libelle: string;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      size="icon"
      variant={actif ? "secondary" : "ghost"}
      className="size-8"
      disabled={!editor}
      onClick={onClick}
      aria-label={libelle}
      title={libelle}
    >
      {children}
    </Button>
  );
}

/**
 * Rédaction directe dans la plateforme (spec v2, § 26) : l'étudiant écrit ici plutôt que
 * d'échanger des fichiers ; le texte est analysé de la même façon qu'un import.
 */
export default function RedactionPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [enregistrement, setEnregistrement] = React.useState<"aucun" | "sauvegarde" | "analyse">("aucun");

  const { data, isLoading } = useApiResource<DonneesRedaction>(["redaction", id], async () => {
    const document = await apiGet<DocumentSubmission>("documents", id);
    const [contenu, profil, validations] = await Promise.all([
      chargerContenu(id),
      resoudreProfil(document),
      apiList<ValidationChapitre>("validations-chapitre", { filtres: { documentId: id }, limite: 200 }),
    ]);
    const chapitres = profil?.canevasId
      ? (await apiList<ChapitreCanevas>("chapitres-canevas", { filtres: { canevasId: profil.canevasId }, limite: 200 })).data
      : [];
    const verrouilles = validations.data
      .filter((v) => v.verrouille)
      .map((v) => chapitres.find((c) => c.id === v.chapitreId)?.titre)
      .filter((t): t is string => Boolean(t));
    return {
      document,
      html: contenu?.html ?? (contenu?.texte ? htmlDepuisTexte(contenu.texte) : htmlDepuisCanevas(chapitres)),
      texteInitial: contenu?.texte ?? "",
      chapitresVerrouilles: verrouilles,
    };
  });

  const editor = useEditor(
    {
      extensions: [StarterKit.configure({ heading: { levels: [2, 3] } })],
      content: data?.html ?? "",
      immediatelyRender: false,
      editorProps: {
        attributes: {
          class: "prose prose-sm max-w-none min-h-[60vh] focus:outline-none",
          "aria-label": "Texte du mémoire",
        },
      },
    },
    [data?.html]
  );

  const sauvegarder = async (): Promise<boolean> => {
    if (!editor || !data) return false;
    const html = editor.getHTML();
    const texte = texteDepuisHtml(html);
    // Blocage réel (spec v2, § 35) : un chapitre validé ne peut pas être modifié.
    const modifies = chapitresModifies(data.texteInitial, texte, data.chapitresVerrouilles);
    if (modifies.length > 0) {
      toast.error(messageVerrouillage(modifies));
      return false;
    }
    await enregistrerContenu(id, { texte, html, origine: "redaction" });
    await apiPatch("documents", id, { dateMaj: new Date().toISOString() });
    return true;
  };

  const demanderDeverrouillage = async () => {
    if (!data) return;
    await apiPost("notifications", {
      userId: data.document.encadrantId,
      titre: "Demande de déverrouillage",
      message: `L'étudiant demande à modifier : ${data.chapitresVerrouilles.join(", ")} (« ${data.document.titre} »).`,
      type: "validation",
      lu: false,
      date: new Date().toISOString(),
      lienDocumentId: data.document.id,
    });
    toast.success("Demande envoyée à votre encadreur.");
  };

  const enregistrer = async () => {
    setEnregistrement("sauvegarde");
    try {
      if (await sauvegarder()) toast.success("Brouillon enregistré.");
    } catch {
      toast.error("L'enregistrement a échoué.");
    } finally {
      setEnregistrement("aucun");
    }
  };

  const enregistrerEtAnalyser = async () => {
    setEnregistrement("analyse");
    try {
      if (!(await sauvegarder())) return;
      await apiPatch("documents", id, { statut: "analyse_en_cours", dateMaj: new Date().toISOString() });
      void lancerAnalyseDocument(id).catch(() => {});
      router.push(`/etudiant/documents/${id}/analyse`);
    } catch {
      toast.error("L'analyse n'a pas pu être lancée.");
      setEnregistrement("aucun");
    }
  };

  if (isLoading || !data) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-[60vh] w-full" />
      </div>
    );
  }

  const enAttenteEncadreur = ["pret_pour_encadrant", "en_relecture", "valide"].includes(data.document.statut);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Rédiger dans la plateforme"
        description={data.document.titre}
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/etudiant/documents/${id}/analyse`}>
                <ArrowLeft className="size-4" />
                Retour
              </Link>
            </Button>
            <Button variant="outline" size="sm" onClick={enregistrer} disabled={enregistrement !== "aucun" || enAttenteEncadreur}>
              {enregistrement === "sauvegarde" ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Enregistrer
            </Button>
            <Button size="sm" onClick={enregistrerEtAnalyser} disabled={enregistrement !== "aucun" || enAttenteEncadreur}>
              {enregistrement === "analyse" ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              Enregistrer et analyser
            </Button>
          </>
        }
      />

      {enAttenteEncadreur && (
        <p className="mb-4 rounded-lg border bg-muted p-3 text-sm text-muted-foreground">
          Ce document est entre les mains de votre encadreur : la rédaction reprendra après son
          retour.
        </p>
      )}
      {data.chapitresVerrouilles.length > 0 && (
        <p className="mb-4 flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/5 p-3 text-sm">
          <Lock className="mt-0.5 size-4 shrink-0" />
          <span className="flex-1">
            Chapitres validés et verrouillés par votre encadreur :{" "}
            {data.chapitresVerrouilles.join(", ")}. Toute modification de ces chapitres sera
            refusée à l&apos;enregistrement.
          </span>
          <Button size="sm" variant="outline" onClick={demanderDeverrouillage}>
            Demander le déverrouillage
          </Button>
        </p>
      )}

      <Card>
        <div className="flex flex-wrap gap-1 border-b p-2">
          <BoutonOutil editor={editor} libelle="Titre de chapitre" actif={!!editor?.isActive("heading", { level: 2 })} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}>
            <Heading2 className="size-4" />
          </BoutonOutil>
          <BoutonOutil editor={editor} libelle="Gras" actif={!!editor?.isActive("bold")} onClick={() => editor?.chain().focus().toggleBold().run()}>
            <Bold className="size-4" />
          </BoutonOutil>
          <BoutonOutil editor={editor} libelle="Italique" actif={!!editor?.isActive("italic")} onClick={() => editor?.chain().focus().toggleItalic().run()}>
            <Italic className="size-4" />
          </BoutonOutil>
          <BoutonOutil editor={editor} libelle="Liste à puces" actif={!!editor?.isActive("bulletList")} onClick={() => editor?.chain().focus().toggleBulletList().run()}>
            <List className="size-4" />
          </BoutonOutil>
          <BoutonOutil editor={editor} libelle="Liste numérotée" actif={!!editor?.isActive("orderedList")} onClick={() => editor?.chain().focus().toggleOrderedList().run()}>
            <ListOrdered className="size-4" />
          </BoutonOutil>
        </div>
        <CardContent className={cn("pt-4", enAttenteEncadreur && "pointer-events-none opacity-70")}>
          <EditorContent editor={editor} />
        </CardContent>
      </Card>
    </div>
  );
}
