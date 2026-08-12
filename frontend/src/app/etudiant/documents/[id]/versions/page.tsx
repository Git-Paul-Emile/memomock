"use client";

import { useParams } from "next/navigation";

import { HistoriqueVersions } from "@/components/documents/historique-versions";

export default function VersionsDocumentEtudiantPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <HistoriqueVersions
      documentId={id}
      retourHref={`/etudiant/documents/${id}/analyse`}
      peutRestaurer
    />
  );
}
