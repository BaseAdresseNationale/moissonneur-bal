import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { Connection, connect, Model } from 'mongoose';
import { ObjectId } from 'mongodb';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import * as fs from 'fs';
import { join } from 'path';
import hasha from 'hasha';
import dotenv from 'dotenv';
dotenv.config();

import { Source, SourceSchema } from 'src/modules/source/source.schema';
import {
  Organization,
  OrganizationSchema,
} from 'src/modules/organization/organization.schema';
import { ApiBetaGouvModule } from 'src/modules/api_beta_gouv/api_beta_gouv.module';
import { SourceService } from 'src/modules/source/source.service';
import { OrganizationService } from 'src/modules/organization/organization.service';
import { HarvestingWorker } from '../workers/harvesting.worker';
import {
  Harvest,
  HarvestSchema,
  StatusHarvestEnum,
} from 'src/modules/harvest/harvest.schema';
import { HttpModule } from '@nestjs/axios';
import { HandleFile } from '../workers/harvesting/handle_file';
import { HarvestService } from 'src/modules/harvest/harvest.service';
import { HandleCommune } from '../workers/harvesting/handle_commune';
import { ConfigModule } from '@nestjs/config';
import {
  Revision,
  RevisionSchema,
  StatusPublicationEnum,
} from 'src/modules/revision/revision.schema';
import { RevisionService } from 'src/modules/revision/revision.service';
import { ApiDepotService } from 'src/modules/api_depot/api_depot.service';
import { StatusUpdateEnum } from 'src/lib/types/status_update.enum';
import { FileService } from 'src/modules/file/file.service';

process.env.API_DEPOT_CLIENT_ID = 'moissonneur-bal';

