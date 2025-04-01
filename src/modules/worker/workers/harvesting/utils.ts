import chardet from 'chardet';
import fileType from 'file-type';
import iconv from 'iconv-lite';
import Papa, { ParseResult } from 'papaparse';
import { isCodeCommune } from 'src/lib/utils/cog';

export function getCodeCommune(row: Record<string, string>): string {
  let codeCommune = '';
  if (row.commune_insee) {
    codeCommune = row.commune_insee.toUpperCase();
  } else if (row.cle_interop) {
    codeCommune = row.cle_interop.split('_')[0];
  }
  return isCodeCommune(codeCommune) ? codeCommune : undefined;
}

export function getCodeCommunes(rows: Record<string, string>[]): string[] {
  return [...new Set<string>(rows.map((r) => getCodeCommune(r)))];
}

const CHARDET_TO_NORMALIZED_ENCODINGS = {
  'iso-8859-1': 'windows-1252',
  'iso-8859-15': 'windows-1252',
  'windows-1252': 'windows-1252',
  'utf-8': 'utf-8',
};

function normalizeEncodingName(encoding: string): string {
  const lcEncoding = encoding.toLowerCase();
  if (!(lcEncoding in CHARDET_TO_NORMALIZED_ENCODINGS)) {
    throw new Error('Encoding currently not supported: ' + encoding);
  }

  return CHARDET_TO_NORMALIZED_ENCODINGS[lcEncoding];
}

function detectBufferEncoding(buffer: Buffer): string {
  if (fileType(buffer)) {
    throw new Error('Non-text file cannot be processed');
  }

  const analyseResults = chardet.analyse(buffer);

  if (analyseResults.length === 0) {
    throw new Error('Unable to detect encoding');
  }

  const utf8Result = analyseResults.find((r) => r.name === 'UTF-8');

  if (utf8Result && utf8Result.confidence >= 80) {
    return 'utf-8';
  }

  // Pure ASCII
  if (utf8Result && utf8Result.confidence === 10) {
    return 'utf-8';
  }

  return normalizeEncodingName(analyseResults[0].name);
}

function stripBom(str: string): string {
  // Catches EFBBBF (UTF-8 BOM) because the buffer-to-string
  // conversion translates it to FEFF (UTF-16 BOM)
  return str.codePointAt(0) === 0xfe_ff ? str.slice(1) : str;
}

export function decodeBuffer(buffer: Buffer): string {
  const encoding: string = detectBufferEncoding(buffer);
  const decodedString: string = stripBom(iconv.decode(buffer, encoding));
  return decodedString;
}

export function parseCsv(
  file: string,
): Promise<ParseResult<Record<string, string>>> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      delimitersToGuess: [',', '\t', ';'],
      skipEmptyLines: true,
      header: true,
      transformHeader: (h) => h.toLowerCase().trim(),
      complete: (res) => resolve(res),
      error: (err) => reject(err),
    });
  });
}
