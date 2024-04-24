import {
  HttpException,
  HttpStatus,
  Injectable,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, PipelineStage, QueryWithHelpers } from 'mongoose';

import ValidateurBal from '@ban-team/validateur-bal';
import { Revision, StatusPublicationEnum } from './revision.schema';
import { SourceService } from '../source/source.service';
import { FileService } from '../file/file.service';
import { ApiDepotService } from '../api_depot/api_depot.service';
import { OrganizationService } from '../organization/organization.service';
import { StatusUpdateEnum } from 'src/lib/types/status_update.enum';

@Injectable()
export class RevisionService {
  constructor(
    @InjectModel(Revision.name) private revisionModel: Model<Revision>,
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

  async findLastUpdated(sourceId: string): Promise<Revision[]> {
    const aggregation: PipelineStage[] = [
      {
        $match: {
          sourceId,
          $or: [
            {
              updateStatus: StatusUpdateEnum.UNCHANGED,
              publication: { $ne: null },
            },
            { updateStatus: { $ne: StatusUpdateEnum.UNCHANGED } },
          ],
        },
      },
      { $sort: { _created: 1 } },
      {
        $group: {
          _id: '$codeCommune',
          id: { $last: '$_id' },
          codeCommune: { $last: '$codeCommune' },
          sourceId: { $last: '$sourceId' },
          harvestId: { $last: '$harvestId' },
          updateStatus: { $last: '$updateStatus' },
          updateRejectionReason: { $last: '$updateRejectionReason' },
          fileId: { $last: '$fileId' },
          dataHash: { $last: '$dataHash' },
          nbRows: { $last: '$nbRows' },
          nbRowsWithErrors: { $last: '$nbRowsWithErrors' },
          uniqueErrors: { $last: '$uniqueErrors' },
          publication: { $last: '$publication' },
          _created: { $last: '$_created' },
        },
      },
    ];
    const sourceAgg: any[] = await this.revisionModel.aggregate(aggregation);
    return sourceAgg.map((r) => ({ ...r, _id: r.id }));
  }

  async findErrorBySources(): Promise<
    {
      _id: string;
      nbErrors: number;
    }[]
  > {
    const aggregation: PipelineStage[] = [
      {
        $group: {
          _id: '$codeCommune',
          sourceId: { $last: '$sourceId' },
          updateStatus: { $last: '$updateStatus' },
          status: { $last: '$publication.status' },
        },
      },
      { $sort: { startedAt: 1 } },
      {
        $match: {
          $or: [
            { status: StatusPublicationEnum.ERROR },
            { updateStatus: StatusUpdateEnum.REJECTED },
          ],
        },
      },
      {
        $group: {
          _id: '$sourceId',
          nbErrors: { $count: {} },
        },
      },
    ];
    return this.revisionModel.aggregate(aggregation);
  }

  public async createRevision(revision: Partial<Revision>): Promise<Revision> {
    return this.revisionModel.create(revision);
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

    if (!source.enabled || source._deleted) {
      throw new HttpException(
        'La source associée n’est plus active',
        HttpStatus.CONFLICT,
      );
    }

    let file = null;
    try {
      file = await this.fileService.getFile(revision.fileId.toHexString());
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
      validationResult.rows.length !== revision.nbRows
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

    const result: Revision = await this.updateOne(revision._id.toHexString(), {
      publication: revision.publication,
    });

    return result;
  }
}
