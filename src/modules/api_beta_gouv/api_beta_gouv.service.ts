import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosError, AxiosRequestConfig } from 'axios';
import { catchError, firstValueFrom } from 'rxjs';
import {
  DatasetDataGouv,
  OrganizationDataGouv,
  RessourceDataGouv,
  PageDataGouv,
} from './api_beta_gouv.type';

const PAGE_SIZE = 100;
const TAG = 'base-adresse-locale';
const FORMAT = 'csv';
const BADGE_CERTIFIED = 'certified';
const BADGES_ONE_OF_REQUIRED = ['local-authority', 'public-service'];

@Injectable()
export class ApiBetaGouvService {
  constructor(private readonly httpService: HttpService) {}

  private isCertifiedOrganization(organization: OrganizationDataGouv): boolean {
    const { badges } = organization;

    return (
      badges.some(({ kind }) => kind === BADGE_CERTIFIED) &&
      BADGES_ONE_OF_REQUIRED.some((badge: string) =>
        badges.some(({ kind }) => kind === badge),
      )
    );
  }

  private isValidateOrganization(organization: OrganizationDataGouv): boolean {
    if (!organization.id || !organization.name || !organization.badges) {
      return false;
    }
    return this.isCertifiedOrganization(organization);
  }

  public isCSV(resource: RessourceDataGouv) {
    return resource.format === 'csv' || resource.url.endsWith('csv');
  }

  // RECUPERE 100 PAR 100 LES DATASET QUI ONT LE TAG base-adresse-locale ET FORMAT csv
  // https://www.data.gouv.fr/api/1/datasets/?tag=base-adresse-locale&format=csv&page_size=100&page=1
  public async getDatasets(page = 1): Promise<DatasetDataGouv[]> {
    const url = `/datasets/?tag=${TAG}&format=${FORMAT}&page_size=${PAGE_SIZE}&page=${page}`;
    const options: AxiosRequestConfig = {
      responseType: 'json',
      headers: {
        'X-fields':
          'total,data{id,title,description,archived,license,organization{id,name,page,logo,badges},resources{id,format,url,last_modified}}',
      },
    };

    const { data } = await firstValueFrom(
      this.httpService.get<PageDataGouv>(url, options).pipe(
        catchError((error: AxiosError) => {
          throw error;
        }),
      ),
    );
    // FILTER DATASETS
    const datasets = data.data.filter(
      (d) =>
        d.resources.some((r) => this.isCSV(r)) &&
        d.organization &&
        !d.archived &&
        this.isValidateOrganization(d.organization),
    );

    if (data.total > page * PAGE_SIZE) {
      return [...datasets, ...(await this.getDatasets(page + 1))];
    }

    return datasets;
  }
}
