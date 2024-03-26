import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Harvest, StatusHarvestEnum } from './harvest.schema';

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

  async getLastCompletedHarvest(sourceId: string) {
    return this.harvestModel.findOne(
      { sourceId, status: StatusHarvestEnum.COMPLETED },
      { sort: { createdAt: -1 } },
    );
  }

  async finishOne(harvestId: Types.ObjectId, changes: Partial<Harvest>) {
    return this.harvestModel.findOneAndUpdate(
      { _id: harvestId },
      { $set: { ...changes, finishedAt: new Date() } },
      { new: true },
    );
  }
}
