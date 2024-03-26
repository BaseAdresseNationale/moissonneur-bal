import { Injectable } from '@nestjs/common';
import { Organization } from '../../../organization/organization.schema';
import { Harvest } from 'src/modules/harvest/harvest.schema';
import hasha from 'hasha';
import { validate } from '@ban-team/validateur-bal';
import { signData } from 'src/lib/utils/signature';
import { communeIsInPerimeters } from 'src/lib/utils/perimeters';
import { FileService } from '../../../file/file.service';
import { getCodeCommune } from './utils';
import { HandleCommune } from './handle_commune';
import { StatusUpdateEnum } from 'src/lib/types/status_update.enum';
import { Types } from 'mongoose';

const MAX_ALLOWED_FILE_SIZE = 100_000_000;

@Injectable()
export class HandleFile {
  constructor(
    private fileService: FileService,
    private handleCommune: HandleCommune,
  ) {}

  async handleNewFile(
    newFile: Buffer,
    sourceId: string,
    harvestId: Types.ObjectId,
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
        updateStatus: StatusUpdateEnum.REJECTED,
        updateRejectionReason: 'Fichier trop volumineux',
        fileHash: newFileHash,
      };
    }
    // ON PASSE LE VALIDATEUR AVEC LA VERSION 1.3 RELAX
    const result = await validate(newFile, {
      profile: '1.3-relax',
    });
    // ON CHECK ON MINIMUM QUE LE PARSING DU FICHIER BAL SOIT BON
    if (!result.parseOk) {
      const parseErrors = [
        ...new Set(result.parseErrors.map(({ code }) => code)),
      ];
      return {
        updateStatus: StatusUpdateEnum.REJECTED,
        updateRejectionReason: `Impossible de lire le fichier CSV : ${parseErrors.join(', ')}`,
        fileHash: newFileHash, // On garde fileHash mais on ne stocke pas le fichier problématique
      };
    }
    // ON CHECK QUE 95% DE LIGNES SOIENT CORRECT
    const validRows = result.rows.filter((r) => r.isValid);
    if (validRows.length / result.rows.length < 0.95) {
      return {
        updateStatus: StatusUpdateEnum.REJECTED,
        updateRejectionReason:
          'Le fichier contient trop d’erreurs de validation',
        fileHash: newFileHash,
      };
    }
    // ON CHECK LES CODE COMMUNES DU FICHIER SOIT DANS LE PERIMETER DE L'ORGANISATION
    const codesCommunes: string[] = [
      ...new Set<string>(validRows.map((r) => getCodeCommune(r))),
    ];
    const communeOutOfPerimeters = codesCommunes.filter(
      (codeCommune) =>
        !communeIsInPerimeters(codeCommune, organization.perimeters || []),
    );
    if (communeOutOfPerimeters.length > 0) {
      return {
        updateStatus: StatusUpdateEnum.REJECTED,
        updateRejectionReason: `Les codes commune ${communeOutOfPerimeters.join(', ')} sont en dehors du périmètre`,
      };
    }
    // ON CHECK SI LE HASH DU FICHIER EST LE MEME QUE L'ANCIEN
    if (currentFileHash && newFileHash === currentFileHash) {
      return {
        updateStatus: StatusUpdateEnum.UNCHANGED,
        fileId: currentFileId,
        fileHash: currentFileHash,
        dataHash: currentDataHash, // On considère que le dataHash est inchangé
      };
    }
    // ON CHECK SI LE HASH DE LA DONNEE EST LE MEME QUE L'ANCIEN
    const dataHash = await signData(result.rows.map((r) => r.rawValues));
    if (currentDataHash && currentDataHash === dataHash) {
      return {
        updateStatus: StatusUpdateEnum.UNCHANGED,
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
      result.rows,
      organization,
    );

    return {
      updateStatus: StatusUpdateEnum.UPDATED,
      fileId: newFileId,
      fileHash: newFileHash,
      dataHash,
    };
  }
}
