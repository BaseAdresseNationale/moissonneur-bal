import { Injectable } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { UpdateSourceOrganisationWorker } from './workers/update_source_organization.worker';
import { HarvestingWorker } from './workers/harvesting.worker';

// {
//   name: 'Mise à jour des sources de données',
//   every: '5m',
//   handler: updateSources
// },
// {
//   name: 'Nettoyage des moissonnages bloqués',
//   every: '2m',
//   handler: cleanStalledHarvests
// },
// {
//   name: 'Moissonnage automatique des sources (nouvelles et anciennes)',
//   every: '1h',
//   handler: harvestNewOrOutdated
// },
// {
//   name: 'Moissonnage à la demande',
//   every: '30s',
//   handler: harvestAsked
// }

@Injectable()
export class WorkerService {
  constructor(
    private readonly updateSourceOrganisationWorker: UpdateSourceOrganisationWorker,
    private readonly harvestingWorker: HarvestingWorker,
  ) {
    this.updateSourceOrganization();
  }

  // Every 5min
  // @Interval(300000)
  async updateSourceOrganization() {
    // Mise à jour des sources de données
    await this.updateSourceOrganisationWorker.run();
  }

  // Every 1hours
  async runHarvesting() {
    // Moissonnage automatique des sources (nouvelles et anciennes)
    await this.harvestingWorker.run();
  }
}
