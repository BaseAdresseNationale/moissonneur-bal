import { ApiProperty } from '@nestjs/swagger';
import { Source } from '../source.entity';

export class ExtendedSourceDTO extends Source {
  @ApiProperty()
  harvestError?: boolean;

  @ApiProperty()
  nbRevisionError?: number;
}
