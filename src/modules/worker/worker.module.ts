import { Logger, Module } from '@nestjs/common';

import { WorkerService } from './worker.service';
import { HttpModule } from '@nestjs/axios';
import { UpdateSourceOrganisationWorker } from './workers/update_source_organization.worker';
import { OrganizationModule } from '../organization/organization.module';
import { ConfigModule } from '@nestjs/config';
import { SourceModule } from '../source/source.module';
import { HarvestModule } from '../harvest/harvest.module';
import { FileModule } from '../file/file.module';
import { RevisionModule } from '../revision/revision.module';
import { ApiDepotModule } from '../api_depot/api_depot.module';
import { ApiBetaGouvModule } from '../api_beta_gouv/api_beta_gouv.module';
import { HarvestingWorker } from './workers/harvesting.worker';
import { HandleFile } from './workers/harvesting/handle_file';
import { HandleCommune } from './workers/harvesting/handle_commune';
import { QueueModule } from '../queue/queue.module';
import { CleanStalledWorker } from './workers/clean_stalled_harvests.worker';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ConfigModule,
    HttpModule,
    OrganizationModule,
    SourceModule,
    HarvestModule,
    FileModule,
    RevisionModule,
    ApiDepotModule,
    ApiBetaGouvModule,
    QueueModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [],
  providers: [
    ...(process.env.MODE === 'api' ? [] : [WorkerService]),
    UpdateSourceOrganisationWorker,
    HarvestingWorker,
    CleanStalledWorker,
    HandleFile,
    HandleCommune,
    Logger,
  ],
  exports: [HarvestingWorker],
})
export class WorkerModule {}
