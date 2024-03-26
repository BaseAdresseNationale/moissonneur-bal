import { ApiProperty } from '@nestjs/swagger';

export class SourceHarvestsQuery {
  @ApiProperty({ required: false, nullable: false })
  limit?: string = '20';

  @ApiProperty({ required: false, nullable: false })
  offset?: string = '0';
}
