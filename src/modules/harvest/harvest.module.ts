import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { HarvestService } from './harvest.service';
import { HarvestSchema, Harvest } from './harvest.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Harvest.name, schema: HarvestSchema }]),
  ],
  providers: [HarvestService],
  controllers: [],
  exports: [HarvestService],
})
export class HarvestModule {}
