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

import { auth } from "@/lib/firebase";
import { API_BASE_URL, ApiError } from "@/lib/api";
import { obtenirSessionId, oublierSessionId } from "@/lib/session-id";
import type { PublicUser, RoleInscription } from "@/types";

// Code applicatif renvoyé par le backend (POST /auth/sync, HTTP 428) quand un utilisateur
// n'a pas encore de profil applicatif. Le frontend l'utilise pour rediriger vers l'écran de
// complétion de profil (/completer-profil).
export const CODE_PROFIL_INCOMPLET = "PROFIL_INCOMPLET";

export interface InscriptionPayload {
  role: RoleInscription;
  nom: string;
  prenom: string;
  email: string;
  motDePasse: string;
  telephone: string; // Obligatoire à l'inscription (non vérifié - plus d'OTP WhatsApp).
  encadrantId?: string;
  filiere?: string;
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
  // roleSouhaite/telephone fournis uniquement depuis la page d'inscription. Sans eux (bouton
  // Google de la page de connexion), une inscription entièrement nouvelle lèvera une ApiError
  // de code CODE_PROFIL_INCOMPLET, que l'appelant traduit en redirection vers /completer-profil.
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
 * Sépare, dans le formulaire d'inscription, ce qui relève de l'IDENTITÉ (traité par l'API mock)
 * de ce qui relève du PROFIL MÉTIER (envoyé à notre API : rôle, nom, encadrant, établissement...).
 *
 * Deux raisons de ne jamais laisser fuiter les identifiants vers `POST /auth/sync` :
 *  1. Sécurité - un mot de passe en clair n'a aucune raison de transiter vers notre backend.
 *  2. Contrat d'API - le schéma de la route est `.strict()` côté backend : toute clé inconnue déclenche un 400.
 */
function extraireProfilMetier(
  payload: Partial<InscriptionPayload> = {}
): Omit<Partial<InscriptionPayload>, "email" | "motDePasse"> {
  const { email, motDePasse, ...profilMetier } = payload;
  return profilMetier;
}

/**
 * Récupère le profil utilisateur depuis json-server.
 * Cherche l'utilisateur par email dans la collection `users`.
 * Mode mock : aucune création/synchronisation backend.
 */
async function synchroniserProfil(
  firebaseUser: any,
  payload?: Partial<InscriptionPayload>
): Promise<PublicUser> {
  // Récupérer l'utilisateur depuis json-server par email
  const email = firebaseUser.email;
  const res = await fetch(`${API_BASE_URL}/users?email=${encodeURIComponent(email)}`, {
    headers: { "Content-Type": "application/json" },
  });
  
  if (!res.ok) {
    throw new ApiError(
      "Utilisateur non trouvé.",
      res.status
    );
  }
  
  const users = (await res.json()) as any[];
  if (users.length === 0) {
    throw new ApiError(
      "Utilisateur non trouvé.",
      404
    );
  }
  
  const user = users[0];
  return {
    id: user.id,
    email: user.email,
    nom: user.nom,
    prenom: user.prenom,
    role: user.role,
    createdAt: user.createdAt,
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
    const identifiants = await createUserWithEmailAndPassword(
      auth,
      payload.email,
      payload.motDePasse
    );
    await updateProfile(identifiants.user, { displayName: `${payload.prenom} ${payload.nom}` });
    const profil = await synchroniserProfil(identifiants.user, payload);
    setUser(profil);
    return profil;
  }, []);

  

  /**
   * Complète le profil d'un utilisateur déjà authentifié avec les informations obligatoires
   * manquantes (rôle, téléphone, encadrant...), puis crée le profil applicatif via /auth/sync.
   */
  const completerProfil = React.useCallback(async (payload: CompletionPayload) => {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
      throw new ApiError("Session expirée. Merci de vous reconnecter.", 401);
    }
    const profil = await synchroniserProfil(firebaseUser, payload);
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
