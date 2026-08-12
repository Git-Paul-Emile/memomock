"use client";

import { useParams } from "next/navigation";

import { HistoriqueVersions } from "@/components/documents/historique-versions";

export default function VersionsDocumentEncadrantPage() {
  const { id } = useParams<{ id: string }>();
  return <HistoriqueVersions documentId={id} retourHref={`/encadrant/documents/${id}/reception`} />;
}
