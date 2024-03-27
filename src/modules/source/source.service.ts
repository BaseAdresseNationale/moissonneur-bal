import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, QueryWithHelpers } from 'mongoose';
import { sub } from 'date-fns';

import { Source } from './source.schema';

@Injectable()
export class SourceService {
  constructor(@InjectModel(Source.name) private sourceModel: Model<Source>) {}

  async findMany(
    filter?: FilterQuery<Source>,
    selector: Record<string, number> = null,
    limit: number = null,
    offset: number = null,
  ): Promise<Source[]> {
    const query: QueryWithHelpers<
      Array<Source>,
      Source
    > = this.sourceModel.find(filter);

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

  public async findOneOrFail(sourceId: string): Promise<Source> {
    const voie = await this.sourceModel
      .findOne({ _id: sourceId })
      .lean()
      .exec();

    if (!voie) {
      throw new HttpException(
        `Source ${sourceId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    return voie;
  }

  public async updateOne(
    sourceId: string,
    changes: Partial<Source>,
  ): Promise<Source> {
    const source: Source = await this.sourceModel.findOneAndUpdate(
      { _id: sourceId },
      { $set: changes },
      { upsert: true },
    );

    return source;
  }

  public async upsert(source: Partial<Source>) {
    const now = new Date();

    const upsertResult = await this.sourceModel.findOneAndUpdate(
      { _id: source._id },
      {
        $set: {
          ...source,
          _deleted: false,
        },
        $setOnInsert: {
          enabled: true,
          _created: now,
          lastHarvest: new Date('1970-01-01'),
          harvestingSince: null,
        },
      },
      { upsert: true },
    );

    return upsertResult;
  }

  public async softDeleteInactive(activeIds: string[]) {
    await this.sourceModel.updateMany(
      { _id: { $nin: activeIds }, _deleted: false },
      { $set: { _deleted: true, _updated: new Date() } },
    );
  }

  public async findSourcesToHarvest() {
    // RECUPERE LES SOURCE QUI N'ONT PAS ETE MOISSONEE DEPUIS 24H
    return this.sourceModel.find({
      _deleted: false,
      enabled: true,
      harvestingSince: null,
      lastHarvest: { $lt: sub(new Date(), { hours: 24 }) },
    });
  }

  async startHarvesting(sourceId: string, harvestingSince: Date) {
    // On tente de basculer la source en cours de moissonnage
    return await this.sourceModel.findOneAndUpdate(
      {
        _id: sourceId,
        enabled: true,
        _deleted: false,
        harvestingSince: null,
      },
      { $set: { harvestingSince } },
      { new: true },
    );
  }

  async finishHarvesting(sourceId: string, lastHarvest: Date) {
    // On tente de basculer la source en cours de moissonnage
    return await this.sourceModel.findOneAndUpdate(
      { _id: sourceId },
      { $set: { harvestingSince: null, lastHarvest } },
      { new: true },
    );
  }

  async finishStalledHarvesting() {
    return this.sourceModel.updateMany(
      {
        harvestingSince: { $lt: sub(new Date(), { minutes: 30 }) },
      },
      { $set: { harvestingSince: null } },
    );
  }
}
