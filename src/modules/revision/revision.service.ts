import {
  HttpException,
  HttpStatus,
  Injectable,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { countBy } from 'lodash';

import ValidateurBal from '@ban-team/validateur-bal';
import { Revision, StatusPublicationEnum } from './revision.entity';
import { SourceService } from '../source/source.service';
import { FileService } from '../file/file.service';
import { ApiDepotService } from '../api_depot/api_depot.service';
import { OrganizationService } from '../organization/organization.service';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsSelect, FindOptionsWhere, Repository } from 'typeorm';
import { UpdateStatusEnum } from '../harvest/harvest.entity';

@Injectable()
export class RevisionService {
  constructor(
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
    const revisions: Revision[] = await this.revisionsRepository
      .createQueryBuilder()
      .select('*')
      .distinctOn(['codeCommune'])
      .orderBy('codeCommune, created_at', 'DESC')
      .where('source_id = :sourceId', { sourceId })
      .andWhere(
        '(updateStatus = :updateStatus1 AND publication NOT null) OR updateStatus = :updateStatus2',
        {
          updateStatus1: UpdateStatusEnum.UNCHANGED,
          updateStatus2: UpdateStatusEnum.UNCHANGED,
        },
      )
      .getMany();

    return revisions;
    // const aggregation: PipelineStage[] = [
    //   {
    //     $match: {
    //       sourceId,
    //       $or: [
    //         {
    //           updateStatus: StatusUpdateEnum.UNCHANGED,
    //           publication: { $ne: null },
    //         },
    //         { updateStatus: { $ne: StatusUpdateEnum.UNCHANGED } },
    //       ],
    //     },
    //   },
    // ];
  }

  async findErrorBySources(): Promise<Record<string, number>> {
    const sourceIds: { source_id: string }[] = await this.revisionsRepository
      .createQueryBuilder()
      .select('source_id')
      .distinctOn(['codeCommune'])
      .orderBy('codeCommune, created_at', 'DESC')
      .where('status = :status OR updateStatus = :updateStatus', {
        status: UpdateStatusEnum.UNCHANGED,
        updateStatus: UpdateStatusEnum.UNCHANGED,
      })
      .getRawMany();
    return countBy(sourceIds, ({ source_id }) => source_id);
  }

  public async createRevision(payload: Partial<Revision>): Promise<Revision> {
    const entityToSave: Revision = this.revisionsRepository.create(payload);
    return this.revisionsRepository.create(entityToSave);
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

    const validationResult = await ValidateurBal.validate(file, {
      profile: '1.3-relax',
    });

    if (
      !validationResult.parseOk ||
      validationResult.rows.length !== revision.validation.nbRows
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
