import { Request } from 'express';
import { Harvest } from 'src/modules/harvest/harvest.entity';
import { Organization } from 'src/modules/organization/organization.entity';
import { Revision } from 'src/modules/revision/revision.entity';
import { Source } from 'src/modules/source/source.entity';

export interface CustomRequest extends Request {
  token?: string;
  isAdmin?: boolean;
  source?: Source;
  organization?: Organization;
  harvest?: Harvest;
  revision?: Revision;
}
