import stringify from 'fast-json-stable-stringify';
import Hash from 'hasha';

export async function signRow(row: any): Promise<string> {
  const stringifiedRow = stringify(row);
  return Hash.async(stringifiedRow, { algorithm: 'md5' });
}

export async function signData(data: any[]): Promise<string> {
  const signedRows = data.map((d) => signRow(d));
  const sortedSignatures = signedRows.sort().join('|');

  return Hash.async(sortedSignatures, { algorithm: 'sha256' });
}
