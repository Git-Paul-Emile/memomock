/**
 * Référentiel de la zone de déploiement : Afrique de l'Ouest et Afrique centrale.
 *
 * Centralise tout ce qui dépend du pays : indicatif téléphonique, devise, fuseau horaire,
 * moyens de paiement mobile courants et loi de protection des données personnelles. Les écrans
 * (inscription, établissement, abonnement, confidentialité) lisent ces valeurs plutôt que de les
 * coder en dur.
 *
 * Les moyens de paiement sont ceux le plus souvent proposés dans chaque pays ; ils ne sont
 * qu'affichés (paiement simulé en mode mock). Les références légales sont données à titre
 * indicatif et doivent être validées par un juriste avant toute mise en production.
 */

import type { CodeDevise, MoyenPaiement } from "@/types";

export type ZoneEconomique = "UEMOA" | "CEMAC" | "CEDEAO" | "CEEAC";

export interface Pays {
  code: string; // ISO 3166-1 alpha-2
  nom: string;
  indicatif: string; // ex. "+221"
  exempleNumero: string; // numéro national fictif, sans indicatif
  devise: CodeDevise;
  fuseau: string; // IANA
  zone: ZoneEconomique;
  region: "ouest" | "centre";
  paiements: MoyenPaiement[];
  loiDonnees?: { reference: string; autorite: string };
}

const CARTE_ET_VIREMENT: MoyenPaiement[] = ["carte_bancaire", "virement"];

