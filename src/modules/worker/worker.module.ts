import { Module } from '@nestjs/common';

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
  ],
  controllers: [],
  providers: [UpdateSourceOrganisationWorker, WorkerService],
})
export class WorkerModule {}
