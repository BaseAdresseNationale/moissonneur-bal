import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { IdEntity } from '../../lib/class/id.entity';
import { Organization } from './organization.entity';

export enum TypePerimeterEnum {
  COMMUNE = 'commune',
  DEPARTEMENT = 'departement',
  EPCI = 'epci',
}

@Entity({ name: 'perimeters' })
export class Perimeter extends IdEntity {
  @Index('IDX_perimeters_organization_id')
  @ApiProperty()
  @Column('varchar', { length: 32, name: 'organization_id', nullable: false })
  organizationId?: string;

  @ApiProperty({ enum: TypePerimeterEnum })
  @Column('enum', {
    enum: TypePerimeterEnum,
    nullable: false,
  })
  type: TypePerimeterEnum;

  @ApiProperty()
  @Column('text', { nullable: false })
  code: string;

  @ApiProperty({ type: () => Organization })
  @ManyToOne(() => Organization, (orga) => orga.perimeters, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'organization_id' })
  organization?: Organization;
}
