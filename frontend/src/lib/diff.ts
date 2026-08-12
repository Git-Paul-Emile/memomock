// Comparateur de versions (spec écran D70) : diff ligne à ligne par plus longue sous-séquence
// commune (LCS), volontairement simple - pas de dépendance externe pour un besoin ponctuel.
// Coût en O(n×m) lignes : largement suffisant pour comparer deux versions d'un même mémoire
// (quelques centaines à quelques milliers de lignes), pas pensé pour des textes arbitrairement
// longs.
export type TypeLigneDiff = "identique" | "ajoutee" | "supprimee";

export interface LigneDiff {
  type: TypeLigneDiff;
  texte: string;
}

export function diffTexte(ancien: string, nouveau: string): LigneDiff[] {
  const lignesA = ancien.split("\n");
  const lignesB = nouveau.split("\n");
  const n = lignesA.length;
  const m = lignesB.length;

  // Table LCS classique : longueur[i][j] = longueur de la LCS entre lignesA[i:] et lignesB[j:].
  const longueur: number[][] = Array.from({ length: n + 1 }, () =>
    new Array<number>(m + 1).fill(0)
  );
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      longueur[i][j] =
        lignesA[i] === lignesB[j]
          ? longueur[i + 1][j + 1] + 1
          : Math.max(longueur[i + 1][j], longueur[i][j + 1]);
    }
  }

  const resultat: LigneDiff[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (lignesA[i] === lignesB[j]) {
      resultat.push({ type: "identique", texte: lignesA[i] });
      i++;
      j++;
    } else if (longueur[i + 1][j] >= longueur[i][j + 1]) {
      resultat.push({ type: "supprimee", texte: lignesA[i] });
      i++;
    } else {
      resultat.push({ type: "ajoutee", texte: lignesB[j] });
      j++;
    }
  }
  while (i < n) {
    resultat.push({ type: "supprimee", texte: lignesA[i] });
    i++;
  }
  while (j < m) {
    resultat.push({ type: "ajoutee", texte: lignesB[j] });
    j++;
  }
  return resultat;
}
