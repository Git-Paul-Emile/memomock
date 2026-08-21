"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { ApercuDocument } from "@/components/documents/apercu-document";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";

export default function ApercuDocumentEtudiantPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Aperçu du document"
        description="Rendu du contenu tel qu'analysé par la plateforme."
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href={`/etudiant/documents/${id}/export`}>
              <ArrowLeft className="size-4" />
              Retour
            </Link>
          </Button>
        }
      />
      <ApercuDocument documentId={id} />
    </div>
  );
}
