"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Copy, FileUp, Loader2, PartyPopper, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/context/auth-context";
import { useApiList } from "@/hooks/use-api-list";
import { OnboardingWizard } from "@/components/onboarding/wizard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiPost } from "@/lib/api";
import { ExtractionTexteError, extraireTexte } from "@/lib/extraction-texte";
import { extraireReglesAvecIa } from "@/lib/ia/client";
import { creerProfil } from "@/lib/profil";
import { SEUIL_CATEGORIE_DEFAUT, SEUIL_SOUMISSION_DEFAUT } from "@/lib/score";
import { LIBELLES_CATEGORIE_REGLE, LIBELLES_TYPE_DOCUMENT } from "@/types";
import type {
  CategorieRegle,
  ContraintesProfil,
  CritereGrille,
  Discipline,
  ElementReference,
  RegleProfil,
  TypeDocument,
} from "@/types";

const ETAPES = ["Bienvenue", "Profil", "Ressources", "Règles", "Grille", "Invitation"];
const TYPES_DOCUMENT: TypeDocument[] = ["licence", "master", "doctorat"];
const GRILLE_DEFAUT: Omit<CritereGrille, "id">[] = [
  { libelle: "Problématique", poids: 15, ordre: 0 },
  { libelle: "Revue de littérature", poids: 15, ordre: 1 },
  { libelle: "Méthodologie", poids: 20, ordre: 2 },
  { libelle: "Analyse", poids: 20, ordre: 3 },
  { libelle: "Discussion", poids: 15, ordre: 4 },
  { libelle: "Conclusion", poids: 5, ordre: 5 },
  { libelle: "Forme", poids: 10, ordre: 6 },
];

