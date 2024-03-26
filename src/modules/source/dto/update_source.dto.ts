import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsDefined } from 'class-validator';

export class UpdateSourceDTO {
  @IsDefined()
  @IsBoolean()
  @ApiProperty({ required: true, nullable: false })
  enabled: boolean;
}
