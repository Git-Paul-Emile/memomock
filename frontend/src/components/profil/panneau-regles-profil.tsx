"use client";

import * as React from "react";
import { Check, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LIBELLES_CATEGORIE_REGLE } from "@/types";
import type { CategorieRegle, RegleProfil } from "@/types";

const CATEGORIES = Object.keys(LIBELLES_CATEGORIE_REGLE) as CategorieRegle[];

/**
 * Synthèse et contrôle des règles du profil (spec v2, § 19) : les règles extraites par l'IA
 * restent « à vérifier » tant que l'encadreur ne les a pas confirmées - seules les règles
 * confirmées sont utilisées par l'analyse.
 */
export function PanneauReglesProfil({
  regles,
  onChange,
}: {
  regles: RegleProfil[];
  onChange: (regles: RegleProfil[]) => Promise<void>;
}) {
  const [enEdition, setEnEdition] = React.useState<string | null>(null);
  const [texte, setTexte] = React.useState("");
  const [nouvelle, setNouvelle] = React.useState("");
  const [categorieNouvelle, setCategorieNouvelle] = React.useState<CategorieRegle>("forme");

  const aVerifier = regles.filter((r) => r.statut === "a_verifier");

  const confirmer = (id: string) =>
    onChange(regles.map((r) => (r.id === id ? { ...r, statut: "confirmee" } : r)));
  const confirmerTout = () => onChange(regles.map((r) => ({ ...r, statut: "confirmee" })));
  const supprimer = (id: string) => onChange(regles.filter((r) => r.id !== id));
  const enregistrerEdition = async (id: string) => {
    if (!texte.trim()) return;
    await onChange(regles.map((r) => (r.id === id ? { ...r, libelle: texte.trim(), statut: "confirmee" } : r)));
    setEnEdition(null);
  };
  const ajouter = async () => {
    if (!nouvelle.trim()) return;
    await onChange([
      ...regles,
      {
        id: crypto.randomUUID(),
        categorie: categorieNouvelle,
        libelle: nouvelle.trim(),
        detail: null,
        source: "manuel",
        ressource: null,
        statut: "confirmee",
      },
    ]);
    setNouvelle("");
  };

  return (
    <Card className="mb-4">
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4 text-primary" />
            Règles du profil
          </CardTitle>
          <CardDescription>
            {CATEGORIES.map((c) => `${regles.filter((r) => r.categorie === c).length} ${LIBELLES_CATEGORIE_REGLE[c].toLowerCase()}`).join(" · ")}
            . L&apos;IA ne comprend pas toujours parfaitement vos documents : vérifiez les règles
            importantes avant qu&apos;elles soient appliquées.
          </CardDescription>
        </div>
        {aVerifier.length > 0 && (
          <Button size="sm" variant="outline" onClick={confirmerTout}>
            <Check className="size-4" />
            Tout confirmer ({aVerifier.length})
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {CATEGORIES.map((categorie) => {
          const liste = regles.filter((r) => r.categorie === categorie);
          if (liste.length === 0) return null;
          return (
            <div key={categorie} className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {LIBELLES_CATEGORIE_REGLE[categorie]} ({liste.length})
              </p>
              {liste.map((r) => (
                <div key={r.id} className="flex items-start gap-2 rounded-lg border p-2.5">
                  <div className="min-w-0 flex-1 space-y-1">
                    {enEdition === r.id ? (
                      <div className="flex gap-2">
                        <Input value={texte} onChange={(e) => setTexte(e.target.value)} className="h-8" />
                        <Button size="sm" onClick={() => enregistrerEdition(r.id)}>
                          OK
                        </Button>
                      </div>
                    ) : (
                      <p className="text-sm">{r.libelle}</p>
                    )}
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant={r.statut === "confirmee" ? "success" : "warning"} className="text-[10px]">
                        {r.statut === "confirmee" ? "Confirmée" : "À vérifier"}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {r.source === "ia" ? `Extraite par l'IA${r.ressource ? ` - ${r.ressource}` : ""}` : "Saisie manuelle"}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {r.statut === "a_verifier" && (
                      <Button size="icon" variant="ghost" className="size-7" title="Confirmer" onClick={() => confirmer(r.id)}>
                        <Check className="size-3.5" />
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7"
                      title="Modifier"
                      onClick={() => {
                        setEnEdition(r.id);
                        setTexte(r.libelle);
                      }}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="size-7" title="Supprimer" onClick={() => supprimer(r.id)}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          );
        })}

        {regles.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Téléversez un guide de rédaction ou une grille dans les ressources ci-dessous : l&apos;IA
            en extraira les règles, que vous pourrez ensuite contrôler ici.
          </p>
        )}

        <div className="flex flex-col gap-2 border-t pt-3 sm:flex-row">
          <select
            aria-label="Catégorie de la règle"
            value={categorieNouvelle}
            onChange={(e) => setCategorieNouvelle(e.target.value as CategorieRegle)}
            className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {LIBELLES_CATEGORIE_REGLE[c]}
              </option>
            ))}
          </select>
          <Input
            value={nouvelle}
            onChange={(e) => setNouvelle(e.target.value)}
            placeholder="Ajouter une règle, ex. « Pagination en bas à droite »"
            className="h-9"
          />
          <Button size="sm" onClick={ajouter} disabled={!nouvelle.trim()}>
            <Plus className="size-4" />
            Ajouter
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