function genererCode(discipline: string): string {
  const prefixe = discipline.normalize("NFD").replace(/[^A-Za-z]/g, "").slice(0, 4).toUpperCase() || "MEMO";
  return `${prefixe}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

/**
 * Onboarding de l'encadreur (spec v2, § 19) : profil → ressources (règles extraites par l'IA et
 * prévisualisées) → règles de forme et seuils → grille → code d'invitation. Tout est enregistré
 * à la validation finale ; chaque étape reste modifiable ensuite depuis les écrans dédiés.
 */
export default function OnboardingEncadrantPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [etape, setEtape] = React.useState(1);
  const [typeDocument, setTypeDocument] = React.useState<TypeDocument>("master");
  const [discipline, setDiscipline] = React.useState("");
  const [ressource, setRessource] = React.useState<ElementReference | null>(null);
  const [regles, setRegles] = React.useState<RegleProfil[]>([]);
  const [analyse, setAnalyse] = React.useState(false);
  const [contraintes, setContraintes] = React.useState<ContraintesProfil>({
    norme: "apa",
    police: "Times New Roman, 12 pt",
    interligne: "1,5",
    marges: "2,5 cm",
    pagesMinimum: 40,
  });
  const [seuils, setSeuils] = React.useState({ soumission: SEUIL_SOUMISSION_DEFAUT, categorie: SEUIL_CATEGORIE_DEFAUT });
  const [grille, setGrille] = React.useState(GRILLE_DEFAUT);
  const [code, setCode] = React.useState<string | null>(null);
  const [enCours, setEnCours] = React.useState(false);

  const { data: disciplines } = useApiList<Discipline>("disciplines", { tri: "nom", limite: 500 });
  const sommeGrille = grille.reduce((t, c) => t + c.poids, 0);

  const importerRessource = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fichier = e.target.files?.[0];
    e.target.value = "";
    if (!fichier) return;
    setAnalyse(true);
    try {
      const titre = fichier.name.replace(/\.(docx|pdf)$/i, "");
      const texte = await extraireTexte(fichier);
      const { source, resultat } = await extraireReglesAvecIa({
        texte,
        titreRessource: titre,
        typeDocument,
        discipline: discipline.trim() || null,
      });
      setRessource({ id: crypto.randomUUID(), titre, description: "", nomFichier: fichier.name, ajouteLe: new Date().toISOString() });
      setRegles(
        resultat.map((r) => ({
          id: crypto.randomUUID(),
          categorie: r.categorie,
          libelle: r.libelle,
          detail: r.detail ?? null,
          source: "ia",
          ressource: titre,
          statut: "a_verifier",
        }))
      );
      if (source === "simulation") toast.info("IA indisponible : extraction simplifiée des règles.");
    } catch (err) {
      toast.error(err instanceof ExtractionTexteError ? err.message : "Le document n'a pas pu être analysé.");
    } finally {
      setAnalyse(false);
    }
  };

  const terminer = async () => {
    if (!user) return;
    setEnCours(true);
    try {
      const profil = await creerProfil(user.id, {
        typeDocument,
        discipline,
        guidesRedaction: ressource ? [ressource] : [],
        // Les règles cochées pendant l'onboarding sont considérées comme vérifiées.
        reglesProfil: regles.map((r) => ({ ...r, statut: "confirmee" })),
        contraintes,
        seuilSoumission: seuils.soumission,
        seuilCategorieMinimum: seuils.categorie,
      });
      await apiPost("grilles-evaluation", {
        id: profil.id,
        profilEncadrantId: profil.id,
        criteres: grille.map((c, i) => ({ ...c, id: crypto.randomUUID(), ordre: i })),
        updatedAt: new Date().toISOString(),
      });
      const nouveauCode = genererCode(discipline);
      await apiPost("invitations", {
        encadrantId: user.id,
        email: "",
        code: nouveauCode,
        statut: "en_attente",
        date: new Date().toISOString(),
      });
      setCode(nouveauCode);
      setEtape(6);
    } catch {
      toast.error("La création de votre profil a échoué. Réessayez.");
    } finally {
      setEnCours(false);
    }
  };

  const retour = (
    <Button variant="ghost" onClick={() => setEtape((e) => Math.max(1, e - 1))}>
      <ArrowLeft className="size-4" />
      Retour
    </Button>
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      <OnboardingWizard etapes={ETAPES} etapeCourante={etape}>
        <Card>
          {etape === 1 && (
            <>
              <CardHeader className="items-center text-center">
                <PartyPopper className="mb-2 size-10 text-primary" />
                <CardTitle>Bienvenue{user ? `, ${user.prenom}` : ""} !</CardTitle>
                <CardDescription>
                  En quelques minutes, apprenez à MemoAssistant AI vos exigences : l&apos;IA
                  analysera ensuite les mémoires de vos étudiants selon VOS règles, avant
                  qu&apos;ils vous les soumettent.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" onClick={() => setEtape(2)}>
                  Commencer
                  <ArrowRight className="size-4" />
                </Button>
              </CardContent>
            </>
          )}

          {etape === 2 && (
            <>
              <CardHeader>
                <CardTitle>Votre premier profil méthodologique</CardTitle>
                <CardDescription>
                  Un profil = un type de document et une discipline. Vous pourrez en créer
                  d&apos;autres (ex. « Doctorat - Informatique »).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="type-document">Type de document</Label>
                  <select
                    id="type-document"
                    value={typeDocument}
                    onChange={(e) => setTypeDocument(e.target.value as TypeDocument)}
                    className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                  >
                    {TYPES_DOCUMENT.map((t) => (
                      <option key={t} value={t}>
                        {LIBELLES_TYPE_DOCUMENT[t]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="discipline">Discipline</Label>
                  <Input
                    id="discipline"
                    list="disciplines-reference"
                    value={discipline}
                    onChange={(e) => setDiscipline(e.target.value)}
                    placeholder="Ex : Informatique"
                  />
                  <datalist id="disciplines-reference">
                    {disciplines.map((d) => (
                      <option key={d.id} value={d.nom} />
                    ))}
                  </datalist>
                </div>
                <div className="flex justify-between">
                  {retour}
                  <Button onClick={() => setEtape(3)} disabled={!discipline.trim()}>
                    Continuer
                    <ArrowRight className="size-4" />
                  </Button>
                </div>
              </CardContent>
            </>
          )}

          {etape === 3 && (
            <>
              <CardHeader>
                <CardTitle>Vos ressources</CardTitle>
                <CardDescription>
                  Téléversez votre guide de rédaction ou votre grille (.docx ou .pdf). L&apos;IA en
                  extrait les règles ; vous les vérifierez juste après. Étape facultative.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed px-4 py-8 text-center hover:bg-accent/50">
                  {analyse ? <Loader2 className="size-6 animate-spin text-primary" /> : <FileUp className="size-6 text-muted-foreground" />}
                  <span className="text-sm font-medium">
                    {analyse ? "Analyse du document…" : ressource ? ressource.nomFichier : "Choisir un fichier"}
                  </span>
                  <input type="file" accept=".docx,.pdf" className="hidden" onChange={importerRessource} disabled={analyse} />
                </label>
                {regles.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">
                      {regles.length} règle(s) détectée(s) :{" "}
                      {(Object.keys(LIBELLES_CATEGORIE_REGLE) as CategorieRegle[])
                        .map((c) => `${regles.filter((r) => r.categorie === c).length} ${LIBELLES_CATEGORIE_REGLE[c].toLowerCase()}`)
                        .join(", ")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Décochez les règles erronées : l&apos;IA ne comprend pas toujours parfaitement
                      un document.
                    </p>
                    <div className="max-h-60 space-y-1.5 overflow-y-auto rounded-lg border p-2">
                      {regles.map((r) => (
                        <label key={r.id} className="flex items-start gap-2 text-sm">
                          <input
                            type="checkbox"
                            className="mt-1"
                            defaultChecked
                            onChange={(e) =>
                              setRegles((prev) =>
                                e.target.checked ? prev : prev.filter((x) => x.id !== r.id)
                              )
                            }
                          />
                          <span>
                            <Badge variant="outline" className="mr-1.5 text-[10px]">
                              {LIBELLES_CATEGORIE_REGLE[r.categorie]}
                            </Badge>
                            {r.libelle}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex justify-between">
                  {retour}
                  <Button onClick={() => setEtape(4)} disabled={analyse}>
                    {ressource ? "Continuer" : "Passer cette étape"}
                    <ArrowRight className="size-4" />
                  </Button>
                </div>
              </CardContent>
            </>
          )}

          {etape === 4 && (
            <>
              <CardHeader>
                <CardTitle>Règles de forme et seuils</CardTitle>
                <CardDescription>
                  Ce que l&apos;IA vérifiera, et le niveau exigé avant qu&apos;un étudiant puisse
                  vous soumettre son document.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="norme">Norme de citation</Label>
                    <select
                      id="norme"
                      value={contraintes.norme}
                      onChange={(e) => setContraintes((c) => ({ ...c, norme: e.target.value }))}
                      className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                    >
                      <option value="apa">APA (7e édition)</option>
                      <option value="iso690">ISO 690</option>
                      <option value="chicago">Chicago</option>
                      <option value="vancouver">Vancouver</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="police">Police et taille</Label>
                    <Input id="police" value={contraintes.police ?? ""} onChange={(e) => setContraintes((c) => ({ ...c, police: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="interligne">Interligne</Label>
                    <Input id="interligne" value={contraintes.interligne ?? ""} onChange={(e) => setContraintes((c) => ({ ...c, interligne: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="marges">Marges</Label>
                    <Input id="marges" value={contraintes.marges ?? ""} onChange={(e) => setContraintes((c) => ({ ...c, marges: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="seuil">Score global minimal (%)</Label>
                    <Input id="seuil" type="number" min={0} max={100} value={seuils.soumission} onChange={(e) => setSeuils((s) => ({ ...s, soumission: Number(e.target.value) || 0 }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="seuil-cat">Minimum par catégorie (%)</Label>
                    <Input id="seuil-cat" type="number" min={0} max={100} value={seuils.categorie} onChange={(e) => setSeuils((s) => ({ ...s, categorie: Number(e.target.value) || 0 }))} />
                  </div>
                </div>
                <div className="flex justify-between">
                  {retour}
                  <Button onClick={() => setEtape(5)}>
                    Continuer
                    <ArrowRight className="size-4" />
                  </Button>
                </div>
              </CardContent>
            </>
          )}

          {etape === 5 && (
            <>
              <CardHeader>
                <CardTitle>Grille d&apos;évaluation</CardTitle>
                <CardDescription>
                  Elle oriente l&apos;analyse de l&apos;IA et pondère le score ; elle ne remplace
                  jamais votre note.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {grille.map((c, i) => (
                  <div key={c.libelle} className="flex items-center gap-2">
                    <span className="flex-1 text-sm">{c.libelle}</span>
                    <Input
                      type="number"
                      className="w-20"
                      aria-label={`Poids ${c.libelle}`}
                      value={c.poids}
                      onChange={(e) =>
                        setGrille((g) => g.map((x, j) => (j === i ? { ...x, poids: Number(e.target.value) || 0 } : x)))
                      }
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                ))}
                <p className={sommeGrille === 100 ? "text-sm text-success" : "text-sm text-destructive"}>
                  Total : {sommeGrille} / 100
                </p>
                <div className="flex justify-between">
                  {retour}
                  <Button onClick={terminer} disabled={enCours || sommeGrille !== 100}>
                    {enCours ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                    Valider mon profil
                  </Button>
                </div>
              </CardContent>
            </>
          )}

          {etape === 6 && code && (
            <>
              <CardHeader className="items-center text-center">
                <Sparkles className="mb-2 size-10 text-primary" />
                <CardTitle>Votre profil est prêt !</CardTitle>
                <CardDescription>
                  Partagez ce code à vos étudiants : en le saisissant, ils sont rattachés à vous et
                  à ce profil.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <code className="block rounded-md border bg-muted px-3 py-3 text-center text-xl font-semibold tracking-widest">
                  {code}
                </code>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Button variant="outline" onClick={() => navigator.clipboard?.writeText(code).then(() => toast.success("Code copié."))}>
                    <Copy className="size-4" />
                    Copier
                  </Button>
                  <Button variant="outline" asChild>
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(`Rejoignez mon espace d'encadrement sur MemoAssistant AI avec le code ${code}.`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Partager sur WhatsApp
                    </a>
                  </Button>
                </div>
                <Button className="w-full" onClick={() => router.push("/encadrant/dashboard")}>
                  Accéder à mon tableau de bord
                  <ArrowRight className="size-4" />
                </Button>
              </CardContent>
            </>
          )}
        </Card>
      </OnboardingWizard>
    </div>
  );
}
