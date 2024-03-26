import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes, Types } from 'mongoose';
import { DateEntity } from 'src/lib/schemas/date-entity.schema';
import { StatusUpdateEnum } from 'src/lib/types/status_update.enum';

export enum StatusHarvestEnum {
  COMPLETED = 'completed',
  ACTIVE = 'active',
  FAILED = 'failed',
}

@Schema({ collection: 'harvests' })
export class Harvest extends DateEntity {
  @Prop({ type: SchemaTypes.ObjectId, auto: true })
  _id: Types.ObjectId;

  @Prop({ type: SchemaTypes.String })
  sourceId: string;

  @Prop({ type: SchemaTypes.String, enum: StatusHarvestEnum })
  status: StatusHarvestEnum;

  @Prop({ type: SchemaTypes.String })
  error: string;

  @Prop({ type: SchemaTypes.String, enum: StatusUpdateEnum })
  updateStatus: StatusUpdateEnum;

  @Prop({ type: SchemaTypes.String })
  updateRejectionReason: string;

  @Prop({ type: SchemaTypes.Boolean })
  startAt?: Date;

  @Prop({ type: SchemaTypes.Date })
  finishedAt?: Date;

  @Prop({ type: SchemaTypes.ObjectId, required: false })
  fileId: Types.ObjectId;

  @Prop({ type: SchemaTypes.String, required: false })
  fileHash?: string;

  @Prop({ type: SchemaTypes.String, required: false })
  dataHash?: string;
}

export const HarvestSchema = SchemaFactory.createForClass(Harvest);
