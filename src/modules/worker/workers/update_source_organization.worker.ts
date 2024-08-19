import { Injectable } from '@nestjs/common';
import { chain, keyBy } from 'lodash';
import {
  DatasetDataGouv,
  OrganizationDataGouv,
} from './../../api_beta_gouv/api_beta_gouv.type';
import { Source } from '../../source/source.entity';
import { Organization } from '../../organization/organization.entity';
import { OrganizationService } from '../../organization/organization.service';
import { SourceService } from '../../source/source.service';
import { ApiBetaGouvService } from 'src/modules/api_beta_gouv/api_beta_gouv.service';
import { Worker } from 'src/modules/queue/queue.service';

@Injectable()
export class UpdateSourceOrganisationWorker implements Worker {
  constructor(
    private apiBetaGouv: ApiBetaGouvService,
    private organizationService: OrganizationService,
    private sourceService: SourceService,
  ) {}

  private getBALUrl(dataset: DatasetDataGouv): string {
    const mostRecentResource = chain(dataset.resources)
      .filter((r) => this.apiBetaGouv.isCSV(r))
      .sortBy('last_modified')
      .reverse()
      .value()[0];

    return mostRecentResource.url;
  }

  private transformDatasetToSource(dataset: DatasetDataGouv): Partial<Source> {
    return {
      id: `datagouv-${dataset.id}`,
      title: dataset.title,
      description: dataset.description || undefined,
      license: dataset.license === 'odc-odbl' ? 'odc-odbl' : 'lov2',
      url: this.getBALUrl(dataset),
      organizationId: dataset.organization.id,
    };
  }

  private transformDatasetToOrganization(
    organization: OrganizationDataGouv,
  ): Partial<Organization> {
    return {
      id: organization.id,
      logo: organization.logo,
      name: organization.name || undefined,
      page: organization.page,
    };
  }

  private async upsertOrgnizations(datasets: DatasetDataGouv[]) {
    const organizations: Partial<Organization>[] = Object.values(
      keyBy(
        datasets.map((d) => d.organization),
        'id',
      ),
    ).map((o: OrganizationDataGouv) => this.transformDatasetToOrganization(o));
    await Promise.all(
      organizations.map(async (o) => this.organizationService.upsert(o)),
    );
    // ARCHIVE LES ORGANIZATIONS QUI N'EXISTE PLUS
    await this.organizationService.softDeleteInactive(
      organizations.map(({ id }) => id),
    );
  }

  private async upsertSources(datasets: DatasetDataGouv[]) {
    const sources: Partial<Source>[] = datasets.map((dataset) =>
      this.transformDatasetToSource(dataset),
    );
    await Promise.all(sources.map(async (s) => this.sourceService.upsert(s)));
    // ARCHIVE LES SOURCES QUI N'EXISTE PLUS
    await this.sourceService.softDeleteInactive(sources.map(({ id }) => id));
  }

  async run() {
    // GET DATASETS FROM DATAGOUV
    const datasets: DatasetDataGouv[] = await this.apiBetaGouv.getDatasets();
    await this.upsertOrgnizations(datasets);
    await this.upsertSources(datasets);
  }
}
