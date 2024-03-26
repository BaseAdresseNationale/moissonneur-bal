import { Request } from 'express';
import { Source } from '../../modules/source/source.schema';
import { Organization } from 'src/modules/organization/organization.schema';
import { Harvest } from 'src/modules/harvest/harvest.schema';
import { Revision } from 'src/modules/revision/revision.schema';

export interface CustomRequest extends Request {
  token?: string;
  isAdmin?: boolean;
  source?: Source;
  organization?: Organization;
  harvest?: Harvest;
  revision?: Revision;
}
