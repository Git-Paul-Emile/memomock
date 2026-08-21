import type { DisponibiliteEncadrant } from "@/types";

// Gabarit de tâches par séance donné texto dans le cahier des charges (spec section 80) : les
// premières séances suivent un ordre fixe, les suivantes portent sur les livrables, les
// dernières sur la rédaction/relecture.
const TACHES_INITIALES = ["Définition du sujet", "Cahier des charges", "UX/UI", "Conception"];
const TACHE_LIVRABLES = "Livrables";
const TACHE_REDACTION = "Rédaction / relecture";
const NB_SEANCES_FINALES_REDACTION = 2;

function tachePourSeance(index: number, total: number): string {
  if (index < TACHES_INITIALES.length) return TACHES_INITIALES[index];
  if (total - index <= NB_SEANCES_FINALES_REDACTION) return TACHE_REDACTION;
  return TACHE_LIVRABLES;
}

export interface SeanceProposee {
  dateHeure: string;
  tache: string;
}

/**
 * Génère un planning de séances (spec section 75) réparties régulièrement entre `dateDebut` et
 * `dateSoutenance`, calées sur les créneaux hebdomadaires déclarés par l'encadrant
 * (`disponibilites` - sans créneau déclaré, n'importe quel jour convient). Algorithme
 * déterministe (calcul de dates + gabarit de tâches ci-dessus), pas une IA simulée.
 */
export function genererPlanning(
  dateDebut: Date,
  dateSoutenance: Date,
  nombreSeances: number,
  disponibilites: DisponibiliteEncadrant[]
): SeanceProposee[] {
  if (nombreSeances <= 0 || dateSoutenance <= dateDebut) return [];

  const joursDisponibles = [...new Set(disponibilites.map((d) => d.jourSemaine))];
  const totalJours = Math.max(
    1,
    Math.round((dateSoutenance.getTime() - dateDebut.getTime()) / (1000 * 60 * 60 * 24))
  );
  const intervalleJours = Math.max(1, Math.round(totalJours / nombreSeances));

  const propositions: SeanceProposee[] = [];
  const curseur = new Date(dateDebut);
  let compte = 0;
  let garde = 0;

  while (compte < nombreSeances && garde < totalJours + 366) {
    garde += 1;
    const jourConvient = joursDisponibles.length === 0 || joursDisponibles.includes(curseur.getDay());
    if (jourConvient) {
      const dispo = disponibilites.find((d) => d.jourSemaine === curseur.getDay());
      const [heure, minute] = (dispo?.heureDebut ?? "18:00").split(":").map(Number);
      const dateSeance = new Date(curseur);
      dateSeance.setHours(heure ?? 18, minute ?? 0, 0, 0);
      propositions.push({
        dateHeure: dateSeance.toISOString(),
        tache: tachePourSeance(compte, nombreSeances),
      });
      compte += 1;
      curseur.setDate(curseur.getDate() + intervalleJours);
    } else {
      curseur.setDate(curseur.getDate() + 1);
    }
  }

  return propositions;
}
