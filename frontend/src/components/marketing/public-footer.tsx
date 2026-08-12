import Link from "next/link";

const LIENS = [
  { href: "/a-propos", label: "À propos" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
  { href: "/conditions-utilisation", label: "Conditions d'utilisation" },
  { href: "/confidentialite", label: "Politique de confidentialité" },
  { href: "/protection-donnees", label: "Protection des données" },
  { href: "/statut", label: "Statut du service" },
];

/** Pied de page commun aux pages publiques. */
export function PublicFooter() {
  return (
    <footer className="border-t px-6 py-6">
      <div className="mx-auto flex max-w-5xl flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
        {LIENS.map((lien) => (
          <Link key={lien.href} href={lien.href} className="hover:text-foreground hover:underline">
            {lien.label}
          </Link>
        ))}
      </div>
    </footer>
  );
}
