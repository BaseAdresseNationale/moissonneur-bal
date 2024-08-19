import { ApiProperty } from '@nestjs/swagger';
import { ObjectId } from 'mongodb';
import { BeforeInsert, PrimaryColumn } from 'typeorm';

export class IdEntity {
  @ApiProperty()
  @PrimaryColumn('varchar', { length: 32 })
  id?: string;

  @BeforeInsert()
  generatedObjectId?() {
    this.id = new ObjectId().toHexString();
  }
}
