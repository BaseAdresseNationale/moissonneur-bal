import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
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
  @ApiProperty({ enum: StatusPublicationEnum, required: false })
  status: StatusPublicationEnum;

  @Prop({ type: SchemaTypes.String })
  @ApiProperty({ required: false })
  currentClientId?: string;

  @Prop({ type: SchemaTypes.String })
  @ApiProperty({ required: false })
  currentSourceId?: string;

  @Prop({ type: SchemaTypes.String })
  @ApiProperty({ required: false })
  publishedRevisionId?: string;

  @Prop({ type: SchemaTypes.String })
  @ApiProperty({ required: false })
  errorMessage?: string;
}

export const PublicationSchema = SchemaFactory.createForClass(Publication);

@Schema({ collection: 'revisions' })
export class Revision {
  @Prop({ type: SchemaTypes.ObjectId, auto: true })
  @ApiProperty({ type: String, required: false })
  _id: Types.ObjectId;

  @Prop({ type: SchemaTypes.String })
  @ApiProperty({ required: false })
  codeCommune: string;

  @Prop({ type: SchemaTypes.String })
  @ApiProperty({ required: false })
  sourceId: string;

  @Prop({ type: SchemaTypes.ObjectId, required: false })
  @ApiProperty({ type: String, required: false })
  harvestId: Types.ObjectId;

  @Prop({ type: SchemaTypes.String, enum: StatusUpdateEnum })
  @ApiProperty({ enum: StatusUpdateEnum, required: false })
  updateStatus: StatusUpdateEnum;

  @Prop({ type: SchemaTypes.String })
  @ApiProperty({ required: false })
  updateRejectionReason: string;

  @Prop({ type: SchemaTypes.ObjectId, required: false })
  @ApiProperty({ type: String, required: false })
  fileId: Types.ObjectId;

  @Prop({ type: SchemaTypes.String, required: false })
  @ApiProperty({ required: false })
  dataHash?: string;

  @Prop({ type: SchemaTypes.Number })
  @ApiProperty({ required: false })
  nbRows: number;

  @Prop({ type: SchemaTypes.Number })
  @ApiProperty({ required: false })
  nbRowsWithErrors?: number;

  @Prop({ type: [SchemaTypes.String] })
  @ApiProperty({ required: false })
  uniqueErrors?: string[];

  @Prop({ type: SchemaTypes.Boolean })
  @ApiProperty({ required: false })
  current?: boolean;

  @Prop({ type: PublicationSchema })
  @ApiProperty({ type: () => Publication, required: false })
  publication?: Publication;

  @Prop({ type: SchemaTypes.Date, default: Date.now })
  _created?: Date;
}

export const RevisionSchema = SchemaFactory.createForClass(Revision);
