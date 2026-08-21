"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/context/auth-context";
import { useApiList } from "@/hooks/use-api-list";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { apiPost } from "@/lib/api";
import { LIBELLES_TYPE_DOCUMENT } from "@/types";
import type { Classe, TypeDocument } from "@/types";

function genererCodeClasse() {
  return `CLASSE-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

const NIVEAUX: TypeDocument[] = ["licence", "master", "doctorat"];

/**
 * Classes suivies par l'encadrant connecté (spec sections 9, 71) - qu'elles soient rattachées à
 * un établissement ou créées en mode indépendant (spec section 95, `etablissementId: null`).
 */
export default function ClassesEncadrantPage() {
  const { user } = useAuth();
  const {
    data: classes,
    isLoading,
    refetch,
  } = useApiList<Classe>("classes", { limite: 200 });

  const mesClasses = classes.filter((c) => user && c.encadrantIds.includes(user.id));

  const [ouvert, setOuvert] = React.useState(false);
  const [nom, setNom] = React.useState("");
  const [niveau, setNiveau] = React.useState<TypeDocument>("master");
  const [enCours, setEnCours] = React.useState(false);

  const creer = async () => {
    if (!nom.trim() || !user) return;
    setEnCours(true);
    try {
      await apiPost<Classe>("classes", {
        etablissementId: null,
        filiereId: null,
        nom: nom.trim(),
        niveau,
        code: genererCodeClasse(),
        encadrantIds: [user.id],
        createdAt: new Date().toISOString(),
      });
      setNom("");
      setOuvert(false);
      refetch();
      toast.success("Classe créée.");
    } catch {
      toast.error("La création a échoué.");
    } finally {
      setEnCours(false);
    }
  };

  if (isLoading) {
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
        title="Mes classes"
        description="Regroupez vos étudiants par promotion pour un suivi et un code de rattachement partagés."
        actions={
          <Dialog open={ouvert} onOpenChange={setOuvert}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="size-4" />
                Créer une classe
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nouvelle classe</DialogTitle>
                <DialogDescription>
                  Ex : « Master Informatique — Promotion 2026 ». Vous obtiendrez un code à
                  partager avec vos étudiants.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="classe-nom">Nom</Label>
                  <Input id="classe-nom" value={nom} onChange={(e) => setNom(e.target.value)} />
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

      {mesClasses.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Aucune classe"
          description="Créez une classe pour regrouper vos étudiants et obtenir un code de rattachement."
        />
      ) : (
        <div className="space-y-2">
          {mesClasses.map((c) => (
            <Link key={c.id} href={`/encadrant/classes/${c.id}`}>
              <Card className="transition-colors hover:bg-accent/50">
                <CardContent className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium">{c.nom}</p>
                    <p className="text-xs text-muted-foreground">
                      {LIBELLES_TYPE_DOCUMENT[c.niveau]}
                      {!c.etablissementId && " · Indépendante"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{c.encadrantIds.length} encadreur(s)</Badge>
                    <code className="text-xs text-muted-foreground">{c.code}</code>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
