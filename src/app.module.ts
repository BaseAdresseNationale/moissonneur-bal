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
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization } from './modules/organization/organization.entity';
import { Perimeter } from './modules/organization/perimeters.entity';
import { Source } from './modules/source/source.entity';
import { Harvest } from './modules/harvest/harvest.entity';
import { Revision } from './modules/revision/revision.entity';

@Module({
  imports: [
    ConfigModule.forRoot(),
    // MongooseModule.forRootAsync({
    //   imports: [ConfigModule],
    //   useFactory: async (config: ConfigService) => ({
    //     uri: config.get('MONGODB_URL'),
    //     dbName: config.get('MONGODB_DBNAME'),
    //   }),
    //   inject: [ConfigService],
    // }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (config: ConfigService) => ({
        type: 'postgres',
        url: config.get('POSTGRES_URL'),
        keepConnectionAlive: true,
        schema: 'public',
        migrationsRun: true,
        migrations: [],
        entities: [Organization, Perimeter, Source, Harvest, Revision],
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
