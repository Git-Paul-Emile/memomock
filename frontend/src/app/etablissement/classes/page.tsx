"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/context/auth-context";
import { useApiList } from "@/hooks/use-api-list";
import { useApiResource } from "@/hooks/use-api-resource";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { apiList, apiPost } from "@/lib/api";
import { LIBELLES_TYPE_DOCUMENT } from "@/types";
import type { Classe, Etablissement, Filiere, TypeDocument } from "@/types";

function genererCodeClasse() {
  return `CLASSE-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

const NIVEAUX: TypeDocument[] = ["licence", "master", "doctorat"];

/** Liste + création de classes d'un établissement (spec sections 9, 12). */
export default function ClassesEtablissementPage() {
  const { user } = useAuth();
  const { data: etablissement, isLoading: chargementEtab } = useApiResource<Etablissement | null>(
    ["mon-etablissement", user?.id],
    async () => {
      const res = await apiList<Etablissement>("etablissements", {
        filtres: { adminId: user!.id },
        limite: 1,
      });
      return res.data[0] ?? null;
    },
    { enabled: !!user }
  );

  const { data: filieres } = useApiList<Filiere>("filieres", {
    filtres: { etablissementId: etablissement?.id },
    limite: 100,
  });

  const {
    data: classes,
    isLoading,
    refetch,
  } = useApiList<Classe>("classes", {
    filtres: { etablissementId: etablissement?.id },
    limite: 100,
  });

  const [ouvert, setOuvert] = React.useState(false);
  const [nom, setNom] = React.useState("");
  const [filiereId, setFiliereId] = React.useState<string | undefined>(undefined);
  const [niveau, setNiveau] = React.useState<TypeDocument>("master");
  const [enCours, setEnCours] = React.useState(false);

  const creer = async () => {
    if (!nom.trim() || !etablissement) return;
    setEnCours(true);
    try {
      await apiPost<Classe>("classes", {
        etablissementId: etablissement.id,
        filiereId: filiereId ?? null,
        nom: nom.trim(),
        niveau,
        code: genererCodeClasse(),
        encadrantIds: [],
        createdAt: new Date().toISOString(),
      });
      setNom("");
      setFiliereId(undefined);
      setOuvert(false);
      refetch();
      toast.success("Classe créée.");
    } catch {
      toast.error("La création a échoué.");
    } finally {
      setEnCours(false);
    }
  };

  if (chargementEtab || isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Classes"
        description="Ex : « Master Informatique — Promotion 2026 »."
        actions={
          <Dialog open={ouvert} onOpenChange={setOuvert}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="size-4" />
                Nouvelle classe
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nouvelle classe</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="classe-nom">Nom</Label>
                  <Input
                    id="classe-nom"
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    placeholder="Ex : Master Informatique — Promotion 2026"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Filière</Label>
                  <Select value={filiereId} onValueChange={setFiliereId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Sélectionner une filière" />
                    </SelectTrigger>
                    <SelectContent>
                      {filieres.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.nom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Niveau</Label>
                  <Select value={niveau} onValueChange={(v) => setNiveau(v as TypeDocument)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {NIVEAUX.map((n) => (
                        <SelectItem key={n} value={n}>
                          {LIBELLES_TYPE_DOCUMENT[n]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOuvert(false)}>
                  Annuler
                </Button>
                <Button onClick={creer} disabled={!nom.trim() || enCours}>
                  Créer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {classes.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Aucune classe"
          description="Créez votre première classe pour obtenir un code de rattachement à partager avec vos étudiants."
        />
      ) : (
        <div className="space-y-2">
          {classes.map((c) => {
            const filiere = filieres.find((f) => f.id === c.filiereId);
            return (
              <Link key={c.id} href={`/etablissement/classes/${c.id}`}>
                <Card className="transition-colors hover:bg-accent/50">
                  <CardContent className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium">{c.nom}</p>
                      <p className="text-xs text-muted-foreground">
                        {LIBELLES_TYPE_DOCUMENT[c.niveau]}
                        {filiere ? ` · ${filiere.nom}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{c.encadrantIds.length} encadreur(s)</Badge>
                      <code className="text-xs text-muted-foreground">{c.code}</code>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
