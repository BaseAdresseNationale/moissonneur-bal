import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  Entity,
  Index,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { IdEntity } from '../../lib/class/id.entity';
import { Source } from '../source/source.entity';
import { Harvest } from '../harvest/harvest.entity';
import { ParseError } from 'papaparse';

export enum UpdateStatusRevisionEnum {
  REJECTED = 'rejected',
  UPDATED = 'updated',
  UNCHANGED = 'unchanged',
}

export enum StatusPublicationEnum {
  PUBLISHED = 'published',
  ERROR = 'error',
  NOT_CONFIGURED = 'not-configured',
  PROVIDED_BY_OTHER_CLIENT = 'provided-by-other-client',
  PROVIDED_BY_OTHER_SOURCE = 'provided-by-other-source',
}

export class Publication {
  @ApiProperty({ enum: StatusPublicationEnum, required: false })
  status: StatusPublicationEnum;

  @ApiProperty({ required: false })
  currentClientId?: string;

  @ApiProperty({ required: false })
  currentSourceId?: string;

  @ApiProperty({ required: false })
  publishedRevisionId?: string;

  @ApiProperty({ required: false })
  errorMessage?: string;
}

export class Validation {
  @ApiProperty({ type: Boolean, required: false })
  valid: boolean;

  @ApiProperty()
  parseErrors?: ParseError[];

  @ApiProperty({ type: String, required: false, isArray: true })
  errors?: string[];

  @ApiProperty({ type: String, required: false, isArray: true })
  warnings?: string[];

  @ApiProperty({ type: String, required: false, isArray: true })
  infos?: string[];

  @ApiProperty({ type: Number, required: false })
  rowsCount?: number;
}

@Entity({ name: 'revisions' })
export class Revision extends IdEntity {
  @Index('IDX_revisions_source_id')
  @ApiProperty()
  @Column('varchar', { length: 24, name: 'source_id', nullable: false })
  sourceId?: string;

  @Index('IDX_revisions_harvest_id')
  @ApiProperty()
  @Column('varchar', { length: 24, name: 'harvest_id', nullable: false })
  harvestId?: string;

  @ApiProperty()
  @Column('varchar', { length: 24, name: 'file_id', nullable: true })
  fileId?: string;

  @ApiProperty()
  @Column('text', { nullable: true, name: 'data_hash' })
  dataHash: string;

  @ApiProperty()
  @Column('text', { nullable: true, name: 'code_commune' })
  codeCommune: string;

  @ApiProperty({ enum: UpdateStatusRevisionEnum })
  @Column('enum', {
    enum: UpdateStatusRevisionEnum,
    nullable: true,
    name: 'update_status',
    enumName: 'update_status_revision',
  })
  updateStatus: UpdateStatusRevisionEnum;

  @ApiProperty()
  @Column('text', { nullable: true, name: 'update_rejection_reason' })
  updateRejectionReason: string;

  @ApiProperty({ type: () => Publication })
  @Column('jsonb', { nullable: true })
  publication: Publication | null;

  @ApiProperty({ type: () => Validation })
  @Column('jsonb', { nullable: true })
  validation: Validation | null;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty({ type: () => Harvest })
  @ManyToOne(() => Harvest, (h) => h.revisions)
  @JoinColumn({ name: 'harvest_id' })
  harvest?: Harvest;

  @ApiProperty({ type: () => Source })
  @ManyToOne(() => Source, (s) => s.revisions)
  @JoinColumn({ name: 'source_id' })
  source?: Source;
}
