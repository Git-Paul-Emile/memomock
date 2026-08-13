import Link from "next/link";
import { GraduationCap } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_NAME } from "@/lib/constants";

// Page publique et statique (accessible avant connexion, voir lien depuis /register et
// /parametres) : résume les traitements de données personnelles effectués par MemoAI
// Assistant, conformément aux exigences minimales du RGPD (art. 12-14 : information des
// personnes concernées). Ce n'est pas un CGU/CGV complet - un tel document nécessiterait une
// relecture juridique dédiée avant mise en production réelle - mais couvre les points
// structurants attendus d'un "RGPD de base" : quelles données, pourquoi, combien de temps,
// quels droits, comment les exercer.
export default function ConfidentialitePage() {
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
              {APP_NAME} est édité dans le cadre d&apos;un projet académique. Pour toute question
              relative à vos données personnelles, contactez l&apos;administrateur de votre
              établissement.
            </p>
          </section>

          <section>
            <h2 className="mb-1 font-medium text-foreground">2. Données collectées</h2>
            <p>Nous collectons uniquement les données nécessaires au fonctionnement du service :</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Identité : nom, prénom, adresse e-mail, établissement, filière.</li>
              <li>
                Numéro de téléphone, fourni à l&apos;inscription comme information de contact.
              </li>
              <li>Photo de profil (image que vous téléversez).</li>
              <li>
                Contenu académique : documents soumis, analyses générées, échanges avec le tuteur IA
                et votre encadrant.
              </li>
              <li>Données techniques : horodatage des connexions, journaux d&apos;erreurs.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-1 font-medium text-foreground">3. Finalités</h2>
            <p>
              Ces données sont utilisées exclusivement pour : vous authentifier, vous mettre en
              relation avec votre encadrant, analyser et corriger vos documents, et vous notifier
              des événements liés à votre suivi pédagogique.
            </p>
          </section>

          <section>
            <h2 className="mb-1 font-medium text-foreground">4. Destinataires</h2>
            <p>
              Vos données ne sont jamais vendues ni transmises à des tiers à des fins commerciales.
              Elles sont hébergées chez nos sous-traitants techniques : Neon (base de données),
              services d'authentification (local ou externe), Cloudinary (stockage des fichiers)
              et Resend (envoi des e-mails transactionnels et de notification).
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
            <h2 className="mb-1 font-medium text-foreground">6. Vos droits</h2>
            <p>Conformément au RGPD, vous disposez à tout moment des droits suivants :</p>
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
                canal de notification utilisé (e-mail ou uniquement dans l&apos;application),
                réglable à tout moment.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-1 font-medium text-foreground">7. Sécurité</h2>
            <p>
              L&apos;authentification est gérée localement (mots de passe stockés de manière mockée),
              les échanges sont chiffrés (HTTPS), et l&apos;accès à vos données est strictement limité
              à vous-même, votre encadrant assigné et les administrateurs de la plateforme.
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
