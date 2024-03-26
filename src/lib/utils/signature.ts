import stringify from 'fast-json-stable-stringify';
import { hashSync } from 'hasha';

export function signRow(row: any): string {
  const stringifiedRow = stringify(row);
  return hashSync(stringifiedRow, { algorithm: 'md5' });
}

export function signData(data: any[]): string {
  const signedRows = data.map((d) => signRow(d));
  const sortedSignatures = signedRows.sort().join('|');

  return hashSync(sortedSignatures, { algorithm: 'sha256' });
}
