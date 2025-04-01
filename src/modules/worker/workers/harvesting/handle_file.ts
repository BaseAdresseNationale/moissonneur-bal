import { Injectable } from '@nestjs/common';
import { uniq } from 'lodash';

import { Organization } from '../../../organization/organization.entity';
import {
  Harvest,
  UpdateStatusHarvestEnum,
} from 'src/modules/harvest/harvest.entity';
import hasha from 'hasha';
import { signData } from 'src/lib/utils/signature';
import { communeIsInPerimeters } from 'src/lib/utils/perimeters';
import { FileService } from '../../../file/file.service';
import { decodeBuffer, getCodeCommunes, parseCsv } from './utils';
import { HandleCommune } from './handle_commune';
import { ParseError, ParseResult } from 'papaparse';

const MAX_ALLOWED_FILE_SIZE = 100_000_000;
const FATAL_PARSE_ERRORS = new Set([
  'MissingQuotes',
  'UndetectableDelimiter',
  'TooFewFields',
  'TooManyFields',
]);

@Injectable()
export class HandleFile {
  constructor(
    private fileService: FileService,
    private handleCommune: HandleCommune,
  ) {}

  async csvToJson(buffer: Buffer): Promise<{
    rows: Record<string, string>[];
    isFatalError: boolean;
    errors: ParseError[];
  }> {
    const file = decodeBuffer(buffer);
    const { data, errors }: ParseResult<Record<string, string>> =
      await parseCsv(file);
    const errorsKinds: string[] = uniq(errors.map((e: ParseError) => e.code));
    const isFatalError: boolean = errorsKinds.some((e) =>
      FATAL_PARSE_ERRORS.has(e),
    );

    return { rows: data, isFatalError, errors };
  }

  async handleNewFile(
    newFile: Buffer,
    sourceId: string,
    harvestId: string,
    {
      fileId: currentFileId,
      fileHash: currentFileHash,
      dataHash: currentDataHash,
    }: Partial<Harvest>,
    organization: Organization,
  ): Promise<Partial<Harvest>> {
    // CHECK QUE LE FICHIER NE FAIT PAS PLUS DE 100mo
    const newFileHash = hasha(newFile, { algorithm: 'sha256' });
    if (newFile.length > MAX_ALLOWED_FILE_SIZE) {
      return {
        updateStatus: UpdateStatusHarvestEnum.REJECTED,
        updateRejectionReason: 'Fichier trop volumineux',
        fileHash: newFileHash,
      };
    }
    const { rows, isFatalError, errors } = await this.csvToJson(newFile);
    // ON CHECK ON MINIMUM QUE LE PARSING DU FICHIER BAL SOIT BON
    if (isFatalError) {
      const parseErrors = [...new Set(errors.map(({ code }) => code))];
      return {
        updateStatus: UpdateStatusHarvestEnum.REJECTED,
        updateRejectionReason: `Impossible de lire le fichier CSV : ${parseErrors.join(', ')}`,
        fileHash: newFileHash, // On garde fileHash mais on ne stocke pas le fichier problématique
      };
    }
    // ON CHECK LES CODE COMMUNES DU FICHIER SOIT DANS LE PERIMETER DE L'ORGANISATION
    const codesCommunes = getCodeCommunes(rows);
    const communeOutOfPerimeters = codesCommunes.filter(
      (codeCommune) =>
        !communeIsInPerimeters(codeCommune, organization.perimeters || []),
    );
    if (communeOutOfPerimeters.length > 0) {
      return {
        updateStatus: UpdateStatusHarvestEnum.REJECTED,
        updateRejectionReason: `Les codes commune ${communeOutOfPerimeters.join(', ')} sont en dehors du périmètre`,
      };
    }
    // ON CHECK SI LE HASH DU FICHIER EST LE MEME QUE L'ANCIEN
    if (currentFileHash && newFileHash === currentFileHash) {
      return {
        updateStatus: UpdateStatusHarvestEnum.UNCHANGED,
        fileId: currentFileId,
        fileHash: currentFileHash,
        dataHash: currentDataHash, // On considère que le dataHash est inchangé
      };
    }
    // ON CHECK SI LE HASH DE LA DONNEE EST LE MEME QUE L'ANCIEN
    const dataHash = signData(rows);
    if (currentDataHash && currentDataHash === dataHash) {
      return {
        updateStatus: UpdateStatusHarvestEnum.UNCHANGED,
        fileId: currentFileId,
        fileHash: newFileHash,
        dataHash,
      };
    }
    // SI TOUT EST BON, ON UPLOAD LE FICHIER SUR S3
    const newFileId = await this.fileService.writeFile(newFile);
    // DECOUPE LE FICHIER BAL PAR COMMUNE
    await this.handleCommune.handleCommunesData(
      sourceId,
      harvestId,
      rows,
      organization,
      codesCommunes,
    );

    return {
      updateStatus: UpdateStatusHarvestEnum.UPDATED,
      fileId: newFileId,
      fileHash: newFileHash,
      dataHash,
    };
  }
}
