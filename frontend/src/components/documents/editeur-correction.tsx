"use client";

import * as React from "react";
import { EditorContent, useEditor, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

import { cn } from "@/lib/utils";

/**
 * Éditeur riche (TipTap) utilisé par l'encadrant pour modifier directement le texte de
 * l'étudiant - voir mémo de cadrage, section « Architecture Technique » et le parcours
 * encadrant ("il modifie directement le texte final dans l'éditeur (celui basé sur TipTap...)").
 *
 * Volontairement limité aux paragraphes + gras/italique (pas de titres, listes, citations...) :
 * le modèle de données (`RevisionSegment`) suit le texte par paragraphe pour calculer l'écart
 * avant/après (voir lib/revision-diff.ts), une structure plus riche compliquerait cette capture
 * sans bénéfice pour un texte de mémoire déjà mis en page par l'étudiant.
 */
export interface EditeurCorrectionHandle {
  /** Le texte brut de chaque paragraphe, dans l'ordre du document. */
  paragraphes(): string[];
}

function paragraphesDepuisJSON(doc: JSONContent): string[] {
  return (doc.content ?? [])
    .filter((noeud) => noeud.type === "paragraph")
    .map((noeud) => (noeud.content ?? []).map((n) => n.text ?? "").join(""));
}

function contenuInitial(paragraphes: string[]): JSONContent {
  return {
    type: "doc",
    content: paragraphes.length
      ? paragraphes.map((texte) => ({
          type: "paragraph",
          content: texte ? [{ type: "text", text: texte }] : [],
        }))
      : [{ type: "paragraph" }],
  };
}

export const EditeurCorrection = React.forwardRef<
  EditeurCorrectionHandle,
  { paragraphesInitiaux: string[]; editable?: boolean; className?: string }
>(function EditeurCorrection({ paragraphesInitiaux, editable = true, className }, ref) {
  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          heading: false,
          bulletList: false,
          orderedList: false,
          blockquote: false,
          codeBlock: false,
          horizontalRule: false,
        }),
      ],
      content: contenuInitial(paragraphesInitiaux),
      editable,
      immediatelyRender: false,
      editorProps: {
        attributes: {
          class: "prose prose-sm max-w-none focus:outline-none min-h-[200px]",
        },
      },
    },
    []
  );

  React.useImperativeHandle(
    ref,
    () => ({
      paragraphes: () => (editor ? paragraphesDepuisJSON(editor.getJSON()) : paragraphesInitiaux),
    }),
    [editor, paragraphesInitiaux]
  );

  return (
    <div className={cn("rounded-lg border p-3", className)}>
      <EditorContent editor={editor} />
    </div>
  );
});
