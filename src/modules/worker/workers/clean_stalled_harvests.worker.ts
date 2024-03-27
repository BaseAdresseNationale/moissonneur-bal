import { Injectable } from '@nestjs/common';
import { SourceService } from '../../source/source.service';
import { HarvestService } from 'src/modules/harvest/harvest.service';
import { Task } from 'src/modules/queue/queue';

@Injectable()
export class CleanStalledWorker implements Task {
  title: string = 'Clean stalled source and harvest';

  constructor(
    private sourceService: SourceService,
    private harvestService: HarvestService,
  ) {}

  async run() {
    await this.sourceService.finishStalledHarvesting();
    await this.harvestService.deleteStalled();
  }
}
