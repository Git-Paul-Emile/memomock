/**
 * Alertes automatiques de suivi (spec v2, § 39) : échéances proches, retards (livrables,
 * chapitres, soutenance) et séances non effectuées.
 *
 * En production, une tâche planifiée côté serveur les produirait chaque nuit et les relaierait
 * par SMS/WhatsApp/e-mail. Sans serveur en mode mock, le client les calcule à l'ouverture de
 * l'application, au plus une fois par jour et par utilisateur, et n'émet jamais deux fois la
 * même alerte.
 */

import { apiList, apiPost } from "./api";
import { resoudreChapitres } from "./canevas";
import { resoudreLivrables } from "./livrables";
import { joursRestants, retardsDocument, retardsSeances } from "./retards";
import type {
  ChapitreCanevas,
  CritereChapitre,
  DocumentSubmission,
  Livrable,
  Notification,
  ProfilEncadrant,
  PublicUser,
  Seance,
  ValidationChapitre,
} from "@/types";

const DELAI_RAPPEL_JOURS = 3;
const STATUTS_TERMINES = new Set(["valide", "refuse"]);

interface Alerte {
  titre: string;
  message: string;
  lienDocumentId?: string;
}

async function alertesEtudiant(user: PublicUser): Promise<Alerte[]> {
  const [documents, seances] = await Promise.all([
    apiList<DocumentSubmission>("documents", { filtres: { etudiantId: user.id }, limite: 50 }),
    apiList<Seance>("seances", { filtres: { etudiantId: user.id }, limite: 200 }),
  ]);
  const alertes: Alerte[] = [];

  for (const document of documents.data.filter((d) => !STATUTS_TERMINES.has(d.statut))) {
    const profil = document.profilEncadrantId
      ? (await apiList<ProfilEncadrant>("profils-encadrant", { filtres: { id: document.profilEncadrantId } })).data[0]
      : undefined;
    const [livrables, chapitres, criteres, validations] = await Promise.all([
      apiList<Livrable>("livrables", { filtres: { documentId: document.id }, limite: 100 }),
      profil?.canevasId
        ? apiList<ChapitreCanevas>("chapitres-canevas", { filtres: { canevasId: profil.canevasId }, limite: 200 })
        : null,
      profil?.canevasId ? apiList<CritereChapitre>("criteres-chapitre", { limite: 2000 }) : null,
      apiList<ValidationChapitre>("validations-chapitre", { filtres: { documentId: document.id }, limite: 200 }),
    ]);
    const livrablesAffiches = resoudreLivrables(profil?.livrablesAttendus ?? [], livrables.data);
    const chapitresAffiches = resoudreChapitres(chapitres?.data ?? [], criteres?.data ?? [], validations.data);

    for (const r of retardsDocument(document, livrablesAffiches, chapitresAffiches)) {
      alertes.push({
        titre: "Échéance dépassée",
        message: `${r.libelle} (« ${document.titre} ») : échéance du ${new Date(r.dateEcheance).toLocaleDateString("fr-FR")} dépassée.`,
        lienDocumentId: document.id,
      });
    }
    // Rappels J-3 sur les échéances à venir (livrables, chapitres, soutenance).
    const aVenir = [
      ...livrablesAffiches.filter((l) => l.statut !== "valide").map((l) => ({ libelle: l.nom, date: l.dateEcheance })),
      ...chapitresAffiches.filter((c) => c.statut !== "valide").map((c) => ({ libelle: c.titre, date: c.dateEcheance })),
      { libelle: "Soutenance", date: document.dateSoutenancePrevue ?? null },
    ];
    for (const e of aVenir) {
      if (!e.date) continue;
      const jours = joursRestants(e.date);
      if (jours >= 0 && jours <= DELAI_RAPPEL_JOURS) {
        alertes.push({
          titre: "Échéance proche",
          message: `${e.libelle} (« ${document.titre} ») : échéance ${jours === 0 ? "aujourd'hui" : `dans ${jours} jour(s)`}.`,
          lienDocumentId: document.id,
        });
      }
    }
  }

  for (const s of seances.data) {
    const jours = joursRestants(s.dateHeure);
    if (s.statut === "planifiee" && jours >= 0 && jours <= 1) {
      alertes.push({
        titre: "Séance de suivi à venir",
        message: `${s.titre}${s.tache ? ` - ${s.tache}` : ""} : ${new Date(s.dateHeure).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}.`,
      });
    }
  }
  return alertes;
}

async function alertesEncadreur(user: PublicUser): Promise<Alerte[]> {
  const seances = await apiList<Seance>("seances", { filtres: { encadrantId: user.id }, limite: 500 });
  return retardsSeances(seances.data).map((r) => ({
    titre: "Séance non effectuée",
    message: `${r.libelle} du ${new Date(r.dateEcheance).toLocaleDateString("fr-FR")} est toujours « planifiée » : marquez-la effectuée ou annulée.`,
  }));
}

/** Calcule et enregistre les alertes du jour. Renvoie le nombre d'alertes créées. */
export async function genererAlertesAutomatiques(user: PublicUser): Promise<number> {
  if (user.role !== "etudiant" && user.role !== "encadrant") return 0;
  const cle = `memoassistant-alertes-${user.id}-${new Date().toISOString().slice(0, 10)}`;
  try {
    if (localStorage.getItem(cle)) return 0;
    localStorage.setItem(cle, "1");
  } catch {
    return 0;
  }

  const alertes = user.role === "etudiant" ? await alertesEtudiant(user) : await alertesEncadreur(user);
  if (alertes.length === 0) return 0;

  const existantes = await apiList<Notification>("notifications", {
    filtres: { userId: user.id, type: "retard" },
    limite: 1000,
  });
  const dejaEmis = new Set(existantes.data.map((n) => n.message));
  const nouvelles = alertes.filter((a) => !dejaEmis.has(a.message));
  const maintenant = new Date().toISOString();
  await Promise.all(
    nouvelles.map((a) =>
      apiPost("notifications", {
        userId: user.id,
        titre: a.titre,
        message: a.message,
        type: "retard",
        lu: false,
        date: maintenant,
        ...(a.lienDocumentId ? { lienDocumentId: a.lienDocumentId } : {}),
      })
    )
  );
  return nouvelles.length;
}
