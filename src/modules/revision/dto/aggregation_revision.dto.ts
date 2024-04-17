import { ApiProperty } from '@nestjs/swagger';
import { Revision } from '../revision.schema';
import { Types } from 'mongoose';

export class AggregateRevision extends Revision {
  @ApiProperty({ type: String, required: false })
  id: Types.ObjectId;
}
