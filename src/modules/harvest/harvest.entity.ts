import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  Entity,
  Index,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { IdEntity } from 'src/lib/class/id.entity';
import { Source } from '../source/source.entity';
import { Revision } from '../revision/revision.entity';

export enum StatusHarvestEnum {
  COMPLETED = 'completed',
  ACTIVE = 'active',
  FAILED = 'failed',
}

export enum UpdateStatusEnum {
  REJECTED = 'rejected',
  UPDATED = 'updated',
  UNCHANGED = 'unchanged',
}

@Entity({ name: 'harvests' })
export class Harvest extends IdEntity {
  @Index('IDX_harvests_source_id')
  @ApiProperty()
  @Column('varchar', { length: 32, name: 'source_id', nullable: false })
  sourceId?: string;

  @ApiProperty()
  @Column('varchar', { length: 32, name: 'file_id', nullable: true })
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

  @ApiProperty({ enum: UpdateStatusEnum })
  @Column('enum', {
    enum: UpdateStatusEnum,
    nullable: true,
    name: 'update_status',
  })
  updateStatus: UpdateStatusEnum;

  @ApiProperty()
  @Column('text', { nullable: true })
  updateRejectionReason: string;

  @ApiProperty()
  @Column('text', { nullable: true })
  error: string;

  @ApiProperty()
  @Column('date', { name: 'start_at', nullable: true })
  startedAt: Date;

  @ApiProperty()
  @Column('date', { name: 'finish_at', nullable: true })
  finishedAt: Date;

  @ApiProperty({ type: () => Source })
  @ManyToOne(() => Source, (s) => s.harvests)
  @JoinColumn({ name: 'source_id' })
  source?: Source;

  @ApiProperty({ type: () => Revision, isArray: true })
  @OneToMany(() => Revision, (r) => r.source)
  revisions?: Revision[];
}
