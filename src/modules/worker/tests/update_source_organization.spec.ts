import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { Client } from 'pg';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import dotenv from 'dotenv';
import { Repository } from 'typeorm';
dotenv.config();

import { UpdateSourceOrganisationWorker } from '../workers/update_source_organization.worker';
import {
  DatasetDataGouv,
  PageDataGouv,
} from 'src/modules/api_beta_gouv/api_beta_gouv.type';
import { ApiBetaGouvModule } from 'src/modules/api_beta_gouv/api_beta_gouv.module';
import { SourceService } from 'src/modules/source/source.service';
import { OrganizationService } from 'src/modules/organization/organization.service';
import { HarvestService } from 'src/modules/harvest/harvest.service';
import { RevisionService } from 'src/modules/revision/revision.service';
import { FileService } from 'src/modules/file/file.service';
import { ApiDepotService } from 'src/modules/api_depot/api_depot.service';
import { ConfigModule } from '@nestjs/config';

import { Organization } from '../../organization/organization.entity';
import { Perimeter } from '../../organization/perimeters.entity';
import { Source } from '../../source/source.entity';
import { Revision } from 'src/modules/revision/revision.entity';
import { Harvest } from 'src/modules/harvest/harvest.entity';

describe('UPDATE SOURCE ORGA WORKER', () => {
  let app: INestApplication;
  const URL_API_DATA_GOUV = process.env.URL_API_DATA_GOUV;
  // DB
  let postgresContainer: StartedPostgreSqlContainer;
  let postgresClient: Client;
  let orgaRepository: Repository<Organization>;
  let sourceRepository: Repository<Source>;
  // SERVICE
  let updateSourceOrganisationWorker: UpdateSourceOrganisationWorker;
  // AXIOS
  const axiosMock = new MockAdapter(axios);

  beforeAll(async () => {
    // INIT DB
    postgresContainer = await new PostgreSqlContainer(
      'postgis/postgis:12-3.0',
    ).start();
    postgresClient = new Client({
      host: postgresContainer.getHost(),
      port: postgresContainer.getPort(),
      database: postgresContainer.getDatabase(),
      user: postgresContainer.getUsername(),
      password: postgresContainer.getPassword(),
    });
    await postgresClient.connect();

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule,
        HttpModule,
        ApiBetaGouvModule,
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: postgresContainer.getHost(),
          port: postgresContainer.getPort(),
          username: postgresContainer.getUsername(),
          password: postgresContainer.getPassword(),
          database: postgresContainer.getDatabase(),
          synchronize: true,
          entities: [Organization, Source, Perimeter, Revision, Harvest],
        }),
        TypeOrmModule.forFeature([
          Organization,
          Source,
          Perimeter,
          Revision,
          Harvest,
        ]),
      ],
      providers: [
        UpdateSourceOrganisationWorker,
        SourceService,
        OrganizationService,
        HarvestService,
        RevisionService,
        FileService,
        ApiDepotService,
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    updateSourceOrganisationWorker = app.get<UpdateSourceOrganisationWorker>(
      UpdateSourceOrganisationWorker,
    );
    // INIT REPOSITORY
    orgaRepository = app.get(getRepositoryToken(Organization));
    sourceRepository = app.get(getRepositoryToken(Source));
  });

  afterAll(async () => {
    await postgresClient.end();
    await postgresContainer.stop();
    await app.close();
  });

  afterEach(async () => {
    await orgaRepository.delete({});
    await sourceRepository.delete({});
  });

  async function createSource(props: Partial<Source> = {}) {
    const entityToInsert = sourceRepository.create(props);
    const result = await sourceRepository.save(entityToInsert);
    return result.id;
  }

  async function createOrga(props: Partial<Organization> = {}) {
    const entityToInsert = orgaRepository.create(props);
    const result = await orgaRepository.save(entityToInsert);
    return result.id;
  }

  describe('RUN UpdateSourceOrganisationWorker ', () => {
    it('No create source and organization', async () => {
      // MOCK API DATA GOUV
      const data: any[] = [
        {
          description: 'desc',
          id: '1',
          title: 'title',
          license: '',
          organization: {
            badges: [
              {
                kind: 'public-service',
              },
            ],
            id: 'orgaId',
            logo: 'orgaLogo',
            name: 'orgaName',
            page: 'orgaPage',
          },
          resources: [
            {
              id: 'ressourceId',
              format: 'csv',
              url: 'url',
              last_modified: new Date(),
            },
          ],
          archived: null,
        },
        {
          description: 'desc',
          id: '2',
          title: 'title',
          license: '',
          organization: {
            badges: [
              {
                kind: 'certified',
              },
              {
                kind: 'public-service',
              },
            ],
          },
          resources: [
            {
              id: 'ressourceId',
              format: 'csv',
              url: 'url',
              last_modified: new Date(),
            },
          ],
          archived: null,
        },
        {
          description: 'desc',
          id: '3',
          title: 'title',
          license: '',
          organization: {
            badges: [
              {
                kind: 'certified',
              },
              {
                kind: 'public-service',
              },
            ],
            id: 'orgaId',
            logo: 'orgaLogo',
            name: 'orgaName',
            page: 'orgaPage',
          },
          resources: [],
          archived: null,
        },
      ];
      const page: PageDataGouv = {
        data: data,
        next_page: '',
        page: 1,
        page_size: 1,
        previous_page: '',
        total: 1,
      };
      const url = new RegExp(`${URL_API_DATA_GOUV}/datasets/*`);
      axiosMock.onGet(url).reply(200, page);
      // RUN WORKER
      await updateSourceOrganisationWorker.run();
      // CHECK SOURCE
      const sourceRes = await sourceRepository.find({});
      expect(sourceRes).toEqual([]);
    });
    it('Create one source and organization', async () => {
      // MOCK API DATA GOUV
      const data: DatasetDataGouv[] = [
        {
          description: 'desc',
          id: '1234',
          title: 'title',
          license: '',
          organization: {
            badges: [
              {
                kind: 'certified',
              },
              {
                kind: 'public-service',
              },
            ],
            id: 'orgaId',
            logo: 'orgaLogo',
            name: 'orgaName',
            page: 'orgaPage',
          },
          resources: [
            {
              id: 'ressourceId',
              format: 'csv',
              url: 'url',
              last_modified: new Date(),
            },
          ],
          archived: null,
        },
        {
          description: 'other',
          id: '1234',
          title: 'other',
          license: '',
          organization: {
            badges: [
              {
                kind: 'certified',
              },
              {
                kind: 'public-service',
              },
            ],
            id: 'orgaId',
            logo: 'other',
            name: 'other',
            page: 'other',
          },
          resources: [
            {
              id: 'ressourceId',
              format: 'tsv',
              url: 'other',
              last_modified: new Date(),
            },
          ],
          archived: null,
        },
      ];
      const page: PageDataGouv = {
        data: data,
        next_page: '',
        page: 1,
        page_size: 1,
        previous_page: '',
        total: 1,
      };
      const url = new RegExp(`${URL_API_DATA_GOUV}/datasets/*`);
      axiosMock.onGet(url).reply(200, page);
      // RUN WORKER
      await updateSourceOrganisationWorker.run();
      // CHECK SOURCE
      const [sourceRes] = await sourceRepository.find({});
      const sourceExpected = {
        id: `1234`,
        title: 'title',
        description: 'desc',
        url: 'url',
        enabled: true,
        license: 'lov2',
        lastHarvest: new Date('1970-01-01'),
        harvestingSince: null,
        organizationId: 'orgaId',
      };
      expect(sourceRes).toMatchObject(sourceExpected);
      // CHECK ORGANIZATION
      const [orgaRes] = await orgaRepository.find({});
      const orgaExpected = {
        id: `orgaId`,
        logo: 'orgaLogo',
        name: 'orgaName',
        page: 'orgaPage',
        perimeters: [],
      };
      expect(orgaRes).toMatchObject(orgaExpected);
    });
    it('Update one source and organization', async () => {
      const orgaInit = {
        id: `orgaId`,
        logo: 'orgaLogo',
        name: 'orgaName',
        page: 'orgaPage',
        perimeters: [],
      };
      await createOrga(orgaInit);
      const sourceInit = {
        id: `1234`,
        title: 'title',
        description: 'desc',
        url: 'url',
        enabled: true,
        license: 'lov2',
        lastHarvest: new Date('1970-01-01'),
        harvestingSince: null,
        organizationId: 'orgaId',
      };
      await createSource(sourceInit);
      // MOCK API DATA GOUV
      const data: DatasetDataGouv[] = [
        {
          description: 'other',
          id: '1234',
          title: 'other',
          license: '',
          organization: {
            badges: [
              {
                kind: 'certified',
              },
              {
                kind: 'public-service',
              },
            ],
            id: 'orgaId',
            logo: 'other',
            name: 'other',
            page: 'other',
          },
          resources: [
            {
              id: 'ressourceId',
              format: 'csv',
              url: 'other',
              last_modified: new Date(),
            },
          ],
          archived: null,
        },
      ];
      const page: PageDataGouv = {
        data: data,
        next_page: '',
        page: 1,
        page_size: 1,
        previous_page: '',
        total: 1,
      };
      const url = new RegExp(`${URL_API_DATA_GOUV}/datasets/*`);
      axiosMock.onGet(url).reply(200, page);
      // RUN WORKER
      await updateSourceOrganisationWorker.run();
      // CHECK SOURCE
      const [sourceRes] = await sourceRepository.find({});
      const sourceExpected = {
        id: '1234',
        title: 'other',
        description: 'other',
        url: 'other',
        enabled: true,
        license: 'lov2',
        lastHarvest: new Date('1970-01-01'),
        harvestingSince: null,
        organizationId: 'orgaId',
      };
      expect(sourceRes).toMatchObject(sourceExpected);
      // CHECK ORGANIZATION
      const [orgaRes] = await orgaRepository.find({});
      const orgaExpected = {
        id: `orgaId`,
        logo: 'other',
        name: 'other',
        page: 'other',
        perimeters: [],
      };
      expect(orgaRes).toMatchObject(orgaExpected);
    });
    it('Delete one source and organization with archived', async () => {
      const orgaInit = {
        id: `orgaId`,
        logo: 'orgaLogo',
        name: 'orgaName',
        page: 'orgaPage',
        perimeters: [],
      };
      await createOrga(orgaInit);
      const sourceInit = {
        id: `1234`,
        title: 'title',
        description: 'desc',
        url: 'url',
        enabled: true,
        license: 'lov2',
        lastHarvest: new Date('1970-01-01'),
        harvestingSince: null,
        organizationId: 'orgaId',
      };
      await createSource(sourceInit);
      // MOCK API DATA GOUV
      const data: DatasetDataGouv[] = [
        {
          id: '1234',
          description: 'other',
          title: 'other',
          license: '',
          organization: {
            badges: [
              {
                kind: 'certified',
              },
              {
                kind: 'public-service',
              },
            ],
            id: 'orgaId',
            logo: 'other',
            name: 'other',
            page: 'other',
          },
          resources: [
            {
              id: 'ressourceId',
              format: 'csv',
              url: 'other',
              last_modified: new Date(),
            },
          ],
          archived: true,
        },
      ];
      const page: PageDataGouv = {
        data: data,
        next_page: '',
        page: 1,
        page_size: 1,
        previous_page: '',
        total: 1,
      };
      const url = new RegExp(`${URL_API_DATA_GOUV}/datasets/*`);
      axiosMock.onGet(url).reply(200, page);
      // RUN WORKER
      await updateSourceOrganisationWorker.run();
      // CHECK SOURCE
      const [sourceRes] = await sourceRepository.find({ withDeleted: true });
      expect(sourceRes.deletedAt).not.toBeNull();
      // CHECK ORGANIZATION
      const [orgaRes] = await orgaRepository.find({ withDeleted: true });
      expect(orgaRes.deletedAt).not.toBeNull();
    });

    it('Delete one source and organization', async () => {
      const orgaInit = {
        id: `orgaId`,
        logo: 'orgaLogo',
        name: 'orgaName',
        page: 'orgaPage',
        perimeters: [],
      };
      await createOrga(orgaInit);
      const sourceInit = {
        id: `1234`,
        title: 'title',
        description: 'desc',
        url: 'url',
        enabled: true,
        license: 'lov2',
        lastHarvest: new Date('1970-01-01'),
        harvestingSince: null,
        organizationId: 'orgaId',
      };
      await createSource(sourceInit);
      // MOCK API DATA GOUV
      const page: PageDataGouv = {
        data: [],
        next_page: '',
        page: 1,
        page_size: 1,
        previous_page: '',
        total: 1,
      };
      const url = new RegExp(`${URL_API_DATA_GOUV}/datasets/*`);
      axiosMock.onGet(url).reply(200, page);
      // RUN WORKER
      await updateSourceOrganisationWorker.run();
      // CHECK SOURCE
      const [sourceRes] = await sourceRepository.find({ withDeleted: true });
      expect(sourceRes.deletedAt).not.toBeNull();
      // CHECK ORGANIZATION
      const [orgaRes] = await orgaRepository.find({ withDeleted: true });
      expect(orgaRes.deletedAt).not.toBeNull();
    });
  });
});
