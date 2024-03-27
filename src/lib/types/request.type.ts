import { Request } from 'express';
import { Source } from '../../modules/source/source.schema';

export interface CustomRequest extends Request {
  token?: string;
  isAdmin?: boolean;
  source?: Source;
}
