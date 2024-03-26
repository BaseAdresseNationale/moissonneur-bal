import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Organization } from './organization.schema';

@Injectable()
export class OrganizationService {
  constructor(
    @InjectModel(Organization.name)
    private organizationModel: Model<Organization>,
  ) {}

  public async findById(organizationId: string): Promise<Organization> {
    return this.organizationModel.findById(organizationId).lean();
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

  public async softDeleteInactive(activeIds: string[]) {
    await this.organizationModel.updateMany(
      { _id: { $nin: activeIds }, _deleted: false },
      { $set: { _deleted: true, _updated: new Date() } },
    );
  }
}
