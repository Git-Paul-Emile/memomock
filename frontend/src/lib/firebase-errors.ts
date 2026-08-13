import { FirebaseError } from "@/lib/firebase";

/**
 * Traduit les codes d'erreur Firebase Authentication (`error.code`, ex: "auth/wrong-password")
 * en messages français compréhensibles par l'utilisateur final. Firebase renvoie ses messages
 * par défaut en anglais et assez techniques ("Firebase: Error (auth/wrong-password).") -
 * inadaptés à une interface grand public.
 *
 * Référence des codes : https://firebase.google.com/docs/reference/js/auth#autherrorcodes
 */
const MESSAGES: Record<string, string> = {
  "auth/email-already-in-use": "Un compte existe déjà avec cette adresse e-mail.",
  "auth/invalid-email": "Adresse e-mail invalide.",
  "auth/weak-password": "Mot de passe trop faible (6 caractères minimum).",
  "auth/wrong-password": "Adresse e-mail ou mot de passe incorrect.",
  "auth/user-not-found": "Adresse e-mail ou mot de passe incorrect.",
  "auth/invalid-credential": "Adresse e-mail ou mot de passe incorrect.",
  "auth/too-many-requests": "Trop de tentatives. Merci de réessayer dans quelques minutes.",
  "auth/popup-closed-by-user": "La fenêtre Google a été fermée avant la fin de la connexion.",
  "auth/cancelled-popup-request": "Connexion Google annulée.",
  "auth/network-request-failed": "Problème de connexion réseau. Merci de réessayer.",
  "auth/expired-action-code": "Ce lien de réinitialisation a expiré. Demandez-en un nouveau.",
  "auth/invalid-action-code": "Ce lien de réinitialisation est invalide ou a déjà été utilisé.",
  "auth/user-disabled": "Ce compte a été désactivé.",
};

export function messageErreurFirebase(err: unknown, messageParDefaut: string): string {
  if (err instanceof FirebaseError && err.code) {
    return MESSAGES[err.code] ?? messageParDefaut;
  }
  if (err instanceof Error) return err.message || messageParDefaut;
  return messageParDefaut;
}
