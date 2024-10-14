import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Organization } from './organization.entity';
import {
  FindOptionsSelect,
  FindOptionsWhere,
  In,
  Not,
  Repository,
} from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class OrganizationService {
  constructor(
    @InjectRepository(Organization)
    private organizationsRepository: Repository<Organization>,
  ) {}

  async findMany(
    where: FindOptionsWhere<Organization>,
    select?: FindOptionsSelect<Organization>,
  ): Promise<Organization[]> {
    return this.organizationsRepository.find({
      where,
      ...(select && { select }),
    });
  }

  public async findOneOrFail(organizationId: string): Promise<Organization> {
    const where: FindOptionsWhere<Organization> = {
      id: organizationId,
    };
    const organization = await this.organizationsRepository.findOne({
      where,
      withDeleted: true,
    });

    if (!organization) {
      throw new HttpException(
        `Organization ${organizationId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    return organization;
  }

  public async upsert(payload: Partial<Organization>): Promise<void> {
    const where: FindOptionsWhere<Organization> = {
      id: payload.id,
    };
    const organization = await this.organizationsRepository.findOne({
      where,
      withDeleted: true,
    });

    if (organization) {
      if (organization.deletedAt) {
        await this.organizationsRepository.restore({ id: organization.id });
      }
      await this.organizationsRepository.update(
        { id: organization.id },
        {
          name: payload.name,
          page: payload.page,
          logo: payload.logo,
        },
      );
    } else {
      const entityToSave: Organization =
        this.organizationsRepository.create(payload);
      await this.organizationsRepository.save(entityToSave);
    }
  }

  public async updateOne(
    organizationId: string,
    changes: Partial<Organization>,
  ): Promise<Organization> {
    console.log(changes);

    const numeroToSave: Organization = this.organizationsRepository.create({
      id: organizationId,
      ...changes,
    });

    return this.organizationsRepository.save(numeroToSave);
  }

  public async softDeleteInactive(activeIds: string[]) {
    await this.organizationsRepository.softDelete({ id: Not(In(activeIds)) });
  }
}
