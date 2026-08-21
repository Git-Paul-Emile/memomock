"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/context/auth-context";
import type { Role } from "@/types";

/**
 * Garde de route côté client : redirige vers /login si non authentifié, ou vers l'espace
 * approprié si le rôle de l'utilisateur ne correspond pas à l'espace visité.
 *
 * Remarque pédagogique : dans une architecture avec rendu serveur strict, cette vérification
 * serait dupliquée (défense en profondeur) dans un `middleware.ts` lisant le jeton dans
 * un cookie httpOnly, pour empêcher tout accès même avant l'hydratation React. Ici,
 * l'auth gère la session côté client (localStorage, voir `src/context/auth-context.tsx`), non
 * lisible par un middleware serveur sans appel réseau supplémentaire - la garde est donc
 * volontairement posée au niveau du layout client de chaque espace. La sécurité réelle des
 * données, elle, ne dépend jamais de cette garde côté UI : chaque requête API est de toute
 * façon revérifiée côté serveur (jeton + RBAC, voir backend/src/middleware/auth.js).
 */
export function RouteGuard({ allow, children }: { allow: Role[]; children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!allow.includes(user.role)) {
      // Écran H22 (spec H21-H23) : montre explicitement pourquoi l'accès est refusé, plutôt
      // qu'une redirection silencieuse vers l'espace de l'utilisateur.
      router.replace("/acces-refuse");
    }
  }, [user, isLoading, allow, router]);

  if (isLoading || !user || !allow.includes(user.role)) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-muted-foreground">
        Chargement de votre espace…
      </div>
    );
  }

  return <>{children}</>;
}

export function espaceParDefaut(role: Role): string {
  switch (role) {
    case "etudiant":
      return "/etudiant/dashboard";
    case "encadrant":
      return "/encadrant/dashboard";
    case "admin":
      return "/admin/supervision";
    case "admin_etablissement":
      return "/etablissement/dashboard";
  }
}

/**
 * Écran d'onboarding multi-étapes (spec C3/C4/C5) à parcourir juste après la toute première
 * création de compte - voir /register et /completer-profil, qui y redirigent au lieu du
 * tableau de bord uniquement lors de cette création initiale.
 */
export function lienOnboarding(role: Role): string | null {
  switch (role) {
    case "etudiant":
      return "/onboarding/etudiant";
    case "encadrant":
      return "/onboarding/encadrant";
    // Aucun onboarding pour un administrateur : ce rôle ne s'obtient plus par inscription depuis
    // le retrait de la notion d'établissement (voir backend auth.service), il est attribué par
    // un administrateur déjà en place ou par le seed. Il n'y a donc pas de « première fois ».
    case "admin":
      return null;
    // La création de l'établissement se fait directement dans le formulaire d'inscription (voir
    // /register) - pas d'étape d'onboarding séparée.
    case "admin_etablissement":
      return null;
  }
}
