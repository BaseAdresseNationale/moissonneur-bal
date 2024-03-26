import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes, Types } from 'mongoose';
import { StatusUpdateEnum } from 'src/lib/types/status_update.enum';

export enum StatusPublicationEnum {
  PUBLISHED = 'published',
  ERROR = 'error',
  NOT_CONFIGURED = 'not-configured',
  PROVIDED_BY_OTHER_CLIENT = 'provided-by-other-client',
  PROVIDED_BY_OTHER_SOURCE = 'provided-by-other-source',
}

@Schema({ _id: false })
export class Publication {
  @Prop({ type: SchemaTypes.String, enum: StatusPublicationEnum })
  status: StatusPublicationEnum;

  @Prop({ type: SchemaTypes.String })
  currentClientId?: string;

  @Prop({ type: SchemaTypes.String })
  currentSourceId?: string;

  @Prop({ type: SchemaTypes.String })
  publishedRevisionId?: string;

  @Prop({ type: SchemaTypes.String })
  errorMessage?: string;
}

export const PublicationSchema = SchemaFactory.createForClass(Publication);

@Schema({ collection: 'revisions' })
export class Revision {
  @Prop({ type: SchemaTypes.ObjectId, auto: true })
  _id: Types.ObjectId;

  @Prop({ type: SchemaTypes.String })
  codeCommune: string;

  @Prop({ type: SchemaTypes.String })
  sourceId: string;

  @Prop({ type: SchemaTypes.ObjectId, required: false })
  harvestId: Types.ObjectId;

  @Prop({ type: SchemaTypes.String, enum: StatusUpdateEnum })
  updateStatus: StatusUpdateEnum;

  @Prop({ type: SchemaTypes.String })
  updateRejectionReason: string;

  @Prop({ type: SchemaTypes.ObjectId, required: false })
  fileId: Types.ObjectId;

  @Prop({ type: SchemaTypes.String, required: false })
  dataHash?: string;

  @Prop({ type: SchemaTypes.Number })
  nbRows: number;

  @Prop({ type: SchemaTypes.Number })
  nbRowsWithErrors?: number;

  @Prop({ type: [SchemaTypes.String] })
  uniqueErrors?: string[];

  @Prop({ type: SchemaTypes.Boolean })
  current?: boolean;

  @Prop({ type: PublicationSchema })
  publication?: Publication;
}

export const RevisionSchema = SchemaFactory.createForClass(Revision);