export const PAYS: Pays[] = [
  // --- Afrique de l'Ouest ---
  { code: "SN", nom: "Sénégal", indicatif: "+221", exempleNumero: "77 123 45 67", devise: "XOF", fuseau: "Africa/Dakar", zone: "UEMOA", region: "ouest", paiements: ["wave", "orange_money", "free_money", ...CARTE_ET_VIREMENT], loiDonnees: { reference: "Loi n° 2008-12 du 25 janvier 2008 sur la protection des données à caractère personnel", autorite: "Commission de Protection des Données Personnelles (CDP)" } },
  { code: "CI", nom: "Côte d'Ivoire", indicatif: "+225", exempleNumero: "07 12 34 56 78", devise: "XOF", fuseau: "Africa/Abidjan", zone: "UEMOA", region: "ouest", paiements: ["orange_money", "mtn_momo", "moov_money", "wave", ...CARTE_ET_VIREMENT], loiDonnees: { reference: "Loi n° 2013-450 du 19 juin 2013 relative à la protection des données à caractère personnel", autorite: "Autorité de Régulation des Télécommunications/TIC de Côte d'Ivoire (ARTCI)" } },
  { code: "ML", nom: "Mali", indicatif: "+223", exempleNumero: "76 12 34 56", devise: "XOF", fuseau: "Africa/Bamako", zone: "UEMOA", region: "ouest", paiements: ["orange_money", "moov_money", "wave", ...CARTE_ET_VIREMENT], loiDonnees: { reference: "Loi n° 2013-015 du 21 mai 2013 portant protection des données à caractère personnel", autorite: "Autorité de Protection des Données à caractère Personnel (APDP)" } },
  { code: "BF", nom: "Burkina Faso", indicatif: "+226", exempleNumero: "70 12 34 56", devise: "XOF", fuseau: "Africa/Ouagadougou", zone: "UEMOA", region: "ouest", paiements: ["orange_money", "moov_money", "wave", ...CARTE_ET_VIREMENT], loiDonnees: { reference: "Loi n° 001-2021/AN portant protection des personnes à l'égard du traitement des données à caractère personnel", autorite: "Commission de l'Informatique et des Libertés (CIL)" } },
  { code: "BJ", nom: "Bénin", indicatif: "+229", exempleNumero: "01 97 12 34 56", devise: "XOF", fuseau: "Africa/Porto-Novo", zone: "UEMOA", region: "ouest", paiements: ["mtn_momo", "moov_money", ...CARTE_ET_VIREMENT], loiDonnees: { reference: "Loi n° 2017-20 portant Code du numérique (livre V)", autorite: "Autorité de Protection des Données à caractère Personnel (APDP)" } },
  { code: "TG", nom: "Togo", indicatif: "+228", exempleNumero: "90 12 34 56", devise: "XOF", fuseau: "Africa/Lome", zone: "UEMOA", region: "ouest", paiements: ["moov_money", ...CARTE_ET_VIREMENT], loiDonnees: { reference: "Loi n° 2019-014 relative à la protection des données à caractère personnel", autorite: "Instance de Protection des Données à caractère Personnel (IPDCP)" } },
  { code: "NE", nom: "Niger", indicatif: "+227", exempleNumero: "90 12 34 56", devise: "XOF", fuseau: "Africa/Niamey", zone: "UEMOA", region: "ouest", paiements: ["airtel_money", "moov_money", ...CARTE_ET_VIREMENT], loiDonnees: { reference: "Loi n° 2017-28 relative à la protection des données à caractère personnel", autorite: "Haute Autorité de Protection des Données à caractère Personnel (HAPDP)" } },
  { code: "GW", nom: "Guinée-Bissau", indicatif: "+245", exempleNumero: "955 123 456", devise: "XOF", fuseau: "Africa/Bissau", zone: "UEMOA", region: "ouest", paiements: ["orange_money", "mtn_momo", ...CARTE_ET_VIREMENT] },
  { code: "GN", nom: "Guinée", indicatif: "+224", exempleNumero: "620 12 34 56", devise: "GNF", fuseau: "Africa/Conakry", zone: "CEDEAO", region: "ouest", paiements: ["orange_money", "mtn_momo", ...CARTE_ET_VIREMENT] },
  { code: "MR", nom: "Mauritanie", indicatif: "+222", exempleNumero: "22 12 34 56", devise: "MRU", fuseau: "Africa/Nouakchott", zone: "CEDEAO", region: "ouest", paiements: CARTE_ET_VIREMENT },
  { code: "GM", nom: "Gambie", indicatif: "+220", exempleNumero: "301 2345", devise: "GMD", fuseau: "Africa/Banjul", zone: "CEDEAO", region: "ouest", paiements: ["wave", ...CARTE_ET_VIREMENT] },
  { code: "CV", nom: "Cap-Vert", indicatif: "+238", exempleNumero: "991 23 45", devise: "CVE", fuseau: "Atlantic/Cape_Verde", zone: "CEDEAO", region: "ouest", paiements: CARTE_ET_VIREMENT },
  { code: "GH", nom: "Ghana", indicatif: "+233", exempleNumero: "24 123 4567", devise: "GHS", fuseau: "Africa/Accra", zone: "CEDEAO", region: "ouest", paiements: ["mtn_momo", "airtel_money", ...CARTE_ET_VIREMENT], loiDonnees: { reference: "Data Protection Act, 2012 (Act 843)", autorite: "Data Protection Commission" } },
  { code: "NG", nom: "Nigeria", indicatif: "+234", exempleNumero: "803 123 4567", devise: "NGN", fuseau: "Africa/Lagos", zone: "CEDEAO", region: "ouest", paiements: CARTE_ET_VIREMENT, loiDonnees: { reference: "Nigeria Data Protection Act, 2023", autorite: "Nigeria Data Protection Commission (NDPC)" } },
  { code: "LR", nom: "Liberia", indicatif: "+231", exempleNumero: "77 012 3456", devise: "LRD", fuseau: "Africa/Monrovia", zone: "CEDEAO", region: "ouest", paiements: ["orange_money", "mtn_momo", ...CARTE_ET_VIREMENT] },
  { code: "SL", nom: "Sierra Leone", indicatif: "+232", exempleNumero: "76 123456", devise: "SLE", fuseau: "Africa/Freetown", zone: "CEDEAO", region: "ouest", paiements: ["orange_money", ...CARTE_ET_VIREMENT] },
  // --- Afrique centrale ---
  { code: "CM", nom: "Cameroun", indicatif: "+237", exempleNumero: "6 71 23 45 67", devise: "XAF", fuseau: "Africa/Douala", zone: "CEMAC", region: "centre", paiements: ["orange_money", "mtn_momo", ...CARTE_ET_VIREMENT], loiDonnees: { reference: "Loi n° 2024/017 du 23 décembre 2024 relative à la protection des données à caractère personnel", autorite: "Autorité de protection des données à caractère personnel" } },
  { code: "GA", nom: "Gabon", indicatif: "+241", exempleNumero: "06 12 34 56", devise: "XAF", fuseau: "Africa/Libreville", zone: "CEMAC", region: "centre", paiements: ["airtel_money", "moov_money", ...CARTE_ET_VIREMENT], loiDonnees: { reference: "Loi n° 001/2011 relative à la protection des données à caractère personnel", autorite: "Commission Nationale pour la Protection des Données à Caractère Personnel (CNPDCP)" } },
  { code: "CG", nom: "Congo", indicatif: "+242", exempleNumero: "06 123 4567", devise: "XAF", fuseau: "Africa/Brazzaville", zone: "CEMAC", region: "centre", paiements: ["mtn_momo", "airtel_money", ...CARTE_ET_VIREMENT] },
  { code: "TD", nom: "Tchad", indicatif: "+235", exempleNumero: "66 12 34 56", devise: "XAF", fuseau: "Africa/Ndjamena", zone: "CEMAC", region: "centre", paiements: ["airtel_money", "moov_money", ...CARTE_ET_VIREMENT] },
  { code: "CF", nom: "Centrafrique", indicatif: "+236", exempleNumero: "70 12 34 56", devise: "XAF", fuseau: "Africa/Bangui", zone: "CEMAC", region: "centre", paiements: ["orange_money", ...CARTE_ET_VIREMENT] },
  { code: "GQ", nom: "Guinée équatoriale", indicatif: "+240", exempleNumero: "222 123 456", devise: "XAF", fuseau: "Africa/Malabo", zone: "CEMAC", region: "centre", paiements: CARTE_ET_VIREMENT },
  { code: "CD", nom: "RD Congo", indicatif: "+243", exempleNumero: "81 234 5678", devise: "CDF", fuseau: "Africa/Kinshasa", zone: "CEEAC", region: "centre", paiements: ["orange_money", "airtel_money", ...CARTE_ET_VIREMENT] },
  { code: "ST", nom: "Sao Tomé-et-Principe", indicatif: "+239", exempleNumero: "981 2345", devise: "STN", fuseau: "Africa/Sao_Tome", zone: "CEEAC", region: "centre", paiements: CARTE_ET_VIREMENT },
];

