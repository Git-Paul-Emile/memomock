import Link from "next/link";
import { GraduationCap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/constants";

const LIENS = [
  { href: "/comment-ca-marche", label: "Comment ça marche" },
  { href: "/pour-etudiants", label: "Étudiants" },
  { href: "/pour-encadreurs", label: "Encadreurs" },
  { href: "/tarification", label: "Tarification" },
  { href: "/faq", label: "FAQ" },
];

/** En-tête commun aux pages publiques (spec espace A) : navigation + CTA connexion/inscription. */
export function PublicHeader() {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b px-6 py-4">
      <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
        <GraduationCap className="size-6 text-primary" />
        {APP_NAME}
      </Link>
      <nav className="hidden flex-wrap items-center gap-5 text-sm text-muted-foreground lg:flex">
        {LIENS.map((lien) => (
          <Link key={lien.href} href={lien.href} className="hover:text-foreground">
            {lien.label}
          </Link>
        ))}
      </nav>
      <div className="flex items-center gap-2">
        <Button variant="ghost" asChild>
          <Link href="/login">Se connecter</Link>
        </Button>
        <Button asChild>
          <Link href="/register">Créer un compte</Link>
        </Button>
      </div>
    </header>
  );
}
