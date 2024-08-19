import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { Perimeter } from './perimeters.entity';
import { Source } from '../source/source.entity';
import { DatesEntity } from '../../lib/class/dates.entity';

@Entity({ name: 'organizations' })
export class Organization extends DatesEntity {
  @ApiProperty()
  @PrimaryColumn('varchar', { length: 32 })
  id?: string;

  @ApiProperty()
  @Column('text', { nullable: false })
  name: string;

  @ApiProperty()
  @Column('text', { nullable: true })
  page: string;

  @ApiProperty()
  @Column('text', { nullable: true })
  logo: string;

  @ApiProperty({ type: () => Perimeter, isArray: true })
  @OneToMany(() => Perimeter, (perimeter) => perimeter.organization, {
    eager: true,
    cascade: true,
  })
  perimeters?: Perimeter[];

  @ApiProperty({ type: () => Source, isArray: true })
  @OneToMany(() => Source, (s) => s.organization)
  sources?: Source[];
}
