import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Revision } from './revision.schema';
import { StatusUpdateEnum } from 'src/lib/types/status_update.enum';

@Injectable()
export class RevisionService {
  constructor(
    @InjectModel(Revision.name) private revisionModel: Model<Revision>,
  ) {}

  public async getCurrentRevisionsBySource(
    sourceId: string,
  ): Promise<Revision[]> {
    return this.revisionModel.find({ sourceId, current: true }).lean();
  }

  public async createRevision(revision: Partial<Revision>): Promise<Revision> {
    // DETERMINE SI LA REVISION QUI VA ETRE CREER VA ETRE LA COURANTE
    const newRevision = {
      ...revision,
      current: [StatusUpdateEnum.UPDATED, StatusUpdateEnum.UNCHANGED].includes(
        revision.updateStatus,
      ),
    };
    // SI LA NOUVELLE REVISION EST COURANTE, LES AUTRE NE LE SONT PLUS
    if (newRevision.current) {
      await this.revisionModel.updateMany(
        { sourceId: revision.sourceId, codeCommune: revision.codeCommune },
        { $set: { current: false } },
      );
    }
    // CREER LA REVISION
    return this.revisionModel.create(newRevision);
  }
}
