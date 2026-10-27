import { Check, Smartphone } from "lucide-react";

import { PublicHeader } from "@/components/marketing/public-header";
import { PublicFooter } from "@/components/marketing/public-footer";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formaterMontant } from "@/lib/afrique";

// Offres indicatives, alignées sur le catalogue de démonstration (data.json > forfaits) : le
// modèle économique n'est pas arrêté (spec v2, partie X). Montants en franc CFA (XOF/XAF à
// parité) ; les autres devises de la zone sont affichées à l'abonnement.
const OFFRES = [
  {
    nom: "Étudiant",
    prix: 0,
    description: "Gratuit quand votre encadreur ou votre établissement utilise la plateforme.",
    fonctionnalites: [
      "Analyse IA selon les exigences de votre encadreur",
      "Tuteur IA conversationnel",
      "Rédaction dans la plateforme ou import Word/PDF",
      "Export Word/PDF",
    ],
  },
  {
    nom: "Encadreur indépendant",
    prix: 5000,
    description: "Pour suivre vos étudiants hors établissement.",
    fonctionnalites: [
      "Profils méthodologiques illimités",
      "Extraction des règles de vos guides par l'IA",
      "Règles apprises de vos corrections",
      "Jusqu'à 30 étudiants",
    ],
  },
  {
    nom: "Établissement",
    prix: 150000,
    description: "Pour une école ou une UFR gérant plusieurs classes.",
    fonctionnalites: [
      "Filières, promotions, classes et groupes",
      "Normes de l'établissement imposables",
      "Suivi des apprenants et alertes d'inactivité",
      "Jusqu'à 300 étudiants et 30 encadreurs",
    ],
  },
  {
    nom: "Établissement Pro",
    prix: 350000,
    description: "Pour une université multi-filières.",
    fonctionnalites: [
      "Étudiants et encadreurs illimités",
      "Mise en relation étudiant / encadreur",
      "Statistiques avancées",
      "Support dédié",
    ],
  },
];

export default function TarificationPage() {
  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-16">
        <div className="mb-10 text-center">
          <h1 className="mb-2 text-3xl font-bold tracking-tight">Tarification</h1>
          <p className="text-muted-foreground">
            Pensée pour les universités et écoles d&apos;Afrique de l&apos;Ouest et centrale.
          </p>
          <Badge variant="outline" className="mt-3">
            Offres indicatives - projet académique, aucun paiement réel
          </Badge>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {OFFRES.map((offre) => (
            <Card key={offre.nom}>
              <CardHeader>
                <CardTitle className="text-base">{offre.nom}</CardTitle>
                <p className="text-xl font-semibold">
                  {offre.prix === 0 ? "Gratuit" : formaterMontant(offre.prix, "XOF")}
                  {offre.prix > 0 && <span className="text-sm font-normal text-muted-foreground"> / mois</span>}
                </p>
                <CardDescription>{offre.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {offre.fonctionnalites.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                      {f}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="mt-8 flex items-center justify-center gap-2 text-center text-sm text-muted-foreground">
          <Smartphone className="size-4" />
          Paiement par mobile money (Orange Money, Wave, MTN MoMo, Moov Money, Airtel Money), carte
          bancaire ou virement, selon le pays.
        </p>
      </main>
      <PublicFooter />
    </div>
  );
}
