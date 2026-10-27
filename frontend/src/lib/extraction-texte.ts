/**
 * Extraction du texte intégral d'un fichier .docx ou .pdf, dans le navigateur (aucun envoi du
 * fichier à un serveur de stockage en mode mock). Le texte sert à l'analyse IA (spec v2, § 23) et
 * à l'ingestion des ressources de l'encadreur (§ 19).
 *
 * Les titres détectés sont préfixés par « ## » pour que l'IA repère la structure du document.
 */

import {
  WORD_NS,
  chargerPdfjs,
  estCommeUnTitreDocx,
  texteParagrapheDocx,
} from "./canevas-import";

export const EXTENSIONS_TEXTE_ACCEPTEES = [".docx", ".pdf"] as const;
const NB_PAGES_MAX_PDF = 250;
export const TEXTE_MAX_CARACTERES = 200_000;

export class ExtractionTexteError extends Error {}

async function extraireDocx(fichier: File): Promise<string> {
  const JSZip = (await import("jszip")).default;
  let xml: string;
  try {
    const zip = await JSZip.loadAsync(await fichier.arrayBuffer());
    const entree = zip.file("word/document.xml");
    if (!entree) throw new ExtractionTexteError("Ce fichier ne semble pas être un .docx valide.");
    xml = await entree.async("text");
  } catch (err) {
    if (err instanceof ExtractionTexteError) throw err;
    throw new ExtractionTexteError("Impossible de lire ce fichier .docx.");
  }
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const lignes: string[] = [];
  for (const p of Array.from(doc.getElementsByTagNameNS(WORD_NS, "p"))) {
    const texte = texteParagrapheDocx(p);
    if (!texte) continue;
    lignes.push(estCommeUnTitreDocx(p, texte) ? `## ${texte}` : texte);
  }
  return lignes.join("\n");
}

async function extrairePdf(fichier: File): Promise<string> {
  const pdfjsLib = await chargerPdfjs();
  let pdf;
  try {
    pdf = await pdfjsLib.getDocument({ data: await fichier.arrayBuffer() }).promise;
  } catch {
    throw new ExtractionTexteError("Impossible de lire ce fichier PDF.");
  }
  const pages: string[] = [];
  for (let n = 1; n <= Math.min(pdf.numPages, NB_PAGES_MAX_PDF); n++) {
    const { items } = await (await pdf.getPage(n)).getTextContent();
    let page = "";
    for (const item of items) {
      if (!("str" in item)) continue;
      page += item.str + (item.hasEOL ? "\n" : "");
    }
    pages.push(page.trim());
  }
  return pages.join("\n\n");
}

/**
 * Renvoie le texte du fichier (tronqué à {@link TEXTE_MAX_CARACTERES}). Lève
 * {@link ExtractionTexteError} si le format n'est pas lisible (ex. ancien .doc).
 */
export async function extraireTexte(fichier: File): Promise<string> {
  const nom = fichier.name.toLowerCase();
  let texte: string;
  if (nom.endsWith(".docx")) texte = await extraireDocx(fichier);
  else if (nom.endsWith(".pdf")) texte = await extrairePdf(fichier);
  else throw new ExtractionTexteError("Seuls les fichiers .docx et .pdf peuvent être lus.");
  return texte.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim().slice(0, TEXTE_MAX_CARACTERES);
}

/** Texte brut d'un contenu HTML (éditeur de rédaction), titres préfixés par « ## ». */
export function texteDepuisHtml(html: string): string {
  if (typeof window === "undefined") return html.replace(/<[^>]+>/g, " ");
  const doc = new DOMParser().parseFromString(html, "text/html");
  const lignes: string[] = [];
  doc.body.querySelectorAll("h1, h2, h3, h4, p, li, blockquote").forEach((el) => {
    const texte = el.textContent?.trim();
    if (!texte) return;
    lignes.push(/^H\d$/.test(el.tagName) ? `## ${texte}` : texte);
  });
  return lignes.join("\n");
}
