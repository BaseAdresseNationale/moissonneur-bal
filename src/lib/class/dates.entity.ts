import { ApiProperty } from '@nestjs/swagger';
import {
  CreateDateColumn,
  DeleteDateColumn,
  Index,
  UpdateDateColumn,
} from 'typeorm';

export class DatesEntity {
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
}
