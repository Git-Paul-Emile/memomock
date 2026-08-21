"use client";

import * as React from "react";
import { CalendarClock, CheckCircle2, Plus, Sparkles, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/context/auth-context";
import { useApiList } from "@/hooks/use-api-list";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Switch } from "@/components/ui/switch";
import { apiDelete, apiPatch, apiPost } from "@/lib/api";
import { genererPlanning } from "@/lib/planning";
import { estPassee, partitionnerSeances } from "@/lib/retards";
import { formatDateTime } from "@/lib/utils";
import type { DisponibiliteEncadrant, PublicUser, Seance, StatutSeance } from "@/types";

const JOURS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

export default function PlanningEncadrantPage() {
  const { user } = useAuth();

  const { data: etudiants } = useApiList<PublicUser>("users", {
    filtres: { encadrantId: user?.id },
    limite: 100,
  });
  const etudiantsParId = React.useMemo(
    () => Object.fromEntries(etudiants.map((e) => [e.id, e])),
    [etudiants]
  );

  const {
    data: seances,
    isLoading: chargementSeances,
    refetch: refetchSeances,
  } = useApiList<Seance>("seances", {
    filtres: { encadrantId: user?.id },
    tri: "dateHeure",
    ordre: "asc",
    limite: 200,
  });

  const {
    data: disponibilites,
    refetch: refetchDisponibilites,
  } = useApiList<DisponibiliteEncadrant>("disponibilites-encadrant", {
    filtres: { encadrantId: user?.id },
    limite: 50,
  });

  const [filtreEtudiant, setFiltreEtudiant] = React.useState<string>("tous");
  const seancesFiltrees =
    filtreEtudiant === "tous" ? seances : seances.filter((s) => s.etudiantId === filtreEtudiant);
  const { aVenir: seancesAVenir, passees: seancesPassees } = partitionnerSeances(seancesFiltrees);

  const marquerStatut = async (seance: Seance, statut: StatutSeance) => {
    await apiPatch<Seance>("seances", seance.id, { statut, updatedAt: new Date().toISOString() });
    refetchSeances();
  };

  const supprimerSeance = async (id: string) => {
    await apiDelete("seances", id);
    refetchSeances();
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Planning"
        description="Séances de suivi, disponibilités et génération automatique de calendrier."
      />

      <div className="space-y-6">
        <CarteDisponibilites
          disponibilites={disponibilites}
          onChange={refetchDisponibilites}
        />

        <CarteGenererPlanning
          etudiants={etudiants}
          disponibilites={disponibilites}
          onGenere={refetchSeances}
        />

        <Card>
          <CardHeader className="flex-row items-start justify-between">
            <div>
              <CardTitle className="text-base">Séances</CardTitle>
              <CardDescription>À venir puis passées, filtrable par étudiant.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {etudiants.length > 0 && (
                <Select value={filtreEtudiant} onValueChange={setFiltreEtudiant}>
                  <SelectTrigger size="sm" className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tous">Tous les étudiants</SelectItem>
                    {etudiants.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.prenom} {e.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <NouvelleSeance etudiants={etudiants} onCree={refetchSeances} />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {chargementSeances ? (
              <Skeleton className="h-24 w-full" />
            ) : seancesFiltrees.length === 0 ? (
              <EmptyState
                icon={CalendarClock}
                title="Aucune séance"
                description="Créez une séance manuellement ou générez un planning complet ci-dessus."
              />
            ) : (
              <>
                {seancesAVenir.map((s) => (
                  <LigneSeance
                    key={s.id}
                    seance={s}
                    etudiant={etudiantsParId[s.etudiantId]}
                    onMarquer={marquerStatut}
                    onSupprimer={supprimerSeance}
                  />
                ))}
                {seancesPassees.length > 0 && (
                  <p className="pt-2 text-xs font-medium text-muted-foreground">Passées</p>
                )}
                {seancesPassees.map((s) => (
                  <LigneSeance
                    key={s.id}
                    seance={s}
                    etudiant={etudiantsParId[s.etudiantId]}
                    onMarquer={marquerStatut}
                    onSupprimer={supprimerSeance}
                  />
                ))}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function LigneSeance({
  seance,
  etudiant,
  onMarquer,
  onSupprimer,
}: {
  seance: Seance;
  etudiant?: PublicUser;
  onMarquer: (seance: Seance, statut: StatutSeance) => Promise<void>;
  onSupprimer: (id: string) => Promise<void>;
}) {
  const enRetard = seance.statut === "planifiee" && estPassee(seance.dateHeure);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
      <div>
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">{seance.titre}</p>
          {seance.statut === "effectuee" && <Badge variant="success">Effectuée</Badge>}
          {seance.statut === "annulee" && <Badge variant="secondary">Annulée</Badge>}
          {enRetard && <Badge variant="destructive">Non effectuée</Badge>}
        </div>
        <p className="text-xs text-muted-foreground">
          {etudiant ? `${etudiant.prenom} ${etudiant.nom}` : "-"} · {formatDateTime(seance.dateHeure)}
        </p>
        {seance.tache && <p className="text-xs text-muted-foreground">Tâche : {seance.tache}</p>}
      </div>
      <div className="flex gap-1">
        {seance.statut === "planifiee" && (
          <>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Marquer effectuée"
              onClick={() => onMarquer(seance, "effectuee")}
            >
              <CheckCircle2 className="size-4 text-success" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Annuler"
              onClick={() => onMarquer(seance, "annulee")}
            >
              <X className="size-4 text-muted-foreground" />
            </Button>
          </>
        )}
        <Button
          variant="ghost"
          size="icon"
          aria-label="Supprimer"
          onClick={() => onSupprimer(seance.id)}
        >
          <Trash2 className="size-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}

function CarteDisponibilites({
  disponibilites,
  onChange,
}: {
  disponibilites: DisponibiliteEncadrant[];
  onChange: () => void;
}) {
  const { user } = useAuth();
  const [ouvert, setOuvert] = React.useState(false);
  const [jourSemaine, setJourSemaine] = React.useState("1");
  const [heureDebut, setHeureDebut] = React.useState("18:00");
  const [heureFin, setHeureFin] = React.useState("21:00");

  const ajouter = async () => {
    if (!user) return;
    await apiPost<DisponibiliteEncadrant>("disponibilites-encadrant", {
      encadrantId: user.id,
      jourSemaine: Number(jourSemaine),
      heureDebut,
      heureFin,
    });
    setOuvert(false);
    onChange();
  };

  const supprimer = async (id: string) => {
    await apiDelete("disponibilites-encadrant", id);
    onChange();
  };

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between">
        <div>
          <CardTitle className="text-base">Mes disponibilités</CardTitle>
          <CardDescription>
            Créneaux hebdomadaires utilisés pour proposer un planning (spec section 74).
          </CardDescription>
        </div>
        <Dialog open={ouvert} onOpenChange={setOuvert}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="size-4" />
              Ajouter
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouveau créneau</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Jour</Label>
                <Select value={jourSemaine} onValueChange={setJourSemaine}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {JOURS.map((j, i) => (
                      <SelectItem key={j} value={String(i)}>
                        {j}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="heure-debut">De</Label>
                  <Input
                    id="heure-debut"
                    type="time"
                    value={heureDebut}
                    onChange={(e) => setHeureDebut(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="heure-fin">À</Label>
                  <Input
                    id="heure-fin"
                    type="time"
                    value={heureFin}
                    onChange={(e) => setHeureFin(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOuvert(false)}>
                Annuler
              </Button>
              <Button onClick={ajouter}>Ajouter</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {disponibilites.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune disponibilité déclarée.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {disponibilites.map((d) => (
              <Badge key={d.id} variant="secondary" className="gap-1 pl-2.5">
                {JOURS[d.jourSemaine]} {d.heureDebut}-{d.heureFin}
                <button
                  type="button"
                  onClick={() => supprimer(d.id)}
                  className="ml-0.5 rounded-full hover:text-destructive"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function NouvelleSeance({
  etudiants,
  onCree,
}: {
  etudiants: PublicUser[];
  onCree: () => void;
}) {
  const { user } = useAuth();
  const [ouvert, setOuvert] = React.useState(false);
  const [etudiantId, setEtudiantId] = React.useState<string | undefined>(undefined);
  const [titre, setTitre] = React.useState("");
  const [tache, setTache] = React.useState("");
  const [dateHeure, setDateHeure] = React.useState("");
  const [enCours, setEnCours] = React.useState(false);

  const creer = async () => {
    if (!user || !etudiantId || !titre.trim() || !dateHeure) return;
    setEnCours(true);
    try {
      const maintenant = new Date().toISOString();
      await apiPost<Seance>("seances", {
        encadrantId: user.id,
        etudiantId,
        titre: titre.trim(),
        tache: tache.trim() || null,
        dateHeure: new Date(dateHeure).toISOString(),
        statut: "planifiee",
        createdAt: maintenant,
        updatedAt: maintenant,
      });
      setTitre("");
      setTache("");
      setDateHeure("");
      setEtudiantId(undefined);
      setOuvert(false);
      onCree();
      toast.success("Séance créée.");
    } catch {
      toast.error("La création a échoué.");
    } finally {
      setEnCours(false);
    }
  };

  return (
    <Dialog open={ouvert} onOpenChange={setOuvert}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" />
          Nouvelle séance
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvelle séance</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Étudiant</Label>
            <Select value={etudiantId} onValueChange={setEtudiantId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sélectionner un étudiant" />
              </SelectTrigger>
              <SelectContent>
                {etudiants.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.prenom} {e.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="seance-titre">Titre</Label>
            <Input
              id="seance-titre"
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              placeholder="Ex : Point d'avancement"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="seance-tache">Tâche prévue (facultatif)</Label>
            <Input id="seance-tache" value={tache} onChange={(e) => setTache(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="seance-date">Date et heure</Label>
            <Input
              id="seance-date"
              type="datetime-local"
              value={dateHeure}
              onChange={(e) => setDateHeure(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOuvert(false)}>
            Annuler
          </Button>
          <Button onClick={creer} disabled={!etudiantId || !titre.trim() || !dateHeure || enCours}>
            Créer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CarteGenererPlanning({
  etudiants,
  disponibilites,
  onGenere,
}: {
  etudiants: PublicUser[];
  disponibilites: DisponibiliteEncadrant[];
  onGenere: () => void;
}) {
  const { user } = useAuth();
  const [ouvert, setOuvert] = React.useState(false);
  const [etudiantId, setEtudiantId] = React.useState<string | undefined>(undefined);
  const [dateDebut, setDateDebut] = React.useState(new Date().toISOString().slice(0, 10));
  const [dateSoutenance, setDateSoutenance] = React.useState("");
  const [nombreSeances, setNombreSeances] = React.useState(6);
  const [utiliserDisponibilites, setUtiliserDisponibilites] = React.useState(true);
  const [enCours, setEnCours] = React.useState(false);

  const generer = async () => {
    if (!user || !etudiantId || !dateSoutenance) return;
    setEnCours(true);
    try {
      const propositions = genererPlanning(
        new Date(dateDebut),
        new Date(dateSoutenance),
        nombreSeances,
        utiliserDisponibilites ? disponibilites : []
      );
      if (propositions.length === 0) {
        toast.error("Impossible de générer un planning avec ces paramètres.");
        return;
      }
      const maintenant = new Date().toISOString();
      for (const [i, p] of propositions.entries()) {
        await apiPost<Seance>("seances", {
          encadrantId: user.id,
          etudiantId,
          titre: `Séance ${i + 1}`,
          tache: p.tache,
          dateHeure: p.dateHeure,
          statut: "planifiee",
          createdAt: maintenant,
          updatedAt: maintenant,
        });
      }
      toast.success(`${propositions.length} séance(s) créée(s).`);
      setOuvert(false);
      onGenere();
    } catch {
      toast.error("La génération a échoué.");
    } finally {
      setEnCours(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="size-4 text-primary" />
          Générer un planning
        </CardTitle>
        <CardDescription>
          Répartit automatiquement les séances jusqu&apos;à la soutenance, sur vos disponibilités
          déclarées (spec section 75).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Dialog open={ouvert} onOpenChange={setOuvert}>
          <DialogTrigger asChild>
            <Button variant="outline" disabled={etudiants.length === 0}>
              <Sparkles className="size-4" />
              Générer
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Générer un planning</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Étudiant</Label>
                <Select value={etudiantId} onValueChange={setEtudiantId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Sélectionner un étudiant" />
                  </SelectTrigger>
                  <SelectContent>
                    {etudiants.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.prenom} {e.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="date-debut">Date de début</Label>
                  <Input
                    id="date-debut"
                    type="date"
                    value={dateDebut}
                    onChange={(e) => setDateDebut(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="date-soutenance">Date de soutenance</Label>
                  <Input
                    id="date-soutenance"
                    type="date"
                    value={dateSoutenance}
                    onChange={(e) => setDateSoutenance(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nb-seances">Nombre de séances</Label>
                <Input
                  id="nb-seances"
                  type="number"
                  min={1}
                  max={20}
                  value={nombreSeances}
                  onChange={(e) => setNombreSeances(Number(e.target.value) || 1)}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Utiliser mes disponibilités</p>
                  <p className="text-xs text-muted-foreground">
                    {disponibilites.length === 0
                      ? "Aucune déclarée : les séances seront réparties sans contrainte de jour."
                      : `${disponibilites.length} créneau(x) déclaré(s).`}
                  </p>
                </div>
                <Switch
                  checked={utiliserDisponibilites}
                  onCheckedChange={setUtiliserDisponibilites}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOuvert(false)}>
                Annuler
              </Button>
              <Button
                onClick={generer}
                disabled={!etudiantId || !dateSoutenance || enCours}
              >
                Générer le planning
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
