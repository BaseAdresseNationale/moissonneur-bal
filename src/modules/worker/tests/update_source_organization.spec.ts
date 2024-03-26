import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { Connection, connect, Model } from 'mongoose';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import dotenv from 'dotenv';
dotenv.config();

import { UpdateSourceOrganisationWorker } from '../workers/update_source_organization.worker';
import { Source, SourceSchema } from 'src/modules/source/source.schema';
import {
  Organization,
  OrganizationSchema,
} from 'src/modules/organization/organization.schema';
import {
  DatasetDataGouv,
  PageDataGouv,
} from 'src/modules/api_beta_gouv/api_beta_gouv.type';
import { ApiBetaGouvModule } from 'src/modules/api_beta_gouv/api_beta_gouv.module';
import { SourceService } from 'src/modules/source/source.service';
import { OrganizationService } from 'src/modules/organization/organization.service';

describe('UPDATE SOURCE ORGA WORKER', () => {
  //
  const URL_API_DATA_GOUV = process.env.URL_API_DATA_GOUV;
  // DB
  let mongod: MongoMemoryServer;
  let mongoConnection: Connection;
  // ORM
  let sourceModel: Model<Source>;
  let organizationModel: Model<Organization>;
  // SERVICE
  let updateSourceOrganisationWorker: UpdateSourceOrganisationWorker;
  // AXIOS
  const axiosMock = new MockAdapter(axios);

  beforeAll(async () => {
    // INIT DB
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    mongoConnection = (await connect(uri)).connection;

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(uri),
        ApiBetaGouvModule,
        MongooseModule.forFeature([
          { name: Source.name, schema: SourceSchema },
          { name: Organization.name, schema: OrganizationSchema },
        ]),
      ],
      providers: [
        UpdateSourceOrganisationWorker,
        SourceService,
        OrganizationService,
      ],
    }).compile();

    updateSourceOrganisationWorker =
      moduleRef.get<UpdateSourceOrganisationWorker>(
        UpdateSourceOrganisationWorker,
      );
    // INIT MODEL
    sourceModel = moduleRef.get<Model<Source>>(getModelToken(Source.name));
    organizationModel = moduleRef.get<Model<Organization>>(
      getModelToken(Organization.name),
    );
  });

  afterAll(async () => {
    await mongoConnection.dropDatabase();
    await mongoConnection.close();
    await mongod.stop();
  });

  afterEach(async () => {
    await sourceModel.deleteMany({});
    await organizationModel.deleteMany({});
  });

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
      const sourceRes = await sourceModel.find({});
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
      const sourceRes = await sourceModel.findOne({});
      const sourceExpected = {
        _id: `datagouv-1234`,
        title: 'title',
        description: 'desc',
        url: 'url',
        enabled: true,
        license: 'lov2',
        harvesting: {
          lastHarvest: new Date('1970-01-01'),
          harvestingSince: null,
        },
        organizationId: 'orgaId',
      };
      expect(sourceRes).toMatchObject(sourceExpected);
      // CHECK ORGANIZATION
      const orgaRes = await organizationModel.findOne({});
      const orgaExpected = {
        _id: `orgaId`,
        logo: 'orgaLogo',
        name: 'orgaName',
        page: 'orgaPage',
        perimeters: [],
      };
      expect(orgaRes).toMatchObject(orgaExpected);
    });

    it('Update one source and organization', async () => {
      const sourceInit = {
        _id: `datagouv-1234`,
        title: 'title',
        description: 'desc',
        url: 'url',
        enabled: true,
        license: 'lov2',
        harvesting: {
          lastHarvest: new Date('1970-01-01'),
          harvestingSince: null,
        },
        organizationId: 'orgaId',
      };
      await sourceModel.create(sourceInit);
      const orgaInit = {
        _id: `orgaId`,
        logo: 'orgaLogo',
        name: 'orgaName',
        page: 'orgaPage',
        perimeters: [],
      };
      await organizationModel.create(orgaInit);
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
      const sourceRes = await sourceModel.findOne({});
      const sourceExpected = {
        _id: `datagouv-1234`,
        title: 'other',
        description: 'other',
        url: 'other',
        enabled: true,
        license: 'lov2',
        harvesting: {
          lastHarvest: new Date('1970-01-01'),
          harvestingSince: null,
        },
        organizationId: 'orgaId',
      };
      expect(sourceRes).toMatchObject(sourceExpected);
      // CHECK ORGANIZATION
      const orgaRes = await organizationModel.findOne({});
      const orgaExpected = {
        _id: `orgaId`,
        logo: 'other',
        name: 'other',
        page: 'other',
        perimeters: [],
      };
      expect(orgaRes).toMatchObject(orgaExpected);
    });

    it('Delete one source and organization', async () => {
      const sourceInit = {
        _id: `datagouv-1234`,
        _deleted: false,
      };
      await sourceModel.create(sourceInit);
      const orgaInit = {
        _id: `orgaId`,
        _deleted: false,
      };
      await organizationModel.create(orgaInit);
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
      const sourceRes: Source = await sourceModel.findOne({});
      expect(sourceRes._deleted).toBeTruthy();
      // CHECK ORGANIZATION
      const orgaRes = await organizationModel.findOne({});
      expect(orgaRes._deleted).toBeTruthy();
    });
  });
});
