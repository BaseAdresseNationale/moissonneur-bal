import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsDefined,
  IsEmail,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Perimeter } from '../perimeters.entity';
import { Type } from 'class-transformer';

export class UpdateOrganizationDTO {
  @IsOptional()
  @IsEmail()
  email: string;

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