export const PAYS_PAR_DEFAUT = "SN";

const PAYS_PAR_CODE = new Map(PAYS.map((p) => [p.code, p]));

export function trouverPays(code: string | null | undefined): Pays | undefined {
  return code ? PAYS_PAR_CODE.get(code.toUpperCase()) : undefined;
}

/** Pays déduit d'un numéro au format international (le plus long indicatif correspondant). */
export function paysDepuisTelephone(telephone: string | null | undefined): Pays | undefined {
  if (!telephone) return undefined;
  return [...PAYS]
    .sort((a, b) => b.indicatif.length - a.indicatif.length)
    .find((p) => telephone.replace(/\s/g, "").startsWith(p.indicatif));
}

/** Textes de référence communs à toute la zone, cités par la politique de confidentialité. */
export const TEXTES_REGIONAUX = [
  "Convention de l'Union africaine sur la cybersécurité et la protection des données à caractère personnel (Convention de Malabo, 2014, en vigueur depuis 2023)",
  "Acte additionnel A/SA.1/01/10 relatif à la protection des données à caractère personnel dans l'espace CEDEAO (2010)",
];

export const LIBELLES_DEVISE: Record<CodeDevise, string> = {
  XOF: "Franc CFA (BCEAO)",
  XAF: "Franc CFA (BEAC)",
  GNF: "Franc guinéen",
  NGN: "Naira",
  GHS: "Cedi",
  CDF: "Franc congolais",
  MRU: "Ouguiya",
  GMD: "Dalasi",
  LRD: "Dollar libérien",
  SLE: "Leone",
  CVE: "Escudo cap-verdien",
  STN: "Dobra",
};

/** Montant formaté dans sa devise, sans décimales (ex. « 100 000 F CFA »). */
export function formaterMontant(montant: number, devise: CodeDevise = "XOF"): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: devise,
    maximumFractionDigits: 0,
  }).format(montant);
}

export const LIBELLES_MOYEN_PAIEMENT: Record<MoyenPaiement, string> = {
  orange_money: "Orange Money",
  wave: "Wave",
  mtn_momo: "MTN Mobile Money",
  moov_money: "Moov Money (Flooz)",
  airtel_money: "Airtel Money",
  free_money: "Free Money",
  carte_bancaire: "Carte bancaire (Visa, Mastercard, GIM-UEMOA)",
  virement: "Virement bancaire",
};

export function estMobileMoney(moyen: MoyenPaiement): boolean {
  return moyen !== "carte_bancaire" && moyen !== "virement";
}

/**
 * Calendrier académique par défaut : rentrée début novembre, fin de l'année fin juillet, ce qui
 * correspond à la majorité des universités LMD de la zone (l'établissement ajuste ses dates).
 */
export const RENTREE_PAR_DEFAUT = { mois: 10, jour: 1 }; // 1er novembre (mois 0-indexé)
export const FIN_ANNEE_PAR_DEFAUT = { mois: 6, jour: 31 }; // 31 juillet
