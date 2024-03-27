import { Request } from 'express';
import { Source } from '../../modules/source/source.schema';
import { Organization } from 'src/modules/organization/organization.schema';

export interface CustomRequest extends Request {
  token?: string;
  isAdmin?: boolean;
  source?: Source;
  organization?: Organization;
}
