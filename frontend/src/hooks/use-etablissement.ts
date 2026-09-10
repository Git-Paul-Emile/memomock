"use client";

import * as React from "react";

import { useAuth } from "@/context/auth-context";
import { useApiResource } from "@/hooks/use-api-resource";
import { apiList } from "@/lib/api";
import type {
  Classe,
  DocumentSubmission,
  Etablissement,
  Filiere,
  Groupe,
  Promotion,
  PublicUser,
} from "@/types";

/**
 * Accès à l'établissement de l'administrateur connecté.
 *
 * Cette résolution (« quel établissement administre l'utilisateur courant ? ») était recopiée
 * à l'identique dans chaque écran de l'espace établissement. Elle est mutualisée ici (DRY) :
 * la clé TanStack Query étant partagée, un seul appel réseau sert tous les écrans, et la
 * navigation entre eux n'entraîne plus de rechargement.
 */
export function useMonEtablissement() {
  const { user } = useAuth();

  const { data, isLoading, error, refetch } = useApiResource<Etablissement | null>(
    ["mon-etablissement", user?.id],
    async () => {
      const reponse = await apiList<Etablissement>("etablissements", {
        filtres: { adminId: user!.id },
        limite: 1,
      });
      return reponse.data[0] ?? null;
    },
    { enabled: !!user }
  );

  return {
    etablissement: data ?? null,
    // Tant que l'utilisateur n'est pas connu, la requête est désactivée : `isLoading` de
    // TanStack Query vaut alors `true` mais rien n'est en vol. On expose donc un état de
    // chargement qui couvre aussi cette phase, pour que les écrans n'affichent pas « aucun
    // établissement » pendant l'hydratation.
    isLoading: !user || isLoading,
    error,
    refetch,
  };
}

/**
 * Promotions (années académiques) d'un établissement, la plus récente d'abord, et promotion
 * active courante. Une seule promotion peut être active : si la donnée est incohérente
 * (aucune active), on retombe sur la plus récente plutôt que sur `null`, pour qu'un écran
 * affiche toujours un contexte.
 */
export function usePromotions(etablissementId?: string) {
  const { data, isLoading, error, refetch } = useApiResource<Promotion[]>(
    ["promotions", etablissementId],
    async () => {
      const reponse = await apiList<Promotion>("promotions", {
        filtres: { etablissementId },
        limite: 100,
        tri: "anneeDebut",
        ordre: "desc",
      });
      return reponse.data;
    },
    { enabled: !!etablissementId }
  );

  const promotions = React.useMemo(() => data ?? [], [data]);
  const promotionActive =
    promotions.find((promotion) => promotion.statut === "active") ?? promotions[0] ?? null;

  return { promotions, promotionActive, isLoading, error, refetch };
}

/**
 * Documents de l'établissement, triés du plus récent au plus ancien, avec l'index « dernier
 * document par étudiant » qu'en tirent le tableau de bord et la liste des apprenants.
 *
 * Limite assumée du mode maquette : `Document` ne porte pas d'`etablissementId`, l'API mock ne
 * sait donc pas filtrer les documents d'un établissement en une requête. On charge ici la
 * collection puis on l'indexe côté client. En production, cet agrégat serait exposé par une
 * ressource dédiée - `GET /etablissements/:id/apprenants` renvoyant directement l'apprenant
 * avec son dernier document, paginée et triée côté serveur.
 */
export function useDocumentsEtablissement() {
  const { data, isLoading, error, refetch } = useApiResource(
    ["documents-etablissement"],
    async () => {
      const reponse = await apiList<DocumentSubmission>("documents", {
        limite: 500,
        tri: "dateMaj",
        ordre: "desc",
      });

      const parEtudiant = new Map<string, DocumentSubmission>();
      for (const document of reponse.data) {
        // La liste est triée du plus récent au plus ancien : le premier vu par étudiant est
        // donc le plus récent, on ne l'écrase pas ensuite.
        if (!parEtudiant.has(document.etudiantId)) parEtudiant.set(document.etudiantId, document);
      }

      return { documents: reponse.data, documentsParEtudiant: parEtudiant };
    }
  );

  return {
    documents: data?.documents ?? [],
    documentsParEtudiant: data?.documentsParEtudiant ?? new Map<string, DocumentSubmission>(),
    isLoading,
    error,
    refetch,
  };
}

