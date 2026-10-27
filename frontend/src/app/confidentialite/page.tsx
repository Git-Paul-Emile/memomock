import Link from "next/link";
import { GraduationCap } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PAYS, TEXTES_REGIONAUX } from "@/lib/afrique";
import { APP_NAME } from "@/lib/constants";

// Page publique et statique (liée depuis /register et /parametres) : informe les personnes
// concernées des traitements effectués, au regard des lois de protection des données des pays
// d'Afrique de l'Ouest et centrale où la plateforme est déployée (voir lib/afrique.ts). Ce n'est
// pas un document juridique complet : une relecture par un juriste de chaque pays cible est
// nécessaire avant une mise en production réelle.
export default function ConfidentialitePage() {
  const paysAvecLoi = PAYS.filter((p) => p.loiDonnees);
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
        <GraduationCap className="size-6 text-primary" />
        {APP_NAME}
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Politique de confidentialité</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="mb-1 font-medium text-foreground">1. Responsable du traitement</h2>
            <p>
              {APP_NAME} est édité dans le cadre d&apos;un projet académique. Lorsque la plateforme
              est utilisée par un établissement, celui-ci est responsable des traitements portant
              sur ses étudiants et enseignants. Pour toute question, contactez l&apos;administrateur
              de votre établissement ou{" "}
              <a href="mailto:support@memoassistant.africa" className="text-primary hover:underline">
                support@memoassistant.africa
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="mb-1 font-medium text-foreground">2. Données collectées</h2>
            <p>Nous collectons uniquement les données nécessaires au fonctionnement du service :</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Identité : nom, prénom, adresse e-mail, pays, établissement, filière.</li>
              <li>
                Numéro de téléphone, utilisé comme contact et pour les notifications par SMS ou
                WhatsApp si vous choisissez ce canal.
              </li>
              <li>Photo de profil (image que vous téléversez).</li>
              <li>
                Contenu académique : documents soumis et leur texte, analyses générées, échanges
                avec le tuteur IA et avec votre encadreur.
              </li>
              <li>Données techniques : horodatage des connexions, journaux d&apos;erreurs.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-1 font-medium text-foreground">3. Finalités</h2>
            <p>
              Ces données sont utilisées exclusivement pour : vous authentifier, vous rattacher à
              votre encadreur et à votre classe, analyser vos documents selon les exigences de votre
              encadreur, et vous notifier des événements liés à votre suivi pédagogique.
            </p>
          </section>

          <section>
            <h2 className="mb-1 font-medium text-foreground">4. Destinataires et transferts</h2>
            <p>
              Vos données ne sont jamais vendues ni utilisées à des fins publicitaires. Pour
              produire les analyses et les réponses du tuteur, le texte de vos documents est
              transmis à l&apos;API Gemini de Google, qui agit comme sous-traitant. Ce traitement a
              lieu sur des serveurs situés hors d&apos;Afrique : il constitue un transfert
              international de données, encadré par la loi de votre pays (voir § 6). Si l&apos;IA
              n&apos;est pas configurée, l&apos;analyse est simulée localement et aucun texte
              n&apos;est transmis.
            </p>
            <p className="mt-2">
              Dans cette version de démonstration, les autres données sont stockées dans un jeu de
              données de test (json-server) et ne sont transmises à aucun autre prestataire.
            </p>
          </section>

          <section>
            <h2 className="mb-1 font-medium text-foreground">5. Durée de conservation</h2>
            <p>
              Vos données sont conservées le temps de votre scolarité et de la durée légale
              d&apos;archivage académique de votre établissement.
            </p>
          </section>

          <section>
            <h2 className="mb-1 font-medium text-foreground">6. Cadre légal</h2>
            <p>
              Le traitement respecte la loi de protection des données du pays de l&apos;utilisateur
              et les textes régionaux suivants :
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {TEXTES_REGIONAUX.map((texte) => (
                <li key={texte}>{texte}</li>
              ))}
            </ul>
            <p className="mt-3">Lois nationales et autorités de contrôle :</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {paysAvecLoi.map((p) => (
                <li key={p.code}>
                  <strong className="text-foreground">{p.nom}</strong> : {p.loiDonnees!.reference}{" "}
                  - {p.loiDonnees!.autorite}
                </li>
              ))}
            </ul>
            <p className="mt-2">
              Vous pouvez saisir l&apos;autorité de protection des données de votre pays si vous
              estimez que vos droits ne sont pas respectés.
            </p>
          </section>

          <section>
            <h2 className="mb-1 font-medium text-foreground">7. Vos droits</h2>
            <p>Vous disposez à tout moment des droits suivants :</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                <strong className="text-foreground">Droit d&apos;accès et de portabilité</strong> :
                téléchargez une copie complète de vos données depuis{" "}
                <Link href="/parametres" className="text-primary hover:underline">
                  Paramètres du compte
                </Link>
                .
              </li>
              <li>
                <strong className="text-foreground">Droit de rectification</strong> : modifiez vos
                informations directement depuis la même page.
              </li>
              <li>
                <strong className="text-foreground">Droit à l&apos;effacement</strong> : supprimez
                votre compte depuis la même page (vos données identifiantes sont alors anonymisées ;
                voir le détail affiché avant confirmation).
              </li>
              <li>
                <strong className="text-foreground">Droit d&apos;opposition</strong> concernant le
                canal de notification (WhatsApp, SMS, e-mail ou uniquement dans
                l&apos;application), réglable à tout moment.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-1 font-medium text-foreground">8. Sécurité</h2>
            <p>
              Les échanges sont chiffrés (HTTPS) et l&apos;accès à vos données est limité à
              vous-même, à votre encadreur et aux administrateurs habilités. La clé d&apos;accès à
              l&apos;IA n&apos;est jamais exposée dans votre navigateur. Dans cette démonstration,
              l&apos;authentification est simulée : ne saisissez pas de vrai mot de passe.
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
