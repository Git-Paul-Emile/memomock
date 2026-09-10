import Link from "next/link";

import { PublicHeader } from "@/components/marketing/public-header";
import { PublicFooter } from "@/components/marketing/public-footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_NAME } from "@/lib/constants";

// Écran A12 (spec ESPACE PUBLIC) : distinct de /confidentialite (RGPD général), centré
// spécifiquement sur la protection du contenu académique (mémoires, échanges avec le tuteur IA,
// corrections de l'encadrant) - "particulièrement important pour les documents académiques".
export default function ProtectionDonneesPage() {
  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
        <Card>
          <CardHeader>
            <CardTitle>Protection des données académiques</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-sm leading-relaxed text-muted-foreground">
            <section>
              <h2 className="mb-1 font-medium text-foreground">Un contenu par nature sensible</h2>
              <p>
                Un mémoire ou une thèse en cours de rédaction contient souvent des données
                personnelles (enquêtes, entretiens, terrains de recherche) et représente un travail
                académique non publié. {APP_NAME} traite ce contenu avec le même niveau
                d&apos;exigence qu&apos;une donnée personnelle sensible, au-delà du minimum RGPD.
              </p>
            </section>

            <section>
              <h2 className="mb-1 font-medium text-foreground">Qui peut voir votre document</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>Vous-même, en tant qu&apos;auteur.</li>
                <li>
                  Votre encadrant assigné, uniquement une fois le document transmis (jamais avant,
                  jamais un autre encadrant que le vôtre).
                </li>
                <li>
                  L&apos;administrateur de votre établissement, à des fins de supervision académique
                  et de traçabilité (jamais un administrateur d&apos;un autre établissement).
                </li>
              </ul>
              <p className="mt-2">
                Aucun autre étudiant, aucun autre encadrant, ne peut jamais consulter votre
                document.
              </p>
            </section>

            <section>
              <h2 className="mb-1 font-medium text-foreground">Traitement par l&apos;IA</h2>
              <p>
                L&apos;analyse lit le texte de votre document pour produire un score de conformité
                et des suggestions. Dans cette version de démonstration, cette analyse est simulée
                localement : aucun texte n&apos;est envoyé à un modèle tiers.
              </p>
            </section>

            <section>
              <h2 className="mb-1 font-medium text-foreground">Stockage</h2>
              <p>
                Dans cette version de démonstration, les documents et leurs métadonnées sont
                conservés dans un jeu de données local (servi par json-server) et ne sont transmis à
                aucun hébergeur externe.
              </p>
            </section>

            <section>
              <h2 className="mb-1 font-medium text-foreground">Conservation après la scolarité</h2>
              <p>
                À la suppression d&apos;un compte, les données identifiantes sont anonymisées ; les
                documents eux-mêmes peuvent être conservés à des fins de traçabilité académique par
                votre établissement, sans plus être rattachés à votre identité - voir notre{" "}
                <Link href="/confidentialite" className="text-primary hover:underline">
                  politique de confidentialité
                </Link>{" "}
                pour le détail de vos droits.
              </p>
            </section>
          </CardContent>
        </Card>
      </main>
      <PublicFooter />
    </div>
  );
}
