import { Injectable, NestMiddleware } from '@nestjs/common';
import { Response, NextFunction } from 'express';

import { HarvestService } from './harvest.service';
import { Harvest } from './harvest.schema';
import { CustomRequest } from 'src/lib/types/request.type';

@Injectable()
export class HarvestMiddleware implements NestMiddleware {
  constructor(private harvestService: HarvestService) {}

  async use(req: CustomRequest, res: Response, next: NextFunction) {
    const { harvestId } = req.params;
    if (harvestId) {
      const harvest: Harvest =
        await this.harvestService.findOneOrFail(harvestId);
      req.harvest = harvest;
    }
    next();
  }
}
