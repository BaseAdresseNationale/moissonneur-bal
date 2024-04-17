import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  Aggregate,
  FilterQuery,
  Model,
  PipelineStage,
  QueryWithHelpers,
} from 'mongoose';

import { Revision } from './revision.schema';
import { StatusUpdateEnum } from 'src/lib/types/status_update.enum';

@Injectable()
export class RevisionService {
  constructor(
    @InjectModel(Revision.name) private revisionModel: Model<Revision>,
  ) {}

  public async findOneOrFail(revisionId: string): Promise<Revision> {
    const revision = await this.revisionModel
      .findOne({ _id: revisionId })
      .lean()
      .exec();

    if (!revision) {
      throw new HttpException(
        `Source ${revisionId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    return revision;
  }

  async findMany(
    filter?: FilterQuery<Revision>,
    selector: Record<string, number> = null,
    limit: number = null,
    offset: number = null,
  ): Promise<Revision[]> {
    const query: QueryWithHelpers<
      Array<Revision>,
      Revision
    > = this.revisionModel.find(filter);

    if (selector) {
      query.select(selector);
    }
    if (limit) {
      query.limit(limit);
    }
    if (offset) {
      query.skip(offset);
    }

    return query.lean().exec();
  }

  public async updateOne(
    revisionId: string,
    changes: Partial<Revision>,
  ): Promise<Revision> {
    const revision: Revision = await this.revisionModel.findOneAndUpdate(
      { _id: revisionId },
      { $set: changes },
      { upsert: true },
    );

    return revision;
  }

  async aggregate(aggregation?: PipelineStage[]): Promise<Aggregate<any>> {
    return this.revisionModel.aggregate(aggregation);
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
