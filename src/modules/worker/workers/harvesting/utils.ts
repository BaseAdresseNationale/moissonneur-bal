export function getCodeCommune(row: any): string {
  return (
    row.parsedValues.commune_insee ||
    row.additionalValues.cle_interop?.codeCommune
  );
}
