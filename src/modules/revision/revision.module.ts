import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { RevisionService } from './revision.service';
import { RevisionSchema, Revision } from './revision.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Revision.name, schema: RevisionSchema },
    ]),
  ],
  providers: [RevisionService],
  controllers: [],
  exports: [RevisionService],
})
export class RevisionModule {}
