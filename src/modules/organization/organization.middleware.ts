import { Injectable, NestMiddleware } from '@nestjs/common';
import { Response, NextFunction } from 'express';

import { OrganizationService } from './organization.service';
import { Organization } from './organization.schema';
import { CustomRequest } from 'src/lib/types/request.type';

@Injectable()
export class OrganizationMiddleware implements NestMiddleware {
  constructor(private organizationService: OrganizationService) {}

  async use(req: CustomRequest, res: Response, next: NextFunction) {
    const { organizationId } = req.params;
    if (organizationId) {
      const organization: Organization =
        await this.organizationService.findOneOrFail(organizationId);
      req.organization = organization;
    }
    next();
  }
}
