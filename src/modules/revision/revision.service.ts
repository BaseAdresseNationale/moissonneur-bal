import {
  HttpException,
  HttpStatus,
  Injectable,
  Inject,
  forwardRef,
} from '@nestjs/common';
import {
  DataSource,
  FindOptionsSelect,
  FindOptionsWhere,
  Repository,
} from 'typeorm';
import { countBy } from 'lodash';

import {
  validate,
  ParseFileType,
  ValidateType,
} from '@ban-team/validateur-bal';
import { Revision, StatusPublicationEnum } from './revision.entity';
import { SourceService } from '../source/source.service';
import { FileService } from '../file/file.service';
import { ApiDepotService } from '../api_depot/api_depot.service';
import { OrganizationService } from '../organization/organization.service';
import { InjectRepository } from '@nestjs/typeorm';
import { UpdateStatusRevisionEnum } from '../revision/revision.entity';

@Injectable()
export class RevisionService {
  constructor(
    private dataSource: DataSource,
    @InjectRepository(Revision)
    private revisionsRepository: Repository<Revision>,
    @Inject(forwardRef(() => SourceService))
    private sourceService: SourceService,
    @Inject(forwardRef(() => OrganizationService))
    private organizationService: OrganizationService,
    @Inject(forwardRef(() => FileService))
    private fileService: FileService,
    @Inject(forwardRef(() => ApiDepotService))
    private apiDepotService: ApiDepotService,
  ) {}

  public async findOneOrFail(revisionId: string): Promise<Revision> {
    const where: FindOptionsWhere<Revision> = {
      id: revisionId,
    };
    const revision = await this.revisionsRepository.findOne({
      where,
      withDeleted: true,
    });

    if (!revision) {
      throw new HttpException(
        `Revision ${revisionId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    return revision;
  }

  async findMany(
    where: FindOptionsWhere<Revision>,
    select?: FindOptionsSelect<Revision>,
  ): Promise<Revision[]> {
    return this.revisionsRepository.find({
      where,
      ...(select && { select }),
    });
  }

  public async updateOne(
    revisionId: string,
    changes: Partial<Revision>,
  ): Promise<Revision> {
    await this.revisionsRepository.update({ id: revisionId }, changes);
    return this.revisionsRepository.findOneBy({
      id: revisionId,
    });
  }

  async findLastUpdated(sourceId: string): Promise<Revision[]> {
    return this.revisionsRepository
      .createQueryBuilder()
      .select()
      .distinctOn(['code_commune'])
      .orderBy('code_commune, created_at', 'DESC')
      .where('source_id = :sourceId', { sourceId })
      .andWhere(
        '((update_status = :updateStatus1 AND publication IS NOT null) OR update_status != :updateStatus2)',
        {
          updateStatus1: UpdateStatusRevisionEnum.UNCHANGED,
          updateStatus2: UpdateStatusRevisionEnum.UNCHANGED,
        },
      )
      .getMany();
  }

  async findErrorBySources(): Promise<Record<string, number>> {
    const sourceIds: { source_id: string }[] = await this.dataSource
      .createQueryBuilder()
      .select('source_id')
      .from((subQuery) => {
        return subQuery
          .select('*')
          .from(Revision, 'revision')
          .distinctOn(['code_commune'])
          .orderBy('code_commune, created_at', 'DESC');
      }, 'res')
      .where(
        "res.publication->>'status' = :status OR res.update_status = :updateStatus",
        {
          status: StatusPublicationEnum.ERROR,
          updateStatus: UpdateStatusRevisionEnum.REJECTED,
        },
      )
      .getRawMany();
    return countBy(sourceIds, ({ source_id }) => source_id);
  }

  public async createRevision(payload: Partial<Revision>): Promise<Revision> {
    const entityToSave: Revision = this.revisionsRepository.create(payload);
    return this.revisionsRepository.save(entityToSave);
  }

  public async publish(
    revision: Revision,
    force: boolean = false,
  ): Promise<Revision> {
    const source = await this.sourceService.findOneOrFail(revision.sourceId);
    const organization = await this.organizationService.findOneOrFail(
      source.organizationId,
    );

    if (
      !force &&
      ![
        StatusPublicationEnum.PUBLISHED,
        StatusPublicationEnum.PROVIDED_BY_OTHER_CLIENT,
        StatusPublicationEnum.PROVIDED_BY_OTHER_SOURCE,
      ].includes(revision.publication.status)
    ) {
      throw new HttpException(
        'La révision ne peut pas être publiée',
        HttpStatus.CONFLICT,
      );
    }

    if (!source.enabled || source.deletedAt) {
      throw new HttpException(
        'La source associée n’est plus active',
        HttpStatus.CONFLICT,
      );
    }

    let file = null;
    try {
      file = await this.fileService.getFile(revision.fileId);
    } catch {
      throw new HttpException(
        'Le fichier BAL associé n’est plus disponible',
        HttpStatus.CONFLICT,
      );
    }

    const validationResult: ParseFileType | ValidateType = await validate(
      file,
      {
        profile: '1.3-relax',
      },
    );

    if (
      !validationResult.parseOk ||
      (validationResult as ValidateType).rows.length !==
        revision.validation.nbRows
    ) {
      throw new HttpException(
        'Problème de cohérence des données : investigation nécessaire',
        HttpStatus.CONFLICT,
      );
    }

    try {
      // ON ESSAYE DE PUBLIER LA BAL SUR L'API-DEPOT
      revision.publication = await this.apiDepotService.publishBal(
        revision,
        file,
        organization,
        { force },
      );
    } catch (error) {
      revision.publication = {
        status: StatusPublicationEnum.ERROR,
        errorMessage: error.message,
      };
    }

    const result: Revision = await this.updateOne(revision.id, {
      publication: revision.publication,
    });

    return result;
  }
}
