import stringify from 'fast-json-stable-stringify';
import hasha from 'hasha';

export function signData(data: any[]): string {
  const signedRows = data.map((row) =>
    hasha(stringify(row), { algorithm: 'md5' }),
  );
  const sortedSignatures = signedRows.sort().join('|');

  return hasha(sortedSignatures, { algorithm: 'sha256' });
}
