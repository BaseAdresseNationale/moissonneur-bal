import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  Entity,
  Index,
  ManyToOne,
  JoinColumn,
  OneToMany,
  PrimaryColumn,
} from 'typeorm';
import { Organization } from '../organization/organization.entity';
import { Harvest } from '../harvest/harvest.entity';
import { Revision } from '../revision/revision.entity';
import { DatesEntity } from '../../lib/class/dates.entity';

@Entity({ name: 'sources' })
export class Source extends DatesEntity {
  @ApiProperty()
  @PrimaryColumn('varchar', { length: 24 })
  id?: string;

  @Index('IDX_sources_organization_id')
  @ApiProperty()
  @Column('varchar', { length: 24, name: 'organization_id', nullable: true })
  organizationId?: string;

  @ApiProperty()
  @Column('text', { nullable: false })
  title: string;

  @ApiProperty()
  @Column('text', { nullable: false })
  url: string;

  @ApiProperty()
  @Column('text', { nullable: true })
  description: string;

  @ApiProperty()
  @Column('text', { nullable: true })
  license: string;

  @ApiProperty()
  @Column('boolean', { nullable: true, default: true })
  enabled: boolean;

  @ApiProperty()
  @Column('timestamp', {
    name: 'last_harvest',
    nullable: true,
  })
  lastHarvest: Date;

  @ApiProperty()
  @Column('timestamp', { name: 'harvesting_since', nullable: true })
  harvestingSince: Date;

  @ApiProperty({ type: () => Organization })
  @ManyToOne(() => Organization, (orga) => orga.sources, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'organization_id' })
  organization?: Organization;

  @ApiProperty({ type: () => Harvest, isArray: true })
  @OneToMany(() => Harvest, (h) => h.source)
  harvests?: Harvest[];

  @ApiProperty({ type: () => Revision, isArray: true })
  @OneToMany(() => Revision, (r) => r.source)
  revisions?: Revision[];
}
