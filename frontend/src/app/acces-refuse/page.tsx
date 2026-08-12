"use client";

import Link from "next/link";
import { ShieldAlert } from "lucide-react";

import { useAuth } from "@/context/auth-context";
import { espaceParDefaut } from "@/components/layout/route-guard";
import { Button } from "@/components/ui/button";

// Écran H22 (spec H21-H23, pages d'erreur dédiées) : affiché quand un utilisateur connecté
// tente d'accéder à un espace réservé à un autre rôle (voir components/layout/route-guard.tsx),
// plutôt qu'une redirection silencieuse - l'utilisateur voit POURQUOI il ne peut pas continuer.
export default function AccesRefusePage() {
  const { user } = useAuth();
  const destination = user ? espaceParDefaut(user.role) : "/login";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-destructive/10">
        <ShieldAlert className="size-8 text-destructive" />
      </div>
      <div>
        <p className="text-sm font-medium tracking-widest text-muted-foreground">ERREUR 403</p>
        <h1 className="text-2xl font-semibold tracking-tight">Accès refusé</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Vous n&apos;avez pas les droits nécessaires pour accéder à cette page.
        </p>
      </div>
      <Button asChild>
        <Link href={destination}>{user ? "Retourner à mon espace" : "Se connecter"}</Link>
      </Button>
    </div>
  );
}
