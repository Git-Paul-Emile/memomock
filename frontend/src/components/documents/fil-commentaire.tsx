"use client";

import * as React from "react";
import { CornerDownRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiPost } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import type { ReponseCommentaire } from "@/types";

/**
 * Fil de réponses sous un commentaire en marge (spec section 47) - partagé étudiant/encadrant,
 * les deux rôles pouvant répondre pour créer une vraie conversation.
 */
export function FilCommentaire({
  commentaireMargeId,
  documentId,
  role,
  reponses,
  onReponseAjoutee,
}: {
  commentaireMargeId: string;
  documentId: string;
  role: "etudiant" | "encadrant";
  reponses: ReponseCommentaire[];
  onReponseAjoutee: (reponse: ReponseCommentaire) => void;
}) {
  const [texte, setTexte] = React.useState("");
  const [enCours, setEnCours] = React.useState(false);

  const envoyer = async () => {
    if (!texte.trim()) return;
    setEnCours(true);
    try {
      const cree = await apiPost<ReponseCommentaire>("reponses-commentaire", {
        commentaireMargeId,
        documentId,
        auteur: role,
        texte: texte.trim(),
        date: new Date().toISOString(),
      });
      onReponseAjoutee(cree);
      setTexte("");
    } finally {
      setEnCours(false);
    }
  };

  return (
    <div className="ml-7 mt-1.5 space-y-1.5">
      {reponses.map((r) => (
        <div key={r.id} className="flex items-start gap-1.5 text-xs">
          <CornerDownRight className="mt-0.5 size-3 shrink-0 text-muted-foreground" />
          <div>
            <span className="font-medium">{r.auteur === "etudiant" ? "Étudiant" : "Encadrant"}</span>{" "}
            <span className="text-muted-foreground">· {formatDateTime(r.date)}</span>
            <p>{r.texte}</p>
          </div>
        </div>
      ))}
      <div className="flex gap-1.5">
        <Input
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              envoyer();
            }
          }}
          placeholder="Répondre…"
          className="h-7 text-xs"
        />
        <Button size="sm" variant="ghost" className="h-7" onClick={envoyer} disabled={!texte.trim() || enCours}>
          Envoyer
        </Button>
      </div>
    </div>
  );
}