describe('UPDATE SOURCE ORGA WORKER', () => {
  // DB
  let mongod: MongoMemoryServer;
  let mongoConnection: Connection;
  // ORM
  let sourceModel: Model<Source>;
  let organizationModel: Model<Organization>;
  let harvestModel: Model<Harvest>;
  let revisionModel: Model<Revision>;
  // SERVICE
  let harvestingWorker: HarvestingWorker;
  let fileService: FileService;
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
        ConfigModule,
        ApiBetaGouvModule,
        HttpModule,
        MongooseModule.forFeature([
          { name: Source.name, schema: SourceSchema },
          { name: Organization.name, schema: OrganizationSchema },
          { name: Harvest.name, schema: HarvestSchema },
          { name: Revision.name, schema: RevisionSchema },
        ]),
      ],
      providers: [
        HarvestingWorker,
        SourceService,
        OrganizationService,
        HarvestService,
        RevisionService,
        HandleFile,
        FileService,
        HandleCommune,
        ApiDepotService,
      ],
    }).compile();

    harvestingWorker = moduleRef.get<HarvestingWorker>(HarvestingWorker);
    fileService = moduleRef.get<FileService>(FileService);
    // INIT MODEL
    sourceModel = moduleRef.get<Model<Source>>(getModelToken(Source.name));
    organizationModel = moduleRef.get<Model<Organization>>(
      getModelToken(Organization.name),
    );
    harvestModel = moduleRef.get<Model<Harvest>>(getModelToken(Harvest.name));
    revisionModel = moduleRef.get<Model<Revision>>(
      getModelToken(Revision.name),
    );
    jest
      .spyOn(fileService, 'writeFile')
      .mockImplementation(() => Promise.resolve(new ObjectId()));
  });

  afterAll(async () => {
    await mongoConnection.dropDatabase();
    await mongoConnection.close();
    await mongod.stop();
    await axiosMock.reset();
  });

  afterEach(async () => {
    await sourceModel.deleteMany({});
    await organizationModel.deleteMany({});
    await harvestModel.deleteMany({});
    await revisionModel.deleteMany({});
    await axiosMock.resetHandlers();
  });

  function readFile(relativePath: string) {
    const absolutePath = join(__dirname, 'mock', relativePath);
    return fs.readFileSync(absolutePath);
  }

  describe('RUN HarvestingWorker one commune', () => {
    it('First harvesting with no perimeter', async () => {
      // CREATE SOURCE
      const url = 'url-source';
      const sourceInit = {
        _id: `datagouv-1234`,
        title: 'title',
        description: 'desc',
        url,
        enabled: true,
        harvesting: {
          lastHarvest: new Date('1970-01-01'),
          harvestingSince: null,
        },
        organizationId: 'orgaId',
        _deleted: false,
      };
      await sourceModel.create(sourceInit);
      // CREATE ORGA
      const orgaInit = {
        _id: `orgaId`,
        name: 'orgaName',
        perimeters: [],
      };
      await organizationModel.create(orgaInit);
      // RETURN SOURCE URL DATA GOUV
      axiosMock.onGet(url).reply(200, readFile('1.3-valid.csv'));
      // RUN WORKER
      await harvestingWorker.run();
      // CHECK HARVEST FAIL
      const harvestRes: Harvest = await harvestModel.findOne({}).lean();
      const harvestExpected: Partial<Harvest> = {
        sourceId: 'datagouv-1234',
        status: StatusHarvestEnum.COMPLETED,
        updateRejectionReason:
          'Les codes commune 31591 sont en dehors du périmètre',
        updateStatus: StatusUpdateEnum.REJECTED,
      };
      expect(harvestRes).toMatchObject(harvestExpected);
    });

    it('First harvesting', async () => {
      // CREATE SOURCE
      const url = 'url-source';
      const sourceInit = {
        _id: `datagouv-1234`,
        title: 'title',
        description: 'desc',
        url,
        enabled: true,
        harvesting: {
          lastHarvest: new Date('1970-01-01'),
          harvestingSince: null,
        },
        organizationId: 'orgaId',
        _deleted: false,
      };
      await sourceModel.create(sourceInit);
      // CREATE ORGA
      const orgaInit = {
        _id: `orgaId`,
        name: 'orgaName',
        perimeters: [
          {
            type: 'commune',
            code: '31591',
          },
        ],
      };
      await organizationModel.create(orgaInit);
      // MOCK URL SOURCE
      axiosMock.onGet(url).replyOnce(200, readFile('1.3-valid.csv'));
      // MOCK PUBLICATION API DEPOT
      axiosMock
        .onGet(`/communes/31591/current-revision`)
        .replyOnce(404, 'Aucune révision connue pour cette commune');
      const revisionId = new ObjectId();
      axiosMock
        .onPost(`/communes/31591/revisions`)
        .replyOnce(200, { _id: revisionId.toHexString() });
      axiosMock
        .onPut(`/revisions/${revisionId.toHexString()}/files/bal`)
        .replyOnce(200);
      axiosMock
        .onPost(`/revisions/${revisionId.toHexString()}/compute`)
        .replyOnce(200, { validation: { valid: true } });
      axiosMock
        .onPost(`/revisions/${revisionId.toHexString()}/publish`)
        .replyOnce(200, { _id: revisionId.toHexString() });
      // RUN WORKER
      await harvestingWorker.run();
      // CHECK HARVEST
      const harvestRes: Harvest = await harvestModel.findOne({}).lean();
      const harvestExpected: Partial<Harvest> = {
        sourceId: 'datagouv-1234',
        status: StatusHarvestEnum.COMPLETED,
        updateStatus: StatusUpdateEnum.UPDATED,
      };
      expect(harvestRes).toMatchObject(harvestExpected);
      // CHECK REVISION
      const revisionRes: Revision = await revisionModel.findOne({}).lean();
      const revisionExpected: Partial<Revision> = {
        codeCommune: '31591',
        sourceId: 'datagouv-1234',
        harvestId: harvestRes._id,
        updateStatus: StatusUpdateEnum.UPDATED,
        nbRows: 1,
        nbRowsWithErrors: 0,
        uniqueErrors: [],
        current: true,
        publication: {
          status: StatusPublicationEnum.PUBLISHED,
          publishedRevisionId: revisionId.toHexString(),
        },
      };
      expect(revisionRes).toMatchObject(revisionExpected);
    });

    it('Harvesting with last harvest', async () => {
      // CREATE SOURCE
      const url = 'url-source';
      const sourceInit = {
        _id: `datagouv-1234`,
        title: 'title',
        description: 'desc',
        url,
        enabled: true,
        harvesting: {
          lastHarvest: new Date('1970-01-01'),
          harvestingSince: null,
        },
        organizationId: 'orgaId',
        _deleted: false,
      };
      await sourceModel.create(sourceInit);
      // CREATE ORGA
      const orgaInit = {
        _id: `orgaId`,
        name: 'orgaName',
        perimeters: [
          {
            type: 'commune',
            code: '31591',
          },
        ],
      };
      await organizationModel.create(orgaInit);
      // CREATE ORGA
      const firstHarvest: Partial<Harvest> = {
        _id: new ObjectId(),
        fileId: new ObjectId(),
        fileHash: 'currentFileHash',
        dataHash: 'currentDataHash',
      };
      await harvestModel.create(firstHarvest);

      // MOCK URL SOURCE
      axiosMock.onGet(url).replyOnce(200, readFile('1.3-valid.csv'));
      // MOCK PUBLICATION API DEPOT
      const revisionId = new ObjectId();
      axiosMock
        .onPost(`/communes/31591/revisions`)
        .replyOnce(200, { _id: revisionId.toHexString() });
      axiosMock
        .onPut(`/revisions/${revisionId.toHexString()}/files/bal`)
        .replyOnce(200);
      axiosMock
        .onPost(`/revisions/${revisionId.toHexString()}/compute`)
        .replyOnce(200, { validation: { valid: true } });
      axiosMock
        .onPost(`/revisions/${revisionId.toHexString()}/publish`)
        .replyOnce(200, { _id: revisionId.toHexString() });

      axiosMock.onGet(`/communes/31591/current-revision`).replyOnce(200, {
        client: { _id: '_moissonneur-bal', id: 'moissonneur-bal' },
      });
      // RUN WORKER
      await harvestingWorker.run();
      // CHECK HARVEST
      const harvestRes: Harvest = await harvestModel
        .findOne({ _id: { $ne: firstHarvest._id } })
        .lean();
      const harvestExpected: Partial<Harvest> = {
        sourceId: 'datagouv-1234',
        status: StatusHarvestEnum.COMPLETED,
        updateStatus: StatusUpdateEnum.UPDATED,
      };
      expect(harvestRes).toMatchObject(harvestExpected);
      // CHECK REVISION
      const revisionRes: Revision = await revisionModel.findOne({}).lean();
      const revisionExpected: Partial<Revision> = {
        codeCommune: '31591',
        sourceId: 'datagouv-1234',
        harvestId: harvestRes._id,
        updateStatus: StatusUpdateEnum.UPDATED,
        nbRows: 1,
        nbRowsWithErrors: 0,
        uniqueErrors: [],
        current: true,
        publication: {
          status: StatusPublicationEnum.PUBLISHED,
          publishedRevisionId: revisionId.toHexString(),
        },
      };
      expect(revisionRes).toMatchObject(revisionExpected);
    });

    it('Harvesting with last harvest (file no change)', async () => {
      // CREATE SOURCE
      const url = 'url-source';
      const sourceInit = {
        _id: `datagouv-1234`,
        title: 'title',
        description: 'desc',
        url,
        enabled: true,
        harvesting: {
          lastHarvest: new Date('1970-01-01'),
          harvestingSince: null,
        },
        organizationId: 'orgaId',
        _deleted: false,
      };
      await sourceModel.create(sourceInit);
      // CREATE ORGA
      const orgaInit = {
        _id: `orgaId`,
        name: 'orgaName',
        perimeters: [
          {
            type: 'commune',
            code: '31591',
          },
        ],
      };
      await organizationModel.create(orgaInit);
      // CREATE ORGA
      const file = readFile('1.3-valid.csv');
      const fileHash = hasha(file, { algorithm: 'sha256' });
      const fileId = new ObjectId();
      const dataHash = 'currentDataHash';
      const firstHarvest: Partial<Harvest> = {
        _id: new ObjectId(),
        sourceId: `datagouv-1234`,
        status: StatusHarvestEnum.COMPLETED,
        fileId,
        fileHash,
        dataHash,
        finishedAt: new Date(),
      };
      await harvestModel.create(firstHarvest);

      // MOCK URL SOURCE
      axiosMock.onGet(url).replyOnce(200, file);
      // RUN WORKER
      await harvestingWorker.run();
      // CHECK HARVEST
      const harvestRes: Harvest = await harvestModel
        .findOne({ _id: { $ne: firstHarvest._id } })
        .lean();
      const harvestExpected: Partial<Harvest> = {
        sourceId: 'datagouv-1234',
        status: StatusHarvestEnum.COMPLETED,
        updateStatus: StatusUpdateEnum.UNCHANGED,
        fileId,
        fileHash,
      };
      expect(harvestRes).toMatchObject(harvestExpected);
      // CHECK REVISION
      const revisionRes: Revision = await revisionModel.find({}).lean();
      expect(revisionRes).toEqual([]);
    });

    it('Harvesting with not valide bal', async () => {
      // CREATE SOURCE
      const url = 'url-source';
      const sourceInit = {
        _id: `datagouv-1234`,
        title: 'title',
        description: 'desc',
        url,
        enabled: true,
        harvesting: {
          lastHarvest: new Date('1970-01-01'),
          harvestingSince: null,
        },
        organizationId: 'orgaId',
        _deleted: false,
      };
      await sourceModel.create(sourceInit);
      // CREATE ORGA
      const orgaInit = {
        _id: `orgaId`,
        name: 'orgaName',
        perimeters: [
          {
            type: 'commune',
            code: '31591',
          },
        ],
      };
      await organizationModel.create(orgaInit);

      // MOCK URL SOURCE
      const file = readFile('1.3-not-valid.csv');
      const fileHash = hasha(file, { algorithm: 'sha256' });
      axiosMock.onGet(url).replyOnce(200, file);
      // RUN WORKER
      await harvestingWorker.run();
      // CHECK HARVEST
      const harvestRes: Harvest = await harvestModel.findOne({}).lean();
      const harvestExpected: Partial<Harvest> = {
        sourceId: 'datagouv-1234',
        status: StatusHarvestEnum.COMPLETED,
        updateStatus: StatusUpdateEnum.REJECTED,
        fileHash,
      };
      expect(harvestRes).toMatchObject(harvestExpected);
      // CHECK REVISION
      const revisionRes: Revision = await revisionModel.find({}).lean();
      expect(revisionRes).toEqual([]);
    });

    it('Harvesting provide other client', async () => {
      // CREATE SOURCE
      const url = 'url-source';
      const sourceInit = {
        _id: `datagouv-1234`,
        title: 'title',
        description: 'desc',
        url,
        enabled: true,
        harvesting: {
          lastHarvest: new Date('1970-01-01'),
          harvestingSince: null,
        },
        organizationId: 'orgaId',
        _deleted: false,
      };
      await sourceModel.create(sourceInit);
      // CREATE ORGA
      const orgaInit = {
        _id: `orgaId`,
        name: 'orgaName',
        perimeters: [
          {
            type: 'commune',
            code: '31591',
          },
        ],
      };
      await organizationModel.create(orgaInit);
      // MOCK URL SOURCE
      axiosMock.onGet(url).replyOnce(200, readFile('1.3-valid.csv'));
      // MOCK PUBLICATION API DEPOT
      axiosMock.onGet(`/communes/31591/current-revision`).replyOnce(200, {
        client: { _id: '_other-client', id: 'other-client' },
      });
      // RUN WORKER
      await harvestingWorker.run();
      // CHECK HARVEST
      const harvestRes: Harvest = await harvestModel.findOne({}).lean();
      const harvestExpected: Partial<Harvest> = {
        sourceId: 'datagouv-1234',
        status: StatusHarvestEnum.COMPLETED,
        updateStatus: StatusUpdateEnum.UPDATED,
      };
      expect(harvestRes).toMatchObject(harvestExpected);
      // CHECK REVISION
      const revisionRes: Revision = await revisionModel.findOne({}).lean();
      const revisionExpected: Partial<Revision> = {
        codeCommune: '31591',
        sourceId: 'datagouv-1234',
        harvestId: harvestRes._id,
        updateStatus: StatusUpdateEnum.UPDATED,
        nbRows: 1,
        nbRowsWithErrors: 0,
        uniqueErrors: [],
        current: true,
        publication: {
          status: StatusPublicationEnum.PROVIDED_BY_OTHER_CLIENT,
          currentClientId: '_other-client',
        },
      };
      expect(revisionRes).toMatchObject(revisionExpected);
    });

    it('Harvesting provide other source', async () => {
      // CREATE SOURCE
      const url = 'url-source';
      const sourceInit = {
        _id: `datagouv-1234`,
        title: 'title',
        description: 'desc',
        url,
        enabled: true,
        harvesting: {
          lastHarvest: new Date('1970-01-01'),
          harvestingSince: null,
        },
        organizationId: 'orgaId',
        _deleted: false,
      };
      await sourceModel.create(sourceInit);
      // CREATE ORGA
      const orgaInit = {
        _id: `orgaId`,
        name: 'orgaName',
        perimeters: [
          {
            type: 'commune',
            code: '31591',
          },
        ],
      };
      await organizationModel.create(orgaInit);

      // MOCK URL SOURCE
      axiosMock.onGet(url).replyOnce(200, readFile('1.3-valid.csv'));
      // MOCK PUBLICATION API DEPOT
      axiosMock.onGet(`/communes/31591/current-revision`).replyOnce(200, {
        context: { extras: { sourceId: 'other-source' } },
      });
      // RUN WORKER
      await harvestingWorker.run();
      // CHECK HARVEST
      const harvestRes: Harvest = await harvestModel.findOne({}).lean();
      const harvestExpected: Partial<Harvest> = {
        sourceId: 'datagouv-1234',
        status: StatusHarvestEnum.COMPLETED,
        updateStatus: StatusUpdateEnum.UPDATED,
      };
      expect(harvestRes).toMatchObject(harvestExpected);
      // CHECK REVISION
      const revisionRes: Revision = await revisionModel.findOne({}).lean();
      const revisionExpected: Partial<Revision> = {
        codeCommune: '31591',
        sourceId: 'datagouv-1234',
        harvestId: harvestRes._id,
        updateStatus: StatusUpdateEnum.UPDATED,
        nbRows: 1,
        nbRowsWithErrors: 0,
        uniqueErrors: [],
        current: true,
        publication: {
          status: StatusPublicationEnum.PROVIDED_BY_OTHER_SOURCE,
          currentSourceId: 'other-source',
        },
      };
      expect(revisionRes).toMatchObject(revisionExpected);
    });
  });

  describe('RUN HarvestingWorker multi commune', () => {
    it('Harvesting multi communes', async () => {
      // CREATE SOURCE
      const url = 'url-source';
      const sourceInit = {
        _id: `datagouv-1234`,
        title: 'title',
        description: 'desc',
        url,
        enabled: true,
        harvesting: {
          lastHarvest: new Date('1970-01-01'),
          harvestingSince: null,
        },
        organizationId: 'orgaId',
        _deleted: false,
      };
      await sourceModel.create(sourceInit);
      // CREATE ORGA
      const orgaInit = {
        _id: `orgaId`,
        name: 'orgaName',
        perimeters: [
          {
            type: 'commune',
            code: '31591',
          },
          {
            type: 'commune',
            code: '67482',
          },
        ],
      };
      await organizationModel.create(orgaInit);
      // MOCK URL SOURCE
      axiosMock
        .onGet(url)
        .replyOnce(200, readFile('1.3-valid-multi-commune.csv'));
      // MOCK PUBLICATION API DEPOT
      axiosMock
        .onGet(`/communes/31591/current-revision`)
        .replyOnce(404, 'Aucune révision connue pour cette commune');
      const revisionId = new ObjectId();
      axiosMock
        .onPost(`/communes/31591/revisions`)
        .replyOnce(200, { _id: revisionId.toHexString() });
      axiosMock
        .onPut(`/revisions/${revisionId.toHexString()}/files/bal`)
        .replyOnce(200);
      axiosMock
        .onPost(`/revisions/${revisionId.toHexString()}/compute`)
        .replyOnce(200, { validation: { valid: true } });
      axiosMock
        .onPost(`/revisions/${revisionId.toHexString()}/publish`)
        .replyOnce(200, { _id: revisionId.toHexString() });

      // MOCK PUBLICATION API DEPOT
      axiosMock
        .onGet(`/communes/67482/current-revision`)
        .replyOnce(404, 'Aucune révision connue pour cette commune');
      const revisionId2 = new ObjectId();
      axiosMock
        .onPost(`/communes/67482/revisions`)
        .replyOnce(200, { _id: revisionId2.toHexString() });
      axiosMock
        .onPut(`/revisions/${revisionId2.toHexString()}/files/bal`)
        .replyOnce(200);
      axiosMock
        .onPost(`/revisions/${revisionId2.toHexString()}/compute`)
        .replyOnce(200, { validation: { valid: true } });
      axiosMock
        .onPost(`/revisions/${revisionId2.toHexString()}/publish`)
        .replyOnce(200, { _id: revisionId2.toHexString() });
      // RUN WORKER
      await harvestingWorker.run();
      // CHECK HARVEST
      const harvestRes: Harvest = await harvestModel.findOne({}).lean();
      const harvestExpected: Partial<Harvest> = {
        sourceId: 'datagouv-1234',
        status: StatusHarvestEnum.COMPLETED,
        updateStatus: StatusUpdateEnum.UPDATED,
      };
      expect(harvestRes).toMatchObject(harvestExpected);
      // CHECK REVISION
      const nbRevisions: number = await revisionModel.countDocuments();
      expect(nbRevisions).toBe(2);
    });

    it('Harvesting multi communes', async () => {
      // CREATE SOURCE
      const url = 'url-source';
      const sourceInit = {
        _id: `datagouv-1234`,
        title: 'title',
        description: 'desc',
        url,
        enabled: true,
        harvesting: {
          lastHarvest: new Date('1970-01-01'),
          harvestingSince: null,
        },
        organizationId: 'orgaId',
        _deleted: false,
      };
      await sourceModel.create(sourceInit);
      // CREATE ORGA
      const orgaInit = {
        _id: `orgaId`,
        name: 'orgaName',
        perimeters: [
          {
            type: 'commune',
            code: '31591',
          },
          {
            type: 'commune',
            code: '67482',
          },
        ],
      };
      await organizationModel.create(orgaInit);
      // MOCK URL SOURCE
      axiosMock
        .onGet(url)
        .replyOnce(200, readFile('1.3-not-valid-multi-commune.csv'));
      // RUN WORKER
      await harvestingWorker.run();
      // CHECK HARVEST
      const harvestRes: Harvest = await harvestModel.findOne({}).lean();
      const harvestExpected: Partial<Harvest> = {
        sourceId: 'datagouv-1234',
        status: StatusHarvestEnum.COMPLETED,
        updateStatus: StatusUpdateEnum.REJECTED,
      };
      expect(harvestRes).toMatchObject(harvestExpected);
      // CHECK REVISION
      const nbRevisions: number = await revisionModel.countDocuments();
      expect(nbRevisions).toBe(0);
    });
  });
});
