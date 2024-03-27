import { Injectable } from '@nestjs/common';
import { UpdateSourceOrganisationWorker } from './workers/update_source_organization.worker';
import { HarvestingWorker } from './workers/harvesting.worker';
import { QueueService } from '../queue/queue.service';
import { CleanStalledWorker } from './workers/clean_stalled_harvests.worker';

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
    private readonly queueService: QueueService,
    private readonly updateSourceOrganisationWorker: UpdateSourceOrganisationWorker,
    private readonly harvestingWorker: HarvestingWorker,
    private readonly cleanStalledWorker: CleanStalledWorker,
  ) {
    // ON COMMENCE PAR RECUPERE TOUTES LES SOURCES ET ORGANIZATIONS
    this.queueService.pushTask(this.updateSourceOrganisationWorker);
    // ON MOISSONNE TOUTES LES SOURCES
    this.queueService.pushTask(this.harvestingWorker);
  }

  // Every 5min
  // @Interval(300000)
  async updateSourceOrganization() {
    // Mise à jour des sources de données
    this.queueService.pushTask(this.updateSourceOrganisationWorker);
  }

  // Every 1hours
  // @Interval(300000)
  async runHarvesting() {
    // Moissonnage automatique des sources (nouvelles et anciennes)
    this.queueService.pushTask(this.harvestingWorker);
  }

  // Every 2min
  // @Interval(300000)
  async cleanStalledHarvesting() {
    // Moissonnage automatique des sources (nouvelles et anciennes)
    this.queueService.pushTask(this.cleanStalledWorker);
  }
}
