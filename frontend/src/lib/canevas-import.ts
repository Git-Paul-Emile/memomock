/**
 * Extraction (best-effort) des titres de chapitres d'un fichier .docx ou .pdf, pour préremplir
 * un canevas à l'import plutôt que de saisir chaque chapitre à la main.
 *
 * Le fichier n'est jamais envoyé à un serveur : tout est lu et analysé dans le navigateur
 * (JSZip/DOMParser pour le .docx, pdfjs-dist pour le .pdf), cohérent avec le reste de l'app qui
 * est un mock frontend-only.
 */

export const EXTENSIONS_CANEVAS_ACCEPTEES = [".docx", ".pdf"] as const;

const LONGUEUR_MAX_TITRE = 120;
const NB_CHAPITRES_MAX = 30;

export class ImportCanevasError extends Error {}

function estCommeUnTitreEnMajuscules(texte: string): boolean {
  return texte === texte.toUpperCase() && /[A-ZÀ-Ý]/.test(texte);
}

// --- .docx : structure XML (OOXML) lue via JSZip -----------------------------------------

const WORD_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const TAILLE_MIN_TITRE_DEMI_POINTS = 28; // 14pt (w:sz est exprimé en demi-points)

function texteParagrapheDocx(p: Element): string {
  return Array.from(p.getElementsByTagNameNS(WORD_NS, "t"))
    .map((t) => t.textContent ?? "")
    .join("")
    .trim();
}

// Les .docx réels observés n'utilisent pas les styles "Titre"/"Heading" de Word, juste du gras +
// une taille de police plus grande : un paragraphe est retenu comme titre de chapitre s'il
// utilise un style de titre nommé, OU s'il est court, en gras, et soit tout en majuscules soit
// avec une taille de police >= 14pt.
function estCommeUnTitreDocx(p: Element, texte: string): boolean {
  if (!texte || texte.length > LONGUEUR_MAX_TITRE) return false;

  const styleId = p.getElementsByTagNameNS(WORD_NS, "pStyle")[0]?.getAttribute("w:val");
  if (styleId && /^(heading|titre)\d/i.test(styleId)) return true;

  const runs = Array.from(p.getElementsByTagNameNS(WORD_NS, "r"));
  const enGras = runs.some((r) => r.getElementsByTagNameNS(WORD_NS, "b").length > 0);
  if (!enGras) return false;

  const tailleMax = runs.reduce((max, r) => {
    const sz = r.getElementsByTagNameNS(WORD_NS, "sz")[0]?.getAttribute("w:val");
    const valeur = sz ? parseInt(sz, 10) : 0;
    return Number.isFinite(valeur) ? Math.max(max, valeur) : max;
  }, 0);
  if (tailleMax >= TAILLE_MIN_TITRE_DEMI_POINTS) return true;

  return estCommeUnTitreEnMajuscules(texte);
}

async function extraireTitresDocx(fichier: File): Promise<string[]> {
  const JSZip = (await import("jszip")).default;

  let documentXml: string;
  try {
    const zip = await JSZip.loadAsync(await fichier.arrayBuffer());
    const entree = zip.file("word/document.xml");
    if (!entree) throw new ImportCanevasError("Ce fichier ne semble pas être un .docx valide.");
    documentXml = await entree.async("text");
  } catch (err) {
    if (err instanceof ImportCanevasError) throw err;
    throw new ImportCanevasError("Impossible de lire ce fichier .docx.");
  }

  const doc = new DOMParser().parseFromString(documentXml, "application/xml");
  if (doc.getElementsByTagName("parsererror").length > 0) {
    throw new ImportCanevasError("Le contenu du fichier .docx est illisible.");
  }

  const paragraphes = Array.from(doc.getElementsByTagNameNS(WORD_NS, "p"));
  const titres: string[] = [];
  for (const p of paragraphes) {
    const texte = texteParagrapheDocx(p);
    if (!estCommeUnTitreDocx(p, texte)) continue;
    // Doublons consécutifs (ex : titre répété dans un cadre de texte superposé au corps du
    // document) : on ne garde qu'une occurrence.
    if (titres[titres.length - 1] === texte) continue;
    titres.push(texte);
    if (titres.length >= NB_CHAPITRES_MAX) break;
  }

  return titres;
}

