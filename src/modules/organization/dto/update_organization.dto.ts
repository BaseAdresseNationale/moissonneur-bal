import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsDefined, ValidateNested } from 'class-validator';
import { Perimeter } from '../perimeters.entity';
import { Type } from 'class-transformer';

export class UpdateOrganizationDTO {
  @IsDefined()
  @ValidateNested({ each: true })
  @ArrayNotEmpty()
  @Type(() => Perimeter)
  @ApiProperty({
    type: () => Perimeter,
    isArray: true,
    required: true,
    nullable: false,
  })
  perimeters: Perimeter[];
}
