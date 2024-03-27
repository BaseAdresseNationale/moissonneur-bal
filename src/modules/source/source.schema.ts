import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes } from 'mongoose';
import { DateEntity } from 'src/lib/schemas/date-entity.schema';

@Schema({ collection: 'sources' })
export class Source extends DateEntity {
  @Prop({ type: SchemaTypes.String })
  _id: string;

  @Prop({ type: SchemaTypes.String })
  title: string;

  @Prop({ type: SchemaTypes.String })
  url: string;

  @Prop({ type: SchemaTypes.String })
  description: string;

  @Prop({ type: SchemaTypes.String })
  license: string;

  @Prop({ type: SchemaTypes.Boolean })
  enabled?: boolean;

  @Prop({ type: SchemaTypes.Date })
  lastHarvest?: Date;

  @Prop({ type: SchemaTypes.Date, required: false })
  harvestingSince?: Date | null;

  @Prop({ type: SchemaTypes.String })
  organization: string;
}

export const SourceSchema = SchemaFactory.createForClass(Source);
