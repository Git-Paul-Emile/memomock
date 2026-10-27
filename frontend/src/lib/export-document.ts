/**
 * Export Word / PDF d'un document à partir de son texte (spec v2, § 30) : texte rédigé dans la
 * plateforme ou importé, AVEC les corrections de l'encadreur appliquées (segments de révision).
 *
 * Sans serveur de conversion en mode mock : le Word est un document HTML ouvert nativement par
 * Word (.doc), le PDF passe par la boîte d'impression du navigateur (« Enregistrer en PDF »).
 */

import { apiList } from "./api";
import { chargerContenu } from "./analyse-document";
import { texteCourantDuParagraphe } from "./revision-diff";
import type { Analyse, DocumentSubmission, RevisionSegment } from "@/types";

function echapper(texte: string): string {
  return texte.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Corps HTML du document : version corrigée si l'encadreur a révisé, sinon le contenu. */
export async function corpsDocument(documentId: string): Promise<string | null> {
  const [segments, contenu] = await Promise.all([
    apiList<RevisionSegment>("revisions", { filtres: { documentId }, limite: 5000 }),
    chargerContenu(documentId),
  ]);
  if (segments.data.length > 0) {
    const parParagraphe = new Map<number, RevisionSegment[]>();
    for (const s of segments.data) parParagraphe.set(s.paragraphe, [...(parParagraphe.get(s.paragraphe) ?? []), s]);
    return [...parParagraphe.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([, liste]) => `<p>${echapper(texteCourantDuParagraphe(liste.sort((a, b) => a.ordre - b.ordre)))}</p>`)
      .join("\n");
  }
  if (contenu?.html) return contenu.html;
  if (contenu?.texte) {
    return contenu.texte
      .split(/\n+/)
      .filter(Boolean)
      .map((ligne) => (ligne.startsWith("## ") ? `<h2>${echapper(ligne.slice(3))}</h2>` : `<p>${echapper(ligne)}</p>`))
      .join("\n");
  }
  return null;
}

export async function annexeSuggestions(documentId: string): Promise<string> {
  const { data } = await apiList<Analyse>("analyses", { filtres: { documentId }, limite: 10 });
  const points = data.flatMap((a) => a.points).filter((p) => p.niveau !== "succes");
  if (points.length === 0) return "";
  return `<h2>Annexe - suggestions de l'IA non traitées</h2><ul>${points
    .map((p) => `<li><strong>${echapper(p.libelle)}</strong> : ${echapper(p.detail)}</li>`)
    .join("")}</ul>`;
}

export function documentHtmlComplet(document: DocumentSubmission, corps: string): string {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${echapper(document.titre)}</title>
<style>@page{size:A4;margin:2.5cm}body{font-family:"Times New Roman",serif;font-size:12pt;line-height:1.5;text-align:justify}
h1{font-size:16pt;text-align:center}h2{font-size:14pt;margin-top:18pt}</style></head>
<body><h1>${echapper(document.titre)}</h1>${corps}</body></html>`;
}

function telechargerBlob(contenu: string, type: string, nom: string) {
  const url = URL.createObjectURL(new Blob(["﻿", contenu], { type }));
  const lien = window.document.createElement("a");
  lien.href = url;
  lien.download = nom;
  lien.click();
  URL.revokeObjectURL(url);
}

function nomFichierBase(document: DocumentSubmission): string {
  return document.titre.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "").slice(0, 60) || "memoire";
}

export function exporterWord(document: DocumentSubmission, html: string) {
  telechargerBlob(html, "application/msword", `${nomFichierBase(document)}-v${document.version}.doc`);
}

/** Ouvre le document mis en page et lance l'impression (choisir « Enregistrer en PDF »). */
export function exporterPdf(html: string): boolean {
  const fenetre = window.open("", "_blank");
  if (!fenetre) return false;
  fenetre.document.write(html);
  fenetre.document.close();
  fenetre.focus();
  fenetre.print();
  return true;
}
