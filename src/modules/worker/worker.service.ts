import { Injectable } from '@nestjs/common';
import { UpdateSourceOrganisationWorker } from './workers/update_source_organization.worker';
import { HarvestingWorker } from './workers/harvesting.worker';
import { QueueService } from '../queue/queue.service';
import { CleanStalledWorker } from './workers/clean_stalled_harvests.worker';
import { Interval } from '@nestjs/schedule';

@Injectable()
export class WorkerService {
  constructor(
    private readonly queueService: QueueService,
    private readonly updateSourceOrganisationWorker: UpdateSourceOrganisationWorker,
    private readonly harvestingWorker: HarvestingWorker,
    private readonly cleanStalledWorker: CleanStalledWorker,
  ) {
    // ON COMMENCE PAR RECUPERE TOUTES LES SOURCES ET ORGANIZATIONS
    this.queueService.pushTask(
      this.updateSourceOrganisationWorker,
      'Update sources and organizations',
    );
    // ON MOISSONNE TOUTES LES SOURCES
    this.queueService.pushTask(this.harvestingWorker, 'Harvesting of sources');
  }

  // Every 5min
  @Interval(300000)
  async updateSourceOrganization() {
    // Mise à jour des sources de données
    this.queueService.pushTask(
      this.updateSourceOrganisationWorker,
      'Update sources and organizations',
    );
  }

  // Every 1hours
  @Interval(300000)
  async runHarvesting() {
    // Moissonnage automatique des sources (nouvelles et anciennes)
    this.queueService.pushTask(this.harvestingWorker, 'Harvesting of sources');
  }

  // Every 2min
  @Interval(300000)
  async cleanStalledHarvesting() {
    // Moissonnage automatique des sources (nouvelles et anciennes)
    this.queueService.pushTask(
      this.cleanStalledWorker,
      'Clean stalled source and harvest',
    );
  }
}
