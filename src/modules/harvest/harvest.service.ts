import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  FilterQuery,
  Model,
  PipelineStage,
  QueryWithHelpers,
  Types,
} from 'mongoose';
import { sub } from 'date-fns';

import { Harvest, StatusHarvestEnum } from './harvest.schema';
import { StatusUpdateEnum } from 'src/lib/types/status_update.enum';

@Injectable()
export class HarvestService {
  constructor(
    @InjectModel(Harvest.name) private harvestModel: Model<Harvest>,
  ) {}

  async createOne(sourceId: string, startedAt: Date): Promise<Harvest> {
    const harvest = {
      sourceId,
      status: StatusHarvestEnum.ACTIVE,
      startedAt,
    };

    return this.harvestModel.create(harvest);
  }
  public async findOneOrFail(harvestId: string): Promise<Harvest> {
    const harvest = await this.harvestModel
      .findOne({ _id: harvestId })
      .lean()
      .exec();

    if (!harvest) {
      throw new HttpException(
        `Source ${harvestId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    return harvest;
  }

  async findMany(
    filter?: FilterQuery<Harvest>,
    selector: Record<string, number> = null,
    sort: Record<string, any> = null,
    limit: number = null,
    offset: number = null,
  ): Promise<Harvest[]> {
    const query: QueryWithHelpers<
      Array<Harvest>,
      Harvest
    > = this.harvestModel.find(filter);

    if (selector) {
      query.select(selector);
    }
    if (sort) {
      query.sort(sort);
    }
    if (limit) {
      query.limit(limit);
    }
    if (offset) {
      query.skip(offset);
    }

    return query.lean().exec();
  }

  async findErrorBySources(): Promise<
    {
      _id: string;
      status: StatusHarvestEnum;
      updateStatus: StatusUpdateEnum;
    }[]
  > {
    const aggregation: PipelineStage[] = [
      { $sort: { startedAt: 1 } },
      {
        $group: {
          _id: '$sourceId',
          status: { $last: '$status' },
          updateStatus: { $last: '$updateStatus' },
        },
      },
      {
        $match: {
          $or: [
            { status: StatusHarvestEnum.FAILED },
            { updateStatus: StatusUpdateEnum.REJECTED },
          ],
        },
      },
    ];
    return this.harvestModel.aggregate(aggregation);
  }

  async count(filter?: FilterQuery<Harvest>): Promise<number> {
    return this.harvestModel.countDocuments(filter);
  }

  async getLastCompletedHarvest(sourceId: string): Promise<Harvest> {
    return this.harvestModel
      .findOne({ sourceId, status: StatusHarvestEnum.COMPLETED })
      .sort({ finishedAt: 'desc' });
  }

  async finishOne(harvestId: Types.ObjectId, changes: Partial<Harvest>) {
    return this.harvestModel.findOneAndUpdate(
      { _id: harvestId },
      { $set: { ...changes, finishedAt: new Date() } },
      { new: true },
    );
  }

  async deleteStalled() {
    return this.harvestModel.deleteMany({
      status: StatusHarvestEnum.ACTIVE,
      startedAt: { $lt: sub(new Date(), { minutes: 30 }) },
    });
  }
}
