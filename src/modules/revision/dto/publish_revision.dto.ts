import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsDefined } from 'class-validator';

export class PublishRevisionDTO {
  @IsDefined()
  @IsBoolean()
  @ApiProperty({ required: true, nullable: false })
  force: boolean;
}
