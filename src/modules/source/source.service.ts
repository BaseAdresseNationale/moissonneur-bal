import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  forwardRef,
} from '@nestjs/common';
import { sub } from 'date-fns';

import { RevisionService } from '../revision/revision.service';
import { HarvestService } from '../harvest/harvest.service';
import { ExtendedSourceDTO } from './dto/extended_source.dto';
import { Source } from './source.entity';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FindOptionsSelect,
  FindOptionsWhere,
  In,
  IsNull,
  LessThan,
  Not,
  Repository,
  UpdateResult,
} from 'typeorm';

@Injectable()
export class SourceService {
  constructor(
    @InjectRepository(Source)
    private sourcesRepository: Repository<Source>,
    @Inject(forwardRef(() => RevisionService))
    private revisionService: RevisionService,
    @Inject(forwardRef(() => HarvestService))
    private harvestService: HarvestService,
  ) {}

  async findMany(
    where: FindOptionsWhere<Source>,
    select?: FindOptionsSelect<Source>,
    withDeleted: boolean = false,
  ): Promise<Source[]> {
    return this.sourcesRepository.find({
      where,
      ...(select && { select }),
      withDeleted,
    });
  }

  public async findOneOrFail(sourceId: string): Promise<Source> {
    const where: FindOptionsWhere<Source> = {
      id: sourceId,
    };
    const source = await this.sourcesRepository.findOne({
      where,
      withDeleted: true,
    });

    if (!source) {
      throw new HttpException(
        `Source ${sourceId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    return source;
  }

  public async extendMany(sources: Source[]): Promise<ExtendedSourceDTO[]> {
    const haverstErrorBySourceId: string[] =
      await this.harvestService.findSourcesIdError();

    const revisionErrorBySourceId: Record<string, number> =
      await this.revisionService.findErrorBySources();

    const extendedSources: ExtendedSourceDTO[] = sources.map((s) => {
      return {
        ...s,
        harvestError: haverstErrorBySourceId.includes(s.id),
        nbRevisionError: revisionErrorBySourceId[s.id] || 0,
      };
    });

    return extendedSources;
  }

  public async updateOne(
    sourceId: string,
    changes: Partial<Source>,
  ): Promise<Source> {
    await this.sourcesRepository.update({ id: sourceId }, changes);
    return this.sourcesRepository.findOneBy({
      id: sourceId,
    });
  }

  public async upsert(payload: Partial<Source>): Promise<void> {
    const where: FindOptionsWhere<Source> = {
      id: payload.id,
    };
    const source = await this.sourcesRepository.findOne({
      where,
      withDeleted: true,
    });

    if (source) {
      if (source.deletedAt) {
        await this.sourcesRepository.restore({ id: source.id });
      }
      await this.sourcesRepository.update({ id: source.id }, payload);
    } else {
      const entityToSave: Source = this.sourcesRepository.create({
        ...payload,
        lastHarvest: new Date('1970-01-01'),
        harvestingSince: null,
      });
      await this.sourcesRepository.save(entityToSave);
    }
  }

  public async softDeleteInactive(activeIds: string[]) {
    await this.sourcesRepository.softDelete({ id: Not(In(activeIds)) });
  }

  public async findSourcesToHarvest(): Promise<Source[]> {
    // RECUPERE LES SOURCE QUI N'ONT PAS ETE MOISSONEE DEPUIS 24H
    return this.sourcesRepository.findBy({
      enabled: true,
      harvestingSince: IsNull(),
      lastHarvest: LessThan(sub(new Date(), { hours: 24 })),
    });
  }

  async startHarvesting(
    sourceId: string,
    harvestingSince: Date,
  ): Promise<Source | null> {
    const { affected }: UpdateResult = await this.sourcesRepository.update(
      {
        id: sourceId,
        enabled: true,
        harvestingSince: IsNull(),
      },
      { harvestingSince },
    );
    if (affected > 0) {
      return this.sourcesRepository.findOneBy({ id: sourceId });
    }
    return null;
  }

  async finishHarvesting(sourceId: string, lastHarvest: Date): Promise<void> {
    // On tente de basculer la source en cours de moissonnage
    await this.sourcesRepository.update(
      { id: sourceId },
      {
        harvestingSince: null,
        lastHarvest,
      },
    );
  }

  async finishStalledHarvesting(): Promise<void> {
    await this.sourcesRepository.update(
      {
        harvestingSince: LessThan(sub(new Date(), { minutes: 30 })),
      },
      {
        harvestingSince: null,
      },
    );
  }
}
