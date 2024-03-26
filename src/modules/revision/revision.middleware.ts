import { Injectable, NestMiddleware } from '@nestjs/common';
import { Response, NextFunction } from 'express';

import { RevisionService } from './revision.service';
import { Revision } from './revision.schema';
import { CustomRequest } from 'src/lib/types/request.type';

@Injectable()
export class RevisionMiddleware implements NestMiddleware {
  constructor(private revisionService: RevisionService) {}

  async use(req: CustomRequest, res: Response, next: NextFunction) {
    const { revisionId } = req.params;
    if (revisionId) {
      const revision: Revision =
        await this.revisionService.findOneOrFail(revisionId);
      req.revision = revision;
    }
    next();
  }
}
