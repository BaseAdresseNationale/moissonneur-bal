import { ApiProperty } from '@nestjs/swagger';

export class PageDTO<T> {
  @ApiProperty({ required: true, nullable: false })
  offset: number;

  @ApiProperty({ required: true, nullable: false })
  limit: number;

  @ApiProperty({ required: true, nullable: false })
  count: number;

  @ApiProperty({ required: true, nullable: false })
  results: T[];
}
