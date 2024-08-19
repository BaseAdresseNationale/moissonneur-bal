import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { IdEntity } from 'src/lib/class/id.entity';
import { Organization } from './organization.entity';

export enum TypeNumerotationEnum {
  NUMERIQUE = 'numerique',
  METRIQUE = 'metrique',
}

@Entity({ name: 'pertimeters' })
export class Perimeter extends IdEntity {
  @Index('IDX_perimeters_organization_id')
  @ApiProperty()
  @Column('varchar', { length: 32, name: 'organization_id', nullable: true })
  toponymeId?: string;

  @ApiProperty()
  @Column('text', { nullable: false })
  type: string;

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
