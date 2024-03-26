import { Injectable } from '@nestjs/common';
import { Source } from '../../source/source.schema';
import { Organization } from '../../organization/organization.schema';
import { OrganizationService } from '../../organization/organization.service';
import { SourceService } from '../../source/source.service';
import { HarvestService } from 'src/modules/harvest/harvest.service';
import { HttpService } from '@nestjs/axios';
import { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { catchError, firstValueFrom } from 'rxjs';
import { Harvest, StatusHarvestEnum } from 'src/modules/harvest/harvest.schema';
import { HandleFile } from './harvesting/handle_file';
import { Worker } from 'src/modules/queue/queue.service';

@Injectable()
export class HarvestingWorker implements Worker {
  constructor(
    private readonly httpService: HttpService,
    private handleFile: HandleFile,
    private organizationService: OrganizationService,
    private sourceService: SourceService,
    private harvestService: HarvestService,
  ) {}

  async fetchfileBal(url: string): Promise<Buffer> {
    const options: AxiosRequestConfig = {
      responseType: 'arraybuffer',
      timeout: 300000,
    };

    const { data, status, headers }: AxiosResponse = await firstValueFrom(
      this.httpService.get<Buffer>(url, options).pipe(
        catchError((error: AxiosError) => {
          console.error('error', error);
          throw error;
        }),
      ),
    );

    if (status !== 200) {
      throw new Error('Not valid response code: ' + status);
    }

    if (
      headers['content-type'] &&
      headers['content-type'].includes('text/html')
    ) {
      throw new Error('Not valid content-type: ' + headers['content-type']);
    }

    if (!data || data.length === 0) {
      throw new Error('Empty body');
    }

    return data;
  }

  async harvestingSource(source: Source, activeHarvest: Harvest) {
    try {
      // RECUPERE LE DERNIER MOISSONAGE COMPLET
      const lastCompletedHarvest: Partial<Harvest> =
        (await this.harvestService.getLastCompletedHarvest(source._id)) || {};
      // RECUPERE L'ORGANIZATION
      const organization: Organization =
        await this.organizationService.findOneOrFail(source.organizationId);
      // FETCH LE FICHIER
      const file: Buffer = await this.fetchfileBal(source.url);
      // CHECK LE FICHIER ET CREER LES DIFFERENTES REVISIONS
      const newHarvest: Partial<Harvest> = await this.handleFile.handleNewFile(
        file,
        source._id,
        activeHarvest._id,
        lastCompletedHarvest,
        organization,
      );
      return { ...newHarvest, status: StatusHarvestEnum.COMPLETED };
    } catch (error) {
      console.error(error);
      return { error: error.message, status: StatusHarvestEnum.FAILED };
    }
  }

  async harvestingOneSource(sourceId: string) {
    const startedAt: Date = new Date();
    // POUR CHAQUE SOURCE ON LOCK POUR PAS QU'IL Y AI PAS D'AUTRE HARVEST EN MEME TEMPS
    const source = await this.sourceService.startHarvesting(
      sourceId,
      startedAt,
    );
    // SI LA SOURCE N'EXISTE PAS CEST QUELLE EST DEJA MOISSONNE
    if (source) {
      const newHarvest = await this.harvestService.createOne(
        sourceId,
        startedAt,
      );
      // DOWNLOAD DU FICHIER ET CREATION DES DIFFERENTES REVISIONS
      const changes = await this.harvestingSource(source, newHarvest);
      // SET SI LE HARVEST A REUSSI OU ECHOUE ET SET finishedAt
      await this.harvestService.finishOne(newHarvest._id, changes);
      // DELOCK LE HARVESTING ET SET LA DATE DU MOISSONAGE QUI VIENT DAVOIR LIEU
      await this.sourceService.finishHarvesting(sourceId, startedAt);
    } else {
      console.error(`La source ${sourceId} a deja un moissonnage en cours`);
    }
  }

  async harvestingMultiSources() {
    // RECUPERE LES SOURCE QUI N'ONT PAS ETE MOISSONEE DEPUIS 24H
    const sourcesToHarvest: Source[] =
      await this.sourceService.findSourcesToHarvest();

    for (const { _id } of sourcesToHarvest) {
      await this.harvestingOneSource(_id);
    }
  }

  async run(sourceId: string = null) {
    if (sourceId) {
      await this.harvestingOneSource(sourceId);
    } else {
      await this.harvestingMultiSources();
    }
  }
}
