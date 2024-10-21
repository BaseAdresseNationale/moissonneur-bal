import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { Organization } from './src/modules/organization/organization.entity';
import { Perimeter } from './src/modules/organization/perimeters.entity';
import { Source } from './src/modules/source/source.entity';
import { Harvest } from './src/modules/harvest/harvest.entity';
import { Revision } from './src/modules/revision/revision.entity';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.POSTGRES_URL,
  synchronize: false,
  logging: true,
  entities: [Organization, Perimeter, Source, Harvest, Revision],
  migrationsRun: false,
  migrations: ['**/migrations/*.ts'],
});
