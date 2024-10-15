import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  Entity,
  Index,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { IdEntity } from '../../lib/class/id.entity';
import { Source } from '../source/source.entity';
import { Revision } from '../revision/revision.entity';

export enum StatusHarvestEnum {
  COMPLETED = 'completed',
  ACTIVE = 'active',
  FAILED = 'failed',
}

export enum UpdateStatusHarvestEnum {
  REJECTED = 'rejected',
  UPDATED = 'updated',
  UNCHANGED = 'unchanged',
}

@Entity({ name: 'harvests' })
export class Harvest extends IdEntity {
  @Index('IDX_harvests_source_id')
  @ApiProperty()
  @Column('varchar', { length: 24, name: 'source_id', nullable: false })
  sourceId?: string;

  @ApiProperty()
  @Column('varchar', { length: 24, name: 'file_id', nullable: true })
  fileId?: string;

  @ApiProperty()
  @Column('text', { nullable: true, name: 'file_hash' })
  fileHash: string;

  @ApiProperty()
  @Column('text', { nullable: true, name: 'data_hash' })
  dataHash: string;

  @ApiProperty({ enum: StatusHarvestEnum })
  @Column('enum', {
    enum: StatusHarvestEnum,
    default: StatusHarvestEnum.ACTIVE,
  })
  status: StatusHarvestEnum;

  @ApiProperty({ enum: UpdateStatusHarvestEnum })
  @Column('enum', {
    enum: UpdateStatusHarvestEnum,
    nullable: true,
    name: 'update_status',
    enumName: 'update_status_harvest',
  })
  updateStatus: UpdateStatusHarvestEnum;

  @ApiProperty()
  @Column('text', { nullable: true, name: 'update_rejection_reason' })
  updateRejectionReason: string;

  @ApiProperty()
  @Column('text', { nullable: true })
  error: string;

  @ApiProperty()
  @Column('timestamp', { name: 'started_at', nullable: true })
  startedAt: Date;

  @ApiProperty()
  @Column('timestamp', { name: 'finished_at', nullable: true })
  finishedAt: Date;

  @ApiProperty({ type: () => Source })
  @ManyToOne(() => Source, (s) => s.harvests)
  @JoinColumn({ name: 'source_id' })
  source?: Source;

  @ApiProperty({ type: () => Revision, isArray: true })
  @OneToMany(() => Revision, (r) => r.source)
  revisions?: Revision[];
}
