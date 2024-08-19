import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  Entity,
  Index,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import { IdEntity } from 'src/lib/class/id.entity';
import { Organization } from '../organization/organization.entity';
import { Harvest } from '../harvest/harvest.entity';
import { Revision } from '../revision/revision.entity';

@Entity({ name: 'sources' })
export class Source extends IdEntity {
  @Index('IDX_sources_organization_id')
  @ApiProperty()
  @Column('varchar', { length: 32, name: 'organization_id', nullable: true })
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
  @Column('date', {
    name: 'last_harvest',
    nullable: true,
  })
  lastHarvest: Date;

  @ApiProperty()
  @Column('date', { name: 'harvestingSince', nullable: true })
  harvestingSince: Date;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Index()
  @ApiProperty()
  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;

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
