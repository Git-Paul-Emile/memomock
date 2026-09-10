"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  FirebaseError,
  EmailAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as signOutFirebase,
  updatePassword,
  updateProfile,
} from "@/lib/firebase";

import { auth, type MockUser } from "@/lib/firebase";
import { API_BASE_URL, ApiError } from "@/lib/api";
import { oublierSessionId } from "@/lib/session-id";
import type { PublicUser, RoleInscription } from "@/types";

export interface InscriptionPayload {
  role: RoleInscription;
  nom: string;
  prenom: string;
  email: string;
  motDePasse: string;
  telephone: string; // Obligatoire à l'inscription, non vérifié (pas de code OTP).
  encadrantId?: string;
  filiere?: string;
  // Renseigné uniquement pour role === "admin_etablissement" : sert à créer l'établissement juste
  // après la création du compte (voir /register#onSubmit), pas persisté tel quel sur le User.
  etablissementNom?: string;
}

// Informations collectées à l'écran de complétion de profil (inscription Google spontanée) :
// l'e-mail et l'identité viennent déjà du compte Google, seul le reste est demandé.
export interface CompletionPayload {
  role: RoleInscription;
  telephone: string;
  encadrantId?: string;
  filiere?: string;
}

interface AuthContextValue {
  user: PublicUser | null;
  isLoading: boolean;
  login: (email: string, motDePasse: string) => Promise<PublicUser>;
  register: (payload: InscriptionPayload) => Promise<PublicUser>;
  // Écran /completer-profil : renseigne les informations obligatoires manquantes (rôle,
  // téléphone, encadrant...) d'un compte déjà authentifié mais au profil incomplet.
  completerProfil: (payload: CompletionPayload) => Promise<PublicUser>;
  forgotPassword: (email: string) => Promise<void>;
  // Écran H6 : ré-authentifie avec le mot de passe actuel puis applique le nouveau.
  changerMotDePasse: (motDePasseActuel: string, nouveauMotDePasse: string) => Promise<void>;
  logout: () => Promise<void>;
  // Met à jour le profil en mémoire sans repasser par l'API : utile après un appel API qui
  // renvoie déjà le profil à jour (upload d'avatar, modification des paramètres...).
  definirUtilisateur: (utilisateur: PublicUser) => void;
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

/**
 * Récupère le profil utilisateur depuis l'API mock (recherche par e-mail dans `users`).
 */
async function synchroniserProfil(firebaseUser: MockUser): Promise<PublicUser> {
  // Récupérer l'utilisateur depuis json-server par email
  const email = firebaseUser.email;
  const res = await fetch(`${API_BASE_URL}/users?email=${encodeURIComponent(email)}`, {
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    throw new ApiError("Utilisateur non trouvé.", res.status);
  }

  const users = (await res.json()) as PublicUser[];
  if (users.length === 0) {
    throw new ApiError("Utilisateur non trouvé.", 404);
  }

  const user = users[0];
  return {
    id: user.id,
    email: user.email,
    nom: user.nom,
    prenom: user.prenom,
    role: user.role,
    createdAt: user.createdAt,
    avatarUrl: user.avatarUrl,
    encadrantId: user.encadrantId,
    filiere: user.filiere,
    telephone: user.telephone,
    canalNotificationPrefere: user.canalNotificationPrefere,
    actif: user.actif,
    etablissementId: user.etablissementId ?? null,
    classeId: user.classeId ?? null,
    groupeId: user.groupeId ?? null,
  };
}

/**
 * Fournisseur d'authentification mock, basé sur json-server.
 * `onAuthStateChanged` est la seule source de vérité sur "qui est connecté".
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<PublicUser | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const router = useRouter();

  React.useEffect(() => {
    const desabonner = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setIsLoading(false);
        return;
      }
      try {
        const profil = await synchroniserProfil(firebaseUser);
        setUser(profil);
      } catch {
        // Session valide mais profil applicatif absent/incomplet (ex : inscription
        // interrompue avant complétion, ou session restaurée sans repasser par un
        // formulaire) : on ne bloque pas l'affichage, l'utilisateur reste "non connecté" côté
        // MemoAI jusqu'à une vraie connexion/inscription (ou complétion de profil).
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    });
    return desabonner;
  }, []);

  const login = React.useCallback(async (email: string, motDePasse: string) => {
    const identifiants = await signInWithEmailAndPassword(auth, email, motDePasse);
    const profil = await synchroniserProfil(identifiants.user);
    setUser(profil);
    return profil;
  }, []);

  const register = React.useCallback(async (payload: InscriptionPayload) => {
    const {
      email,
      motDePasse,
      etablissementNom: _etablissementNom,
      ...donneesSupplementaires
    } = payload;
    const identifiants = await createUserWithEmailAndPassword(
      auth,
      email,
      motDePasse,
      donneesSupplementaires
    );
    await updateProfile(identifiants.user, { displayName: `${payload.prenom} ${payload.nom}` });
    const profil = await synchroniserProfil(identifiants.user);
    setUser(profil);
    return profil;
  }, []);

  /**
   * Complète le profil d'un utilisateur déjà authentifié avec les informations obligatoires
   * manquantes (rôle, téléphone, encadrant...). En mode mock, se contente de recharger le
   * profil : `_payload` serait envoyé à l'API dans une implémentation réelle.
   */
  const completerProfil = React.useCallback(async (_payload: CompletionPayload) => {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
      throw new ApiError("Session expirée. Merci de vous reconnecter.", 401);
    }
    const profil = await synchroniserProfil(firebaseUser);
    setUser(profil);
    return profil;
  }, []);

  /**
   * Envoie un e-mail de réinitialisation de mot de passe. En mode mock, met à jour le mot de
   * passe directement et renvoie un succès.
   */
  const forgotPassword = React.useCallback(async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email, {
        url: `${window.location.origin}/reinitialiser-mot-de-passe`,
        handleCodeInApp: true,
      });
    } catch (err) {
      if (err instanceof FirebaseError && err.code === "auth/user-not-found") return;
      throw err;
    }
  }, []);

  /**
   * Changement de mot de passe : vérifie le mot de passe actuel puis applique le nouveau.
   */
  const changerMotDePasse = React.useCallback(
    async (motDePasseActuel: string, nouveauMotDePasse: string) => {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser?.email) {
        throw new ApiError("Session expirée. Merci de vous reconnecter.", 401);
      }
      const identifiant = EmailAuthProvider.credential(firebaseUser.email, motDePasseActuel);
      await reauthenticateWithCredential(firebaseUser, identifiant);
      await updatePassword(firebaseUser, nouveauMotDePasse);
    },
    []
  );

  const logout = React.useCallback(async () => {
    await signOutFirebase(auth);
    oublierSessionId();
    setUser(null);
    router.push("/login");
  }, [router]);

  const definirUtilisateur = React.useCallback((utilisateur: PublicUser) => {
    setUser(utilisateur);
  }, []);

  const value = React.useMemo(
    () => ({
      user,
      isLoading,
      login,
      register,
      completerProfil,
      forgotPassword,
      changerMotDePasse,
      logout,
      definirUtilisateur,
    }),
    [
      user,
      isLoading,
      login,
      register,
      completerProfil,
      forgotPassword,
      changerMotDePasse,
      logout,
      definirUtilisateur,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé à l'intérieur de <AuthProvider>");
  return ctx;
}
