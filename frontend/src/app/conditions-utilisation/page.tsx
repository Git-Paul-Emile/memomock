import { PublicHeader } from "@/components/marketing/public-header";
import { PublicFooter } from "@/components/marketing/public-footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_NAME } from "@/lib/constants";

// Page publique et statique, dans le même esprit que /confidentialite : couvre les points
// structurants attendus de conditions d'utilisation, sans se substituer à une relecture
// juridique dédiée avant une mise en production réelle.
export default function ConditionsUtilisationPage() {
  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
        <Card>
          <CardHeader>
            <CardTitle>Conditions d&apos;utilisation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-sm leading-relaxed text-muted-foreground">
            <section>
              <h2 className="mb-1 font-medium text-foreground">1. Objet</h2>
              <p>
                {APP_NAME} est une plateforme d&apos;accompagnement à la rédaction de mémoires
                académiques (Licence, Master, Doctorat), assistée par intelligence artificielle.
                Elle met en relation directement un étudiant et son encadreur.
              </p>
            </section>

            <section>
              <h2 className="mb-1 font-medium text-foreground">2. Rôle de l&apos;IA</h2>
              <p>
                L&apos;IA analyse la forme et le fond des documents soumis et fournit un score de
                conformité estimatif par rapport aux exigences configurées par l&apos;encadreur. Ce
                score ne constitue jamais une validation scientifique définitive ni une garantie
                académique. L&apos;IA ne remplace pas l&apos;encadreur, n&apos;attribue jamais seule
                de note académique officielle et ne valide jamais définitivement un mémoire ou une
                thèse : ces décisions restent sous la responsabilité exclusive de l&apos;encadreur
                ou du jury.
              </p>
            </section>

            <section>
              <h2 className="mb-1 font-medium text-foreground">3. Comptes utilisateurs</h2>
              <p>
                Chaque utilisateur est responsable de la confidentialité de ses identifiants et de
                l&apos;exactitude des informations fournies à l&apos;inscription. Un administrateur
                d&apos;établissement peut désactiver un compte en cas d&apos;usage abusif.
              </p>
            </section>

            <section>
              <h2 className="mb-1 font-medium text-foreground">4. Propriété des contenus</h2>
              <p>
                Les documents soumis restent la propriété de leur auteur. Les guides, modèles et
                référentiels importés par un encadreur ne sont utilisés que pour orienter
                l&apos;analyse des documents qui leur sont rattachés.
              </p>
            </section>

            <section>
              <h2 className="mb-1 font-medium text-foreground">5. Disponibilité</h2>
              <p>
                Le service est fourni « en l&apos;état », dans le cadre d&apos;un projet académique,
                sans garantie de disponibilité continue. Le statut du service est consultable sur la{" "}
                <a href="/statut" className="text-primary hover:underline">
                  page de statut
                </a>
                .
              </p>
            </section>

            <section>
              <h2 className="mb-1 font-medium text-foreground">6. Données personnelles</h2>
              <p>
                Le traitement des données personnelles est détaillé dans notre{" "}
                <a href="/confidentialite" className="text-primary hover:underline">
                  politique de confidentialité
                </a>
                .
              </p>
            </section>
          </CardContent>
        </Card>
      </main>
      <PublicFooter />
    </div>
  );
}