/**
 * Référentiel d'un établissement : filières, classes, groupes et encadreurs, plus les index
 * dérivés dont les écrans ont besoin (groupes par classe, encadreur par identifiant, nombre
 * d'apprenants par encadreur).
 *
 * Ces collections sont petites, stables et consultées par presque toutes les lignes des
 * tableaux de l'espace établissement : les charger une fois et les indexer évite une requête
 * par ligne (problème N+1). La clé TanStack Query étant partagée, les pages Professeurs,
 * Apprenants et Structure se servent du même cache.
 */
export function useReferentielEtablissement(etablissementId?: string) {
  const { data, isLoading, error, refetch } = useApiResource(
    ["referentiel-etablissement", etablissementId],
    async () => {
      const [filieresRes, classesRes, groupesRes, encadrantsRes, etudiantsRes] = await Promise.all([
        apiList<Filiere>("filieres", {
          filtres: { etablissementId },
          limite: 200,
          tri: "nom",
        }),
        apiList<Classe>("classes", {
          filtres: { etablissementId },
          limite: 200,
          tri: "nom",
        }),
        apiList<Groupe>("groupes", { limite: 500 }),
        apiList<PublicUser>("users", {
          filtres: { etablissementId, role: "encadrant" },
          limite: 500,
          tri: "nom",
        }),
        apiList<PublicUser>("users", {
          filtres: { etablissementId, role: "etudiant" },
          limite: 500,
        }),
      ]);

      const idsClasses = new Set(classesRes.data.map((classe) => classe.id));
      const groupesParClasse = new Map<string, Groupe[]>();
      for (const groupe of groupesRes.data) {
        // L'API mock ne sait pas filtrer les groupes par établissement (ils ne portent qu'un
        // `classeId`) : on écarte ici ceux des classes d'un autre établissement.
        if (!idsClasses.has(groupe.classeId)) continue;
        const liste = groupesParClasse.get(groupe.classeId) ?? [];
        liste.push(groupe);
        groupesParClasse.set(groupe.classeId, liste);
      }

      const apprenantsParEncadrant = new Map<string, number>();
      for (const etudiant of etudiantsRes.data) {
        if (!etudiant.encadrantId) continue;
        apprenantsParEncadrant.set(
          etudiant.encadrantId,
          (apprenantsParEncadrant.get(etudiant.encadrantId) ?? 0) + 1
        );
      }

      return {
        filieres: filieresRes.data,
        classes: classesRes.data,
        etudiants: etudiantsRes.data,
        groupes: groupesRes.data.filter((groupe) => idsClasses.has(groupe.classeId)),
        groupesParClasse,
        encadrants: encadrantsRes.data,
        encadrantsParId: new Map(encadrantsRes.data.map((encadrant) => [encadrant.id, encadrant])),
        nbEtudiants: etudiantsRes.total,
        apprenantsParEncadrant,
      };
    },
    { enabled: !!etablissementId }
  );

  return {
    filieres: data?.filieres ?? [],
    classes: data?.classes ?? [],
    etudiants: data?.etudiants ?? [],
    groupes: data?.groupes ?? [],
    groupesParClasse: data?.groupesParClasse ?? new Map<string, Groupe[]>(),
    encadrants: data?.encadrants ?? [],
    encadrantsParId: data?.encadrantsParId ?? new Map<string, PublicUser>(),
    nbEtudiants: data?.nbEtudiants ?? 0,
    apprenantsParEncadrant: data?.apprenantsParEncadrant ?? new Map<string, number>(),
    isLoading,
    error,
    refetch,
  };
}
