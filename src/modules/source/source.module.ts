import { MiddlewareConsumer, Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { SourceService } from './source.service';
import { SourceSchema, Source } from './source.schema';
import { SourceMiddleware } from './source.middleware';
import { SourceController } from './source.controller';
import { ConfigModule } from '@nestjs/config';
import { RevisionModule } from '../revision/revision.module';
import { HarvestModule } from '../harvest/harvest.module';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([{ name: Source.name, schema: SourceSchema }]),
    forwardRef(() => RevisionModule),
    forwardRef(() => HarvestModule),
  ],
  providers: [SourceService],
  controllers: [],
  exports: [SourceService],
})
export class SourceModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(SourceMiddleware).forRoutes(SourceController);
  }
}
