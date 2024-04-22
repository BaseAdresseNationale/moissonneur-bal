import { ApiProperty } from '@nestjs/swagger';
import { Source } from '../source.schema';

export class ExtendedSourceDTO extends Source {
  @ApiProperty()
  harvestError?: boolean;

  @ApiProperty()
  nbRevisionError?: number;
}
