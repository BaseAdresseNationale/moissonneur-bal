import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, QueryWithHelpers } from 'mongoose';

import { Organization } from './organization.schema';

@Injectable()
export class OrganizationService {
  constructor(
    @InjectModel(Organization.name)
    private organizationModel: Model<Organization>,
  ) {}

  async findMany(
    filter?: FilterQuery<Organization>,
    selector: Record<string, number> = null,
    limit: number = null,
    offset: number = null,
  ): Promise<Organization[]> {
    const query: QueryWithHelpers<
      Array<Organization>,
      Organization
    > = this.organizationModel.find(filter);

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

  public async findOneOrFail(organizationId: string): Promise<Organization> {
    const organization = await this.organizationModel
      .findOne({ _id: organizationId })
      .lean()
      .exec();

    if (!organization) {
      throw new HttpException(
        `Source ${organizationId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    return organization;
  }

  public async upsert(organization: Partial<Organization>) {
    const now = new Date();

    const upsertResult = await this.organizationModel.findOneAndUpdate(
      { _id: organization._id },
      {
        $set: {
          name: organization.name,
          page: organization.page,
          logo: organization.logo,
          _updated: now,
          _deleted: false,
        },
        $setOnInsert: {
          _id: organization._id,
          perimeters: [],
          _created: now,
        },
      },
      { upsert: true },
    );

    return upsertResult;
  }

  public async updateOne(
    organizationId: string,
    changes: Partial<Organization>,
  ): Promise<Organization> {
    const source: Organization = await this.organizationModel.findOneAndUpdate(
      { _id: organizationId },
      { $set: changes },
      { upsert: true },
    );

    return source;
  }

  public async softDeleteInactive(activeIds: string[]) {
    await this.organizationModel.updateMany(
      { _id: { $nin: activeIds }, _deleted: false },
      { $set: { _deleted: true, _updated: new Date() } },
    );
  }
}
