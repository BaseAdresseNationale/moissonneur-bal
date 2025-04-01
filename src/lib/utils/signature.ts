import stringify from 'fast-json-stable-stringify';
import hasha from 'hasha';

export function signData(data: Record<string, string>[]): string {
  const signedRows: string[] = data.map((row) =>
    hasha(stringify(row), { algorithm: 'md5' }),
  );
  const sortedSignatures = signedRows
    .sort((a: string, b: string) => a.localeCompare(b))
    .join('|');

  return hasha(sortedSignatures, { algorithm: 'sha256' });
}
