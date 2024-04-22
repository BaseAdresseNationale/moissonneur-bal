import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, PipelineStage, QueryWithHelpers } from 'mongoose';

import { Revision, StatusPublicationEnum } from './revision.schema';
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
}
