import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { sub } from 'date-fns';

import {
  Harvest,
  StatusHarvestEnum,
  UpdateStatusHarvestEnum,
} from './harvest.entity';
import {
  FindOptionsOrder,
  FindOptionsWhere,
  LessThan,
  Repository,
} from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class HarvestService {
  constructor(
    @InjectRepository(Harvest)
    private harvestsRepository: Repository<Harvest>,
  ) {}

  async createOne(sourceId: string, startedAt: Date): Promise<Harvest> {
    const harvest = {
      sourceId,
      status: StatusHarvestEnum.ACTIVE,
      startedAt,
    };
    const entityToSave = await this.harvestsRepository.create(harvest);
    return this.harvestsRepository.save(entityToSave);
  }

  public async findOneOrFail(harvestId: string): Promise<Harvest> {
    const where: FindOptionsWhere<Harvest> = {
      id: harvestId,
    };
    const harvest = await this.harvestsRepository.findOne({
      where,
      withDeleted: true,
    });

    if (!harvest) {
      throw new HttpException(
        `Source ${harvestId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    return harvest;
  }

  public async findMany(
    where: FindOptionsWhere<Harvest>,
    limit?: number,
    offset?: number,
    order?: FindOptionsOrder<Harvest>,
  ): Promise<Harvest[]> {
    return this.harvestsRepository.find({
      where,
      ...(limit && { take: limit }),
      ...(offset && { skip: offset }),
      ...(order && { order }),
    });
  }

  async findSourcesIdError(): Promise<string[]> {
    const sourceIds: { source_id: string }[] = await this.harvestsRepository
      .createQueryBuilder()
      .select('source_id')
      .distinctOn(['source_id'])
      .orderBy('source_id, start_at', 'DESC')
      .where('status = :status OR update_status = :updateStatus', {
        status: StatusHarvestEnum.FAILED,
        updateStatus: UpdateStatusHarvestEnum.REJECTED,
      })
      .getRawMany();

    return sourceIds.map(({ source_id }) => source_id);
  }

  async count(filter?: FindOptionsWhere<Harvest>): Promise<number> {
    return this.harvestsRepository.countBy(filter);
  }

  async getLastCompletedHarvest(sourceId: string): Promise<Harvest> {
    return this.harvestsRepository.findOne({
      where: { sourceId, status: StatusHarvestEnum.COMPLETED },
      order: { finishedAt: 'desc' },
    });
  }

  async finishOne(harvestId: string, changes: Partial<Harvest>): Promise<void> {
    await this.harvestsRepository.update(
      { id: harvestId },
      { ...changes, finishedAt: new Date() },
    );
  }

  async deleteStalled() {
    return this.harvestsRepository.delete({
      status: StatusHarvestEnum.ACTIVE,
      startedAt: LessThan(sub(new Date(), { minutes: 30 })),
    });
  }
}
