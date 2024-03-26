import { PipeTransform, Injectable } from '@nestjs/common';
import { SourceHarvestsQuery } from '../dto/source_harvests.query';

export type SourceHarvestsQueryTransformed = {
  offset: number;
  limit: number;
};

@Injectable()
export class SourceHarvestsQueryPipe implements PipeTransform {
  transform(query: SourceHarvestsQuery): SourceHarvestsQueryTransformed {
    const limit = query.limit ? Number.parseInt(query.limit, 10) : 20;
    const offset = query.offset ? Number.parseInt(query.offset, 10) : 0;
    return { offset, limit };
  }
}
