import { MiddlewareConsumer, Module, forwardRef } from '@nestjs/common';

import { HarvestService } from './harvest.service';
import { HarvestMiddleware } from './harvest.middleware';
import { HarvestController } from './harvest.controller';
import { ConfigModule } from '@nestjs/config';
import { RevisionModule } from '../revision/revision.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Harvest } from './harvest.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Harvest]),
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
