import { Module } from '@nestjs/common';
import { WorkerModule } from './modules/worker/worker.module';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { OrganizationModule } from './modules/organization/organization.module';
import { SourceModule } from './modules/source/source.module';
import { HarvestModule } from './modules/harvest/harvest.module';
import { FileModule } from './modules/file/file.module';
import { RevisionModule } from './modules/revision/revision.module';
import { ApiDepotModule } from './modules/api_depot/api_depot.module';
import { ApiBetaGouvModule } from './modules/api_beta_gouv/api_beta_gouv.module';
import { QueueModule } from './modules/queue/queue.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (config: ConfigService) => ({
        uri: config.get('MONGODB_URL'),
        dbName: config.get('MONGODB_DBNAME'),
      }),
      inject: [ConfigService],
    }),
    WorkerModule,
    OrganizationModule,
    SourceModule,
    HarvestModule,
    FileModule,
    RevisionModule,
    ApiDepotModule,
    ApiBetaGouvModule,
    QueueModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
