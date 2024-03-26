import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { SchemaTypes } from 'mongoose';
import { DateEntity } from 'src/lib/class/dates.schema';

@Schema({ _id: false })
export class Harvesting {
  @Prop({ type: SchemaTypes.Date })
  @ApiProperty({ required: false })
  lastHarvest?: Date;

  @Prop({ type: SchemaTypes.Date, required: false })
  @ApiProperty({ required: false })
  harvestingSince?: Date | null;
}

export const HarvestingSchema = SchemaFactory.createForClass(Harvesting);

@Schema({ collection: 'sources' })
export class Source extends DateEntity {
  @Prop({ type: SchemaTypes.String })
  @ApiProperty({ required: false })
  _id: string;

  @Prop({ type: SchemaTypes.String })
  @ApiProperty({ required: false })
  title: string;

  @Prop({ type: SchemaTypes.String })
  @ApiProperty({ required: false })
  url: string;

  @Prop({ type: SchemaTypes.String })
  @ApiProperty({ required: false })
  description: string;

  @Prop({ type: SchemaTypes.String })
  @ApiProperty({ required: false })
  license: string;

  @Prop({ type: SchemaTypes.Boolean })
  @ApiProperty({ required: false })
  enabled?: boolean;

  @Prop({ type: HarvestingSchema })
  @ApiProperty({ type: () => Harvesting, required: false })
  harvesting?: Harvesting;

  @Prop({ type: SchemaTypes.String })
  @ApiProperty({ required: false })
  organizationId: string;
}

export const SourceSchema = SchemaFactory.createForClass(Source);
