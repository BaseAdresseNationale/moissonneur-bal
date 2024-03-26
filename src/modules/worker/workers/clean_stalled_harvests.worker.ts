import { Injectable } from '@nestjs/common';
import { SourceService } from '../../source/source.service';
import { HarvestService } from 'src/modules/harvest/harvest.service';
import { Worker } from 'src/modules/queue/queue.service';

@Injectable()
export class CleanStalledWorker implements Worker {
  constructor(
    private sourceService: SourceService,
    private harvestService: HarvestService,
  ) {}

  async run() {
    await this.sourceService.finishStalledHarvesting();
    await this.harvestService.deleteStalled();
  }
}
