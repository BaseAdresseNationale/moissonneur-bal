import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { SourceService } from './source.service';
import { SourceSchema, Source } from './source.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Source.name, schema: SourceSchema }]),
  ],
  providers: [SourceService],
  controllers: [],
  exports: [SourceService],
})
export class SourceModule {}
