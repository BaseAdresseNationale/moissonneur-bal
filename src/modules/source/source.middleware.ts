import { Injectable, NestMiddleware } from '@nestjs/common';
import { Response, NextFunction } from 'express';

import { SourceService } from './source.service';
import { Source } from './source.schema';
import { CustomRequest } from 'src/lib/types/request.type';

@Injectable()
export class SourceMiddleware implements NestMiddleware {
  constructor(private sourceService: SourceService) {}

  async use(req: CustomRequest, res: Response, next: NextFunction) {
    const { sourceId } = req.params;
    if (sourceId) {
      const source: Source = await this.sourceService.findOneOrFail(sourceId);
      req.source = source;
    }
    next();
  }
}
