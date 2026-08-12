"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GraduationCap, MoveLeft } from "lucide-react";

import { useAuth } from "@/context/auth-context";
import { espaceParDefaut } from "@/components/layout/route-guard";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/constants";

/**
 * Page 404 personnalisée (App Router : convention de fichier `not-found.tsx`, servie
 * automatiquement pour toute route qui ne correspond à aucun segment défini, ou appelée
 * explicitement via `notFound()` dans un composant serveur).
 */
export default function NotFound() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // Redirige vers l'espace de l'utilisateur s'il est déjà connecté, sinon vers l'accueil public
  // - évite de renvoyer un étudiant connecté vers une page marketing qu'il n'a jamais visitée.
  const destinationPrincipale = !isLoading && user ? espaceParDefaut(user.role) : "/";
  const libellePrincipal = !isLoading && user ? "Retour à mon espace" : `Accueil ${APP_NAME}`;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-muted/30 px-4 py-10 text-center">
      <Link href="/" className="flex items-center justify-center gap-2 text-lg font-semibold">
        <GraduationCap className="size-6 text-primary" />
        {APP_NAME}
      </Link>

      <Image
        src="/404.svg"
        alt="Illustration d'une page introuvable"
        width={860}
        height={571}
        priority
        className="w-full max-w-md"
      />

      <div className="space-y-2">
        <p className="text-sm font-medium tracking-widest text-muted-foreground">ERREUR 404</p>
        <h1 className="text-2xl font-semibold tracking-tight">Page introuvable</h1>
      </div>

      <div className="flex w-full max-w-sm flex-col gap-2 sm:flex-row">
        <Button variant="outline" className="w-full" onClick={() => router.back()}>
          <MoveLeft className="size-4" />
          Page précédente
        </Button>
        <Button asChild className="w-full">
          <Link href={destinationPrincipale}>{libellePrincipal}</Link>
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Besoin d&apos;aide ?{" "}
        <Link href="/aide" className="font-medium text-primary hover:underline">
          Consultez la FAQ
        </Link>
      </p>
    </div>
  );
}
