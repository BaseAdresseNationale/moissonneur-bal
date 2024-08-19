import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  Entity,
  Index,
  OneToMany,
  CreateDateColumn,
  DeleteDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { IdEntity } from '../../lib/class/id.entity';
import { Perimeter } from './perimeters.entity';
import { Source } from '../source/source.entity';

@Entity({ name: 'organizations' })
export class Organization extends IdEntity {
  @ApiProperty()
  @Column('text', { nullable: false })
  name: string;

  @ApiProperty()
  @Column('text', { nullable: false })
  page: string;

  @ApiProperty()
  @Column('text', { nullable: false })
  logo: string;

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
