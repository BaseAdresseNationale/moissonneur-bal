import { Injectable } from '@nestjs/common';
import Papa from 'papaparse';

import { Organization } from '../../../organization/organization.entity';
import { signData } from 'src/lib/utils/signature';
import { getCodeCommune } from './utils';
import { RevisionService } from 'src/modules/revision/revision.service';
import {
  Revision,
  StatusPublicationEnum,
  UpdateStatusRevisionEnum,
} from 'src/modules/revision/revision.entity';
import { FileService } from 'src/modules/file/file.service';
import { ApiDepotService } from 'src/modules/api_depot/api_depot.service';

@Injectable()
export class HandleCommune {
  constructor(
    private revisionService: RevisionService,
    private fileService: FileService,
    private apiDepotService: ApiDepotService,
  ) {}

  async handleCommuneData(
    codeCommune: string,
    currentRevision: Revision,
    sourceId: string,
    harvestId: string,
    rows: Record<string, string>[],
    organization: Organization,
  ) {
    // ON CREER LE SQUELETTE DE LA REVISION
    const newRevision: Partial<Revision> = {
      sourceId,
      codeCommune,
      harvestId,
    };
    // CHECK QUE LE HASH DE LA DATA EST DIFFERNT DE CELUI DE LA DERNIERE REVISION
    const dataHash: string = signData(rows);
    if (currentRevision && currentRevision.dataHash === dataHash) {
      newRevision.updateStatus = UpdateStatusRevisionEnum.UNCHANGED;
      newRevision.fileId = currentRevision.fileId;
      newRevision.dataHash = dataHash;
      // CREER UNE REVISION INCHANGE
      return this.revisionService.createRevision(newRevision);
    }
    // ON CREER LE FICHIER
    const csvData = Papa.unparse(rows, { delimiter: ';' });
    const file: Buffer = Buffer.from(csvData);
    // ON UPLOAD LE FICHIER SUR S3
    const fileId = await this.fileService.writeFile(file);
    // ON SET DES METAS DE LA REVISION EN PLUS
    newRevision.updateStatus = UpdateStatusRevisionEnum.UPDATED;
    newRevision.fileId = fileId;
    newRevision.dataHash = dataHash;

    try {
      // ON ESSAYE DE PUBLIER LA BAL SUR L'API-DEPOT
      newRevision.publication = await this.apiDepotService.publishBal(
        newRevision,
        file,
        organization,
      );
    } catch (error) {
      newRevision.publication = {
        status: StatusPublicationEnum.ERROR,
        errorMessage:
          error.message || 'Erreur durant la publication sur api-depot',
      };
    }

    // CREER UNE REVISION UPDATE
    return this.revisionService.createRevision(newRevision);
  }

  async handleCommunesData(
    sourceId: string,
    harvestId: string,
    rows: Record<string, string>[],
    organization: Organization,
    codesCommunes: string[],
  ) {
    // ON RECUPERE TOUTES LES REVISION COURANTE DE LA SOURCE
    const currentRevisions: Revision[] =
      await this.revisionService.findLastUpdated(sourceId);
    // ON RECUPERE LES CODES COMMUNES TROUVE DANS LE FICHIER

    for (const codeCommune of codesCommunes) {
      // POUR CHAQUE CODE COMMUNE ON RECUPERE SA REVISION COURANTE
      const currentRevision: Revision = currentRevisions.find(
        (r) => r.codeCommune === codeCommune,
      );
      const rowsCommune: Record<string, string>[] = rows.filter(
        (r) => getCodeCommune(r) === codeCommune,
      );
      // CONSTRUIT UNE REVISION PAR COMMUNE
      await this.handleCommuneData(
        codeCommune,
        currentRevision,
        sourceId,
        harvestId,
        rowsCommune,
        organization,
      );
    }
  }
}
