import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { SchemaTypes, Types } from 'mongoose';
import { StatusUpdateEnum } from 'src/lib/types/status_update.enum';

export enum StatusHarvestEnum {
  COMPLETED = 'completed',
  ACTIVE = 'active',
  FAILED = 'failed',
}

@Schema({ collection: 'harvests' })
export class Harvest {
  @Prop({ type: SchemaTypes.ObjectId, auto: true })
  @ApiProperty({ type: String, required: false })
  _id: Types.ObjectId;

  @Prop({ type: SchemaTypes.String })
  @ApiProperty({ required: false })
  sourceId: string;

  @Prop({ type: SchemaTypes.String, enum: StatusHarvestEnum })
  @ApiProperty({ enum: StatusHarvestEnum, required: false })
  status: StatusHarvestEnum;

  @Prop({ type: SchemaTypes.String })
  @ApiProperty({ required: false })
  error: string;

  @Prop({ type: SchemaTypes.String, enum: StatusUpdateEnum })
  @ApiProperty({ enum: StatusUpdateEnum, required: false })
  updateStatus: StatusUpdateEnum;

  @Prop({ type: SchemaTypes.String })
  @ApiProperty({ required: false })
  updateRejectionReason: string;

  @Prop({ type: SchemaTypes.Date })
  @ApiProperty({ required: false })
  startedAt?: Date;

  @Prop({ type: SchemaTypes.Date })
  @ApiProperty({ required: false })
  finishedAt?: Date;

  @Prop({ type: SchemaTypes.ObjectId, required: false })
  @ApiProperty({ type: String, required: false })
  fileId: Types.ObjectId;

  @Prop({ type: SchemaTypes.String, required: false })
  @ApiProperty({ required: false })
  fileHash?: string;

  @Prop({ type: SchemaTypes.String, required: false })
  @ApiProperty({ required: false })
  dataHash?: string;
}

export const HarvestSchema = SchemaFactory.createForClass(Harvest);
