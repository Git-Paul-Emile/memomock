/**
 * Contrat entre les écrans (client) et les routes /api/ia/* (serveur) : formes des requêtes et
 * des réponses. Partagé par les deux côtés - aucun import serveur ici.
 */

import type {
  CategorieCommentaire,
  CategorieRegle,
  NiveauAlerte,
  NiveauRegle,
  SourceIA,
  TypeAnalyse,
  TypeDocument,
} from "@/types";

/** Ce que l'IA doit savoir du référentiel de l'encadreur pour analyser un document. */
export interface ContexteAnalyse {
  titre: string;
  typeDocument: TypeDocument | null;
  discipline: string | null;
  sujet?: string | null;
  problematique?: string | null;
  // Règles du profil (contraintes de forme, exigences, règles confirmées), déjà mises en phrases.
  regles: string[];
  // Règles imposées par l'établissement : priorité maximale (spec v2, § 20).
  reglesImposees: string[];
  // Préférences apprises adoptées, applicables à ce document (spec v2, § 38).
  reglesApprises: string[];
  canevas: { titre: string; obligatoire: boolean; criteres: string[]; sousSections: string[] }[];
  grille: { libelle: string; poids: number }[];
}

export interface RequeteAnalyse {
  texte: string;
  contexte: ContexteAnalyse;
}

export interface PointAnalyseIA {
  libelle: string;
  detail: string;
  niveau: NiveauAlerte;
  regle?: string | null;
  passage?: string | null;
  avisEncadreur?: boolean;
  bloquant?: boolean;
  sousCategorie?: "methodologie" | "bibliographie" | null;
}

export interface ResultatAnalyseIA {
  axes: Record<TypeAnalyse, { score: number; points: PointAnalyseIA[] }>;
  sousScores: { methodologie: number; bibliographie: number };
}

export interface RequeteTuteur {
  question: string;
  historique: { auteur: "etudiant" | "ia"; contenu: string }[];
  contexte: {
    titre: string;
    typeDocument: TypeDocument | null;
    points: string[];
    regles: string[];
    extrait: string;
  };
}

export interface RequeteExtractionRegles {
  texte: string;
  titreRessource: string;
  typeDocument: TypeDocument | null;
  discipline: string | null;
}

export interface RegleExtraite {
  categorie: CategorieRegle;
  libelle: string;
  detail?: string | null;
}

export interface RequetePropositionRegles {
  typeDocument: TypeDocument | null;
  discipline: string | null;
  corrections: { avant: string; apres: string }[];
  commentaires: { categorie: CategorieCommentaire | null; texte: string }[];
  reglesExistantes: string[];
}

export interface RegleProposee {
  regle: string;
  confiance: number;
  niveau: NiveauRegle;
}

/** Enveloppe commune des réponses : la source dit si Gemini a réellement répondu. */
export interface ReponseIA<T> {
  source: SourceIA;
  modele?: string;
  resultat: T;
}