// --- .pdf : texte + taille de police lus via pdfjs-dist -----------------------------------

const NB_PAGES_MAX_PDF = 30;
const FACTEUR_TAILLE_TITRE = 1.2; // taille de ligne attendue par rapport à la taille médiane du document

let workerConfigure = false;

async function chargerPdfjs() {
  const pdfjsLib = await import("pdfjs-dist");
  // pdfjs a besoin d'une URL réelle (utilisée telle quelle, y compris pour son repli "fake
  // worker" en environnement où les Web Workers seraient indisponibles) - on la fait pointer
  // vers l'asset embarqué par le bundler plutôt que de laisser pdfjs deviner un chemin relatif.
  if (!workerConfigure) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url
    ).toString();
    workerConfigure = true;
  }
  return pdfjsLib;
}

async function extraireTitresPdf(fichier: File): Promise<string[]> {
  const pdfjsLib = await chargerPdfjs();

  let pdf;
  try {
    pdf = await pdfjsLib.getDocument({ data: await fichier.arrayBuffer() }).promise;
  } catch {
    throw new ImportCanevasError("Impossible de lire ce fichier PDF.");
  }

  const lignes: { texte: string; taille: number }[] = [];
  const nbPages = Math.min(pdf.numPages, NB_PAGES_MAX_PDF);

  for (let n = 1; n <= nbPages; n++) {
    const page = await pdf.getPage(n);
    const { items } = await page.getTextContent();

    let texteCourant = "";
    let tailleCourante = 0;
    for (const item of items) {
      if (!("str" in item)) continue; // TextMarkedContent : pas de texte exploitable
      texteCourant += item.str;
      tailleCourante = Math.max(tailleCourante, item.height);
      if (item.hasEOL) {
        const texte = texteCourant.trim();
        if (texte) lignes.push({ texte, taille: tailleCourante });
        texteCourant = "";
        tailleCourante = 0;
      }
    }
    const reste = texteCourant.trim();
    if (reste) lignes.push({ texte: reste, taille: tailleCourante });
  }

  if (lignes.length === 0) return [];

  // Taille "de référence" du corps de texte (médiane), pour repérer les lignes nettement plus
  // grandes que le reste - plus fiable que de deviner le gras (les polices intégrées au PDF ont
  // des noms de fonte non standardisés).
  const taillesTriees = [...lignes.map((l) => l.taille)].sort((a, b) => a - b);
  const tailleMediane = taillesTriees[Math.floor(taillesTriees.length / 2)] || 0;

  const titres: string[] = [];
  for (const ligne of lignes) {
    if (!ligne.texte || ligne.texte.length > LONGUEUR_MAX_TITRE) continue;
    const nettementPlusGrand = ligne.taille >= tailleMediane * FACTEUR_TAILLE_TITRE + 1;
    if (!nettementPlusGrand && !estCommeUnTitreEnMajuscules(ligne.texte)) continue;
    if (titres[titres.length - 1] === ligne.texte) continue;
    titres.push(ligne.texte);
    if (titres.length >= NB_CHAPITRES_MAX) break;
  }

  return titres;
}

// --- Point d'entrée commun -----------------------------------------------------------------

/**
 * Lit un fichier .docx ou .pdf et retourne la liste ordonnée (dédupliquée) des titres de
 * chapitres détectés. Ne lève que pour un fichier illisible/de format non supporté - une
 * détection vide est un résultat valide (l'appelant propose alors de créer le canevas sans
 * chapitres préremplis).
 */
export async function extraireTitresChapitres(fichier: File): Promise<string[]> {
  const nom = fichier.name.toLowerCase();
  if (nom.endsWith(".docx")) return extraireTitresDocx(fichier);
  if (nom.endsWith(".pdf")) return extraireTitresPdf(fichier);
  throw new ImportCanevasError("Format non supporté. Utilisez un fichier .docx ou .pdf.");
}
