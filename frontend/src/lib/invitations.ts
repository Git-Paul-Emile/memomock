/**
 * Utilisation d'un code de rattachement, quelle que soit son origine (spec v2, § 11) :
 *  - code d'invitation d'un encadreur (`invitations`) → l'étudiant est rattaché à l'encadreur ;
 *  - code de classe (`classes.code`) → l'étudiant rejoint la classe et ses encadreurs ;
 *  - code d'invitation d'établissement (`invitations-etablissement`) → selon le rôle invité :
 *    étudiant (classe + établissement), professeur (établissement, et classe si précisée) ou
 *    administrateur d'établissement (désigné par le super-admin).
 *
 * Toute la logique de rattachement vit ici pour être partagée par l'inscription et l'écran
 * « Rejoindre un encadreur ».
 */

import { apiGet, apiList, apiPatch, apiPost } from "./api";
import { rafraichirCharge } from "./annuaire";
import type {
  AffectationEncadrant,
  Classe,
  Etablissement,
  Invitation,
  InvitationEtablissement,
  PublicUser,
} from "@/types";

export class CodeInvalideError extends Error {}

export interface ResultatRattachement {
  utilisateur: PublicUser;
  message: string;
}

export function normaliserCode(code: string): string {
  return code.trim().toUpperCase();
}

async function rattacherEtudiantClasse(user: PublicUser, classe: Classe): Promise<PublicUser> {
  const misAJour = await apiPatch<PublicUser>("users", user.id, {
    classeId: classe.id,
    etablissementId: classe.etablissementId,
    encadrantId: classe.encadrantIds[0] ?? user.encadrantId ?? null,
  });
  if (misAJour.encadrantId) await rafraichirCharge(misAJour.encadrantId);
  return misAJour;
}

async function utiliserInvitationEtablissement(
  user: PublicUser,
  invitation: InvitationEtablissement
): Promise<ResultatRattachement> {
  if (invitation.role !== user.role) {
    throw new CodeInvalideError(
      "Ce code est destiné à un autre type de compte (étudiant, professeur ou administrateur)."
    );
  }
  const etablissement = await apiGet<Etablissement>("etablissements", invitation.etablissementId);
  let utilisateur: PublicUser;

  if (invitation.role === "etudiant") {
    const classe = invitation.classeId ? await apiGet<Classe>("classes", invitation.classeId).catch(() => null) : null;
    utilisateur = classe
      ? await rattacherEtudiantClasse(user, classe)
      : await apiPatch<PublicUser>("users", user.id, { etablissementId: etablissement.id });
  } else if (invitation.role === "encadrant") {
    utilisateur = await apiPatch<PublicUser>("users", user.id, { etablissementId: etablissement.id });
    if (invitation.classeId) {
      const classe = await apiGet<Classe>("classes", invitation.classeId).catch(() => null);
      if (classe && !classe.encadrantIds.includes(user.id)) {
        await apiPatch("classes", classe.id, { encadrantIds: [...classe.encadrantIds, user.id] });
        await apiPost<AffectationEncadrant>("affectations-encadrant", {
          etablissementId: etablissement.id,
          encadrantId: user.id,
          promotionId: classe.promotionId ?? null,
          filiereId: classe.filiereId,
          niveau: classe.niveau,
          classeId: classe.id,
          groupeId: null,
          createdAt: new Date().toISOString(),
        });
      }
    }
  } else {
    // Administrateur désigné par le super-admin pour un établissement existant.
    await apiPatch("etablissements", etablissement.id, { adminId: user.id });
    utilisateur = await apiPatch<PublicUser>("users", user.id, { etablissementId: etablissement.id });
  }

  await apiPatch("invitations-etablissement", invitation.id, { statut: "acceptee" });
  await apiPost("notifications", {
    userId: etablissement.adminId || user.id,
    titre: "Invitation acceptée",
    message: `${user.prenom} ${user.nom} a rejoint « ${etablissement.nom} ».`,
    type: "systeme",
    lu: false,
    date: new Date().toISOString(),
  }).catch(() => {});
  return { utilisateur, message: `Vous avez rejoint « ${etablissement.nom} ».` };
}

/** Applique un code au compte connecté. Lève {@link CodeInvalideError} si le code est inconnu. */
export async function utiliserCode(user: PublicUser, codeSaisi: string): Promise<ResultatRattachement> {
  const code = normaliserCode(codeSaisi);
  if (code.length < 4) throw new CodeInvalideError("Code trop court.");

  const [invitationsEtab, invitations, classes] = await Promise.all([
    apiList<InvitationEtablissement>("invitations-etablissement", { filtres: { code }, limite: 1 }),
    apiList<Invitation>("invitations", { filtres: { code }, limite: 1 }),
    apiList<Classe>("classes", { filtres: { code }, limite: 1 }),
  ]);

  const invitationEtab = invitationsEtab.data[0];
  if (invitationEtab) {
    if (invitationEtab.statut !== "en_attente") throw new CodeInvalideError("Ce code a déjà été utilisé ou a expiré.");
    return utiliserInvitationEtablissement(user, invitationEtab);
  }

  const invitation = invitations.data[0];
  if (invitation) {
    if (invitation.statut === "expiree") throw new CodeInvalideError("Ce code a expiré.");
    if (user.role !== "etudiant") throw new CodeInvalideError("Ce code est réservé aux étudiants.");
    const utilisateur = await apiPatch<PublicUser>("users", user.id, { encadrantId: invitation.encadrantId });
    // Code personnel (envoyé à une adresse) : à usage unique. Code partagé (sans adresse) : réutilisable.
    if (invitation.email) await apiPatch("invitations", invitation.id, { statut: "acceptee" });
    await rafraichirCharge(invitation.encadrantId);
    return { utilisateur, message: "Vous êtes rattaché·e à votre encadreur." };
  }

  const classe = classes.data[0];
  if (classe) {
    if (user.role !== "etudiant") throw new CodeInvalideError("Ce code de classe est réservé aux étudiants.");
    return { utilisateur: await rattacherEtudiantClasse(user, classe), message: `Vous avez rejoint la classe « ${classe.nom} ».` };
  }

  throw new CodeInvalideError("Code inconnu. Vérifiez-le auprès de votre encadreur ou de votre établissement.");
}
