import { MiddlewareConsumer, Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { HarvestService } from './harvest.service';
import { HarvestSchema, Harvest } from './harvest.schema';
import { HarvestMiddleware } from './harvest.middleware';
import { HarvestController } from './harvest.controller';
import { ConfigModule } from '@nestjs/config';
import { RevisionModule } from '../revision/revision.module';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([{ name: Harvest.name, schema: HarvestSchema }]),
    forwardRef(() => RevisionModule),
  ],
  providers: [HarvestService],
  controllers: [HarvestController],
  exports: [HarvestService],
})
export class HarvestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(HarvestMiddleware).forRoutes(HarvestController);
  }
}
