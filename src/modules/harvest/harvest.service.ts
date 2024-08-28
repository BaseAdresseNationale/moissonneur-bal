import {
  DataSource,
  FindOptionsOrder,
  FindOptionsWhere,
  LessThan,
  Repository,
} from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { sub } from 'date-fns';

import {
  Harvest,
  StatusHarvestEnum,
  UpdateStatusHarvestEnum,
} from './harvest.entity';

@Injectable()
export class HarvestService {
  constructor(
    private dataSource: DataSource,
    @InjectRepository(Harvest)
    private harvestsRepository: Repository<Harvest>,
  ) {}

  async createOne(sourceId: string, startedAt: Date): Promise<Harvest> {
    const harvest = {
      sourceId,
      status: StatusHarvestEnum.ACTIVE,
      startedAt,
    };
    const entityToSave = this.harvestsRepository.create(harvest);
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
    const sourceIds: { source_id: string }[] = await this.dataSource
      .createQueryBuilder()
      .select('source_id')
      .from((subQuery) => {
        return subQuery
          .select('*')
          .from(Harvest, 'harvest')
          .distinctOn(['source_id'])
          .orderBy('source_id, started_at', 'DESC');
      }, 'res')
      .where('res.status = :status OR res.update_status = :updateStatus', {
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
