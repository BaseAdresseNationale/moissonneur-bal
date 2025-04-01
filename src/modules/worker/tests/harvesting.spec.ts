import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Logger } from '@nestjs/common';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { Client } from 'pg';
import { ObjectId } from 'mongodb';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import * as fs from 'fs';
import { join } from 'path';
import hasha from 'hasha';
import dotenv from 'dotenv';
dotenv.config();

import { ApiBetaGouvModule } from 'src/modules/api_beta_gouv/api_beta_gouv.module';
import { SourceService } from 'src/modules/source/source.service';
import { OrganizationService } from 'src/modules/organization/organization.service';
import { HarvestingWorker } from '../workers/harvesting.worker';
import { HttpModule } from '@nestjs/axios';
import { HandleFile } from '../workers/harvesting/handle_file';
import { HarvestService } from 'src/modules/harvest/harvest.service';
import { HandleCommune } from '../workers/harvesting/handle_commune';
import { ConfigModule } from '@nestjs/config';
import { RevisionService } from 'src/modules/revision/revision.service';
import { ApiDepotService } from 'src/modules/api_depot/api_depot.service';
import { FileService } from 'src/modules/file/file.service';

import { Organization } from '../../organization/organization.entity';
import {
  Perimeter,
  TypePerimeterEnum,
} from '../../organization/perimeters.entity';
import { Source } from '../../source/source.entity';
import {
  Revision,
  StatusPublicationEnum,
  UpdateStatusRevisionEnum,
} from 'src/modules/revision/revision.entity';
import {
  Harvest,
  StatusHarvestEnum,
  UpdateStatusHarvestEnum,
} from 'src/modules/harvest/harvest.entity';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';

process.env.API_DEPOT_CLIENTid = 'moissonneur-bal';

describe('HARVESTING WORKER', () => {
  let app: INestApplication;
  // DB
  let postgresContainer: StartedPostgreSqlContainer;
  let postgresClient: Client;
  let orgaRepository: Repository<Organization>;
  let sourceRepository: Repository<Source>;
  let harvestRepository: Repository<Harvest>;
  let revisionRepository: Repository<Revision>;
  // SERVICE
  let harvestingWorker: HarvestingWorker;
  let fileService: FileService;
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
        ApiBetaGouvModule,
        HttpModule,
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
        HarvestingWorker,
        SourceService,
        OrganizationService,
        HarvestService,
        RevisionService,
        HandleFile,
        FileService,
        HandleCommune,
        ApiDepotService,
        Logger,
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    harvestingWorker = app.get<HarvestingWorker>(HarvestingWorker);
    fileService = app.get<FileService>(FileService);
    // INIT REPOSITORY
    orgaRepository = app.get(getRepositoryToken(Organization));
    sourceRepository = app.get(getRepositoryToken(Source));
    harvestRepository = app.get(getRepositoryToken(Harvest));
    revisionRepository = app.get(getRepositoryToken(Revision));
    jest
      .spyOn(fileService, 'writeFile')
      .mockImplementation(() => Promise.resolve(new ObjectId().toHexString()));
  });

  beforeEach(async () => {
    axiosMock.onPost(`/validate/file`).reply(200, {
      parseOk: true,
      parseErrors: [],
      profilErrors: [],
      rows: [
        {
          isValid: true,
          rawValues: {},
          errors: [],
          parsedValues: { commune_insee: '31591' },
        },
      ],
    });
  });

  afterAll(async () => {
    await postgresClient.end();
    await postgresContainer.stop();
    await app.close();
    await axiosMock.reset();
  });

  afterEach(async () => {
    await revisionRepository.delete({});
    await harvestRepository.delete({});
    await sourceRepository.delete({});
    await orgaRepository.delete({});
    await axiosMock.resetHandlers();
  });

  function readFile(relativePath: string) {
    const absolutePath = join(__dirname, 'mock', relativePath);
    return fs.readFileSync(absolutePath);
  }

  async function createSource(props: Partial<Source> = {}) {
    const entityToInsert = sourceRepository.create(props);
    const result = await sourceRepository.save(entityToInsert);
    return result.id;
  }

  async function createHarvest(props: Partial<Harvest> = {}) {
    const entityToInsert = harvestRepository.create(props);
    const result = await harvestRepository.save(entityToInsert);
    return result.id;
  }

  async function createOrga(props: Partial<Organization> = {}) {
    const entityToInsert = orgaRepository.create(props);
    const result = await orgaRepository.save(entityToInsert);
    return result.id;
  }

  describe('RUN HarvestingWorker one commune', () => {
    it('First harvesting with no perimeter', async () => {
      // CREATE ORGA
      const orgaInit = {
        id: `orgaId`,
        name: 'orgaName',
        perimeters: [],
      };
      await createOrga(orgaInit);
      // CREATE SOURCE
      const url = 'url-source';
      const sourceInit = {
        id: `1234`,
        title: 'title',
        description: 'desc',
        url,
        enabled: true,
        lastHarvest: new Date('1970-01-01'),
        harvestingSince: null,
        organizationId: 'orgaId',
      };
      await createSource(sourceInit);
      // RETURN SOURCE URL DATA GOUV
      axiosMock.onGet(url).reply(200, readFile('1.3-valid.csv'));
      // RUN WORKER
      await harvestingWorker.run();
      // CHECK HARVEST FAIL
      const [harvestRes]: Harvest[] = await harvestRepository.find({});
      const harvestExpected: Partial<Harvest> = {
        sourceId: '1234',
        status: StatusHarvestEnum.COMPLETED,
        updateRejectionReason:
          'Les codes commune 31591 sont en dehors du périmètre',
        updateStatus: UpdateStatusHarvestEnum.REJECTED,
      };
      expect(harvestRes).toMatchObject(harvestExpected);
    });

    it('First harvesting', async () => {
      // CREATE ORGA
      const orgaInit = {
        id: `orgaId`,
        name: 'orgaName',
        perimeters: [
          {
            type: TypePerimeterEnum.COMMUNE,
            code: '31591',
          },
        ],
      };
      await createOrga(orgaInit);
      // CREATE SOURCE
      const url = 'url-source';
      const sourceInit = {
        id: `1234`,
        title: 'title',
        description: 'desc',
        url,
        enabled: true,
        lastHarvest: new Date('1970-01-01'),
        harvestingSince: null,
        organizationId: 'orgaId',
      };
      await createSource(sourceInit);
      // MOCK URL SOURCE
      axiosMock.onGet(url).replyOnce(200, readFile('1.3-valid.csv'));
      // MOCK PUBLICATION API DEPOT
      axiosMock
        .onGet(`/communes/31591/current-revision`)
        .replyOnce(404, 'Aucune révision connue pour cette commune');
      const revisionId = new ObjectId().toHexString();
      axiosMock
        .onPost(`/communes/31591/revisions`)
        .replyOnce(200, { id: revisionId });
      axiosMock.onPut(`/revisions/${revisionId}/files/bal`).replyOnce(200);
      axiosMock
        .onPost(`/revisions/${revisionId}/compute`)
        .replyOnce(200, { validation: { valid: true } });
      axiosMock
        .onPost(`/revisions/${revisionId}/publish`)
        .replyOnce(200, { id: revisionId });
      // RUN WORKER
      await harvestingWorker.run();
      // CHECK HARVEST
      const [harvestRes]: Harvest[] = await harvestRepository.find({});
      const harvestExpected: Partial<Harvest> = {
        sourceId: '1234',
        status: StatusHarvestEnum.COMPLETED,
        updateStatus: UpdateStatusHarvestEnum.UPDATED,
      };
      expect(harvestRes).toMatchObject(harvestExpected);
      // CHECK REVISION
      const [revisionRes]: Revision[] = await revisionRepository.find({});
      const revisionExpected: Partial<Revision> = {
        codeCommune: '31591',
        sourceId: '1234',
        harvestId: harvestRes.id,
        updateStatus: UpdateStatusRevisionEnum.UPDATED,
        validation: {
          nbRows: 1,
          nbRowsWithErrors: 0,
          uniqueErrors: [],
        },
        publication: {
          status: StatusPublicationEnum.PUBLISHED,
          publishedRevisionId: revisionId,
        },
      };
      expect(revisionRes).toMatchObject(revisionExpected);
      expect(revisionRes.createdAt).toBeInstanceOf(Date);
    });

    it('Harvesting with last harvest', async () => {
      // CREATE ORGA
      const orgaInit = {
        id: `orgaId`,
        name: 'orgaName',
        perimeters: [
          {
            type: TypePerimeterEnum.COMMUNE,
            code: '31591',
          },
        ],
      };
      await createOrga(orgaInit);
      // CREATE SOURCE
      const url = 'url-source';
      const sourceInit = {
        id: `1234`,
        title: 'title',
        description: 'desc',
        url,
        enabled: true,
        lastHarvest: new Date('1970-01-01'),
        harvestingSince: null,
        organizationId: 'orgaId',
      };
      await createSource(sourceInit);
      // CREATE ORGA
      const firstHarvest: Partial<Harvest> = {
        fileId: new ObjectId().toHexString(),
        sourceId: sourceInit.id,
        fileHash: 'currentFileHash',
        dataHash: 'currentDataHash',
      };
      const firstHarvestId = await createHarvest(firstHarvest);
      // MOCK URL SOURCE
      axiosMock.onGet(url).replyOnce(200, readFile('1.3-valid.csv'));
      // MOCK PUBLICATION API DEPOT
      const revisionId = new ObjectId().toHexString();
      axiosMock
        .onPost(`/communes/31591/revisions`)
        .replyOnce(200, { id: revisionId });
      axiosMock.onPut(`/revisions/${revisionId}/files/bal`).replyOnce(200);
      axiosMock
        .onPost(`/revisions/${revisionId}/compute`)
        .replyOnce(200, { validation: { valid: true } });
      axiosMock
        .onPost(`/revisions/${revisionId}/publish`)
        .replyOnce(200, { id: revisionId });
      axiosMock.onGet(`/communes/31591/current-revision`).replyOnce(200, {
        client: { id: 'id_moissonneur-bal', legacyId: 'moissonneur-bal' },
      });
      // RUN WORKER
      await harvestingWorker.run();
      // CHECK HARVEST
      const harvestRes: Harvest = await harvestRepository.findOneBy({
        id: Not(firstHarvestId),
      });
      const harvestExpected: Partial<Harvest> = {
        sourceId: '1234',
        status: StatusHarvestEnum.COMPLETED,
        updateStatus: UpdateStatusHarvestEnum.UPDATED,
      };
      expect(harvestRes).toMatchObject(harvestExpected);
      // CHECK REVISION
      const [revisionRes]: Revision[] = await revisionRepository.find({});
      const revisionExpected: Partial<Revision> = {
        codeCommune: '31591',
        sourceId: '1234',
        harvestId: harvestRes.id,
        updateStatus: UpdateStatusRevisionEnum.UPDATED,
        validation: {
          nbRows: 1,
          nbRowsWithErrors: 0,
          uniqueErrors: [],
        },
        publication: {
          status: StatusPublicationEnum.PUBLISHED,
          publishedRevisionId: revisionId,
        },
      };
      expect(revisionRes).toMatchObject(revisionExpected);
      expect(revisionRes.createdAt).toBeInstanceOf(Date);
    });

    it('Harvesting with last harvest (file no change)', async () => {
      // CREATE ORGA
      const orgaInit = {
        id: `orgaId`,
        name: 'orgaName',
        perimeters: [
          {
            type: TypePerimeterEnum.COMMUNE,
            code: '31591',
          },
        ],
      };
      await createOrga(orgaInit);
      // CREATE SOURCE
      const url = 'url-source';
      const sourceInit = {
        id: `1234`,
        title: 'title',
        description: 'desc',
        url,
        enabled: true,
        lastHarvest: new Date('1970-01-01'),
        harvestingSince: null,
        organizationId: 'orgaId',
      };
      await createSource(sourceInit);
      // CREATE ORGA
      const file = readFile('1.3-valid.csv');
      const fileHash = hasha(file, { algorithm: 'sha256' });
      const fileId = new ObjectId().toHexString();
      const dataHash = 'currentDataHash';
      const firstHarvest: Partial<Harvest> = {
        sourceId: `1234`,
        status: StatusHarvestEnum.COMPLETED,
        fileId,
        fileHash,
        dataHash,
        finishedAt: new Date(),
      };
      const firstHarvestId = await createHarvest(firstHarvest);
      // MOCK URL SOURCE
      axiosMock.onGet(url).replyOnce(200, file);
      // RUN WORKER
      await harvestingWorker.run();
      // CHECK HARVEST
      const harvestRes: Harvest = await harvestRepository.findOneBy({
        id: Not(firstHarvestId),
      });
      const harvestExpected: Partial<Harvest> = {
        sourceId: '1234',
        status: StatusHarvestEnum.COMPLETED,
        updateStatus: UpdateStatusHarvestEnum.UNCHANGED,
        fileId,
        fileHash,
      };
      expect(harvestRes).toMatchObject(harvestExpected);
      // CHECK REVISION
      const revisionRes: Revision[] = await revisionRepository.find({});
      expect(revisionRes).toEqual([]);
    });

    it('Harvesting with not valide bal', async () => {
      // CREATE ORGA
      const orgaInit = {
        id: `orgaId`,
        name: 'orgaName',
        perimeters: [
          {
            type: TypePerimeterEnum.COMMUNE,
            code: '31591',
          },
        ],
      };
      await createOrga(orgaInit);
      // CREATE SOURCE
      const url = 'url-source';
      const sourceInit = {
        id: `1234`,
        title: 'title',
        description: 'desc',
        url,
        enabled: true,
        lastHarvest: new Date('1970-01-01'),
        harvestingSince: null,
        organizationId: 'orgaId',
      };
      await createSource(sourceInit);

      // MOCK URL SOURCE
      const file = readFile('1.3-not-valid.csv');
      const fileHash = hasha(file, { algorithm: 'sha256' });
      axiosMock.onGet(url).replyOnce(200, file);
      axiosMock.onPost(`/validate/file`).reply(200, {
        parseOk: true,
        parseErrors: [],
        profilErrors: [],
        rows: [{ isValid: false }],
      });
      // RUN WORKER
      await harvestingWorker.run();
      // CHECK HARVEST
      const [harvestRes]: Harvest[] = await harvestRepository.find({});
      const harvestExpected: Partial<Harvest> = {
        sourceId: '1234',
        status: StatusHarvestEnum.COMPLETED,
        updateStatus: UpdateStatusHarvestEnum.REJECTED,
        fileHash,
      };
      expect(harvestRes).toMatchObject(harvestExpected);
      // CHECK REVISION
      const revisionRes: Revision[] = await revisionRepository.find({});
      expect(revisionRes).toEqual([]);
    });

    it('Harvesting provide other client', async () => {
      // CREATE ORGA
      const orgaInit = {
        id: `orgaId`,
        name: 'orgaName',
        perimeters: [
          {
            type: TypePerimeterEnum.COMMUNE,
            code: '31591',
          },
        ],
      };
      await createOrga(orgaInit);
      // CREATE SOURCE
      const url = 'url-source';
      const sourceInit = {
        id: `1234`,
        title: 'title',
        description: 'desc',
        url,
        enabled: true,
        lastHarvest: new Date('1970-01-01'),
        harvestingSince: null,
        organizationId: 'orgaId',
      };
      await createSource(sourceInit);

      // MOCK URL SOURCE
      axiosMock.onGet(url).replyOnce(200, readFile('1.3-valid.csv'));
      // MOCK PUBLICATION API DEPOT
      axiosMock.onGet(`/communes/31591/current-revision`).replyOnce(200, {
        client: { id: 'id_other-client', legacyId: 'spec-other-client' },
      });
      // RUN WORKER
      await harvestingWorker.run();
      // CHECK HARVEST
      const [harvestRes]: Harvest[] = await harvestRepository.find({});
      const harvestExpected: Partial<Harvest> = {
        sourceId: '1234',
        status: StatusHarvestEnum.COMPLETED,
        updateStatus: UpdateStatusHarvestEnum.UPDATED,
      };
      expect(harvestRes).toMatchObject(harvestExpected);
      // CHECK REVISION
      const [revisionRes]: Revision[] = await revisionRepository.find({});
      const revisionExpected: Partial<Revision> = {
        codeCommune: '31591',
        sourceId: '1234',
        harvestId: harvestRes.id,
        updateStatus: UpdateStatusRevisionEnum.UPDATED,
        validation: {
          nbRows: 1,
          nbRowsWithErrors: 0,
          uniqueErrors: [],
        },
        publication: {
          status: StatusPublicationEnum.PROVIDED_BY_OTHER_CLIENT,
          currentClientId: 'id_other-client',
        },
      };
      expect(revisionRes).toMatchObject(revisionExpected);
      expect(revisionRes.createdAt).toBeInstanceOf(Date);
    });
    it('Harvesting provide other source', async () => {
      // CREATE ORGA
      const orgaInit = {
        id: `orgaId`,
        name: 'orgaName',
        perimeters: [
          {
            type: TypePerimeterEnum.COMMUNE,
            code: '31591',
          },
        ],
      };
      await createOrga(orgaInit);
      // CREATE SOURCE
      const url = 'url-source';
      const sourceInit = {
        id: `1234`,
        title: 'title',
        description: 'desc',
        url,
        enabled: true,
        lastHarvest: new Date('1970-01-01'),
        harvestingSince: null,
        organizationId: 'orgaId',
      };
      await createSource(sourceInit);

      // MOCK URL SOURCE
      axiosMock.onGet(url).replyOnce(200, readFile('1.3-valid.csv'));
      // MOCK PUBLICATION API DEPOT
      axiosMock.onGet(`/communes/31591/current-revision`).replyOnce(200, {
        context: { extras: { sourceId: 'other-source' } },
      });
      // RUN WORKER
      await harvestingWorker.run();
      // CHECK HARVEST
      const [harvestRes]: Harvest[] = await harvestRepository.find({});
      const harvestExpected: Partial<Harvest> = {
        sourceId: '1234',
        status: StatusHarvestEnum.COMPLETED,
        updateStatus: UpdateStatusHarvestEnum.UPDATED,
      };
      expect(harvestRes).toMatchObject(harvestExpected);
      // CHECK REVISION
      const [revisionRes]: Revision[] = await revisionRepository.find({});
      const revisionExpected: Partial<Revision> = {
        codeCommune: '31591',
        sourceId: '1234',
        harvestId: harvestRes.id,
        updateStatus: UpdateStatusRevisionEnum.UPDATED,
        validation: {
          nbRows: 1,
          nbRowsWithErrors: 0,
          uniqueErrors: [],
        },
        publication: {
          status: StatusPublicationEnum.PROVIDED_BY_OTHER_SOURCE,
          currentSourceId: 'other-source',
        },
      };
      expect(revisionRes).toMatchObject(revisionExpected);
      expect(revisionRes.createdAt).toBeInstanceOf(Date);
    });
  });

  describe('RUN HarvestingWorker multi commune', () => {
    it('Harvesting multi communes', async () => {
      // CREATE ORGA
      const orgaInit = {
        id: `orgaId`,
        name: 'orgaName',
        perimeters: [
          {
            type: TypePerimeterEnum.COMMUNE,
            code: '31591',
          },
          {
            type: TypePerimeterEnum.COMMUNE,
            code: '67482',
          },
        ],
      };
      await createOrga(orgaInit);
      // CREATE SOURCE
      const url = 'url-source';
      const sourceInit = {
        id: `1234`,
        title: 'title',
        description: 'desc',
        url,
        enabled: true,
        lastHarvest: new Date('1970-01-01'),
        harvestingSince: null,
        organizationId: 'orgaId',
      };
      await createSource(sourceInit);
      axiosMock.onPost(`/validate/file`).reply(200, {
        parseOk: true,
        parseErrors: [],
        profilErrors: [],
        rows: [
          {
            isValid: true,
            rawValues: {},
            errors: [],
            parsedValues: { commune_insee: '31591' },
          },
          {
            isValid: true,
            rawValues: {},
            errors: [],
            parsedValues: { commune_insee: '67482' },
          },
        ],
      });
      // MOCK URL SOURCE
      axiosMock
        .onGet(url)
        .replyOnce(200, readFile('1.3-valid-multi-commune.csv'));
      // MOCK PUBLICATION API DEPOT
      axiosMock
        .onGet(`/communes/31591/current-revision`)
        .replyOnce(404, 'Aucune révision connue pour cette commune');
      const revisionId = new ObjectId().toHexString();
      axiosMock
        .onPost(`/communes/31591/revisions`)
        .replyOnce(200, { id: revisionId });
      axiosMock.onPut(`/revisions/${revisionId}/files/bal`).replyOnce(200);
      axiosMock
        .onPost(`/revisions/${revisionId}/compute`)
        .replyOnce(200, { validation: { valid: true } });
      axiosMock
        .onPost(`/revisions/${revisionId}/publish`)
        .replyOnce(200, { id: revisionId });
      // MOCK PUBLICATION API DEPOT
      axiosMock
        .onGet(`/communes/67482/current-revision`)
        .replyOnce(404, 'Aucune révision connue pour cette commune');
      const revisionId2 = new ObjectId().toHexString();
      axiosMock
        .onPost(`/communes/67482/revisions`)
        .replyOnce(200, { id: revisionId2 });
      axiosMock.onPut(`/revisions/${revisionId2}/files/bal`).replyOnce(200);
      axiosMock
        .onPost(`/revisions/${revisionId2}/compute`)
        .replyOnce(200, { validation: { valid: true } });
      axiosMock
        .onPost(`/revisions/${revisionId2}/publish`)
        .replyOnce(200, { id: revisionId2 });
      // RUN WORKER
      await harvestingWorker.run();
      // CHECK HARVEST
      const [harvestRes]: Harvest[] = await harvestRepository.find({});
      const harvestExpected: Partial<Harvest> = {
        sourceId: '1234',
        status: StatusHarvestEnum.COMPLETED,
        updateStatus: UpdateStatusHarvestEnum.UPDATED,
      };
      expect(harvestRes).toMatchObject(harvestExpected);
      // CHECK REVISION
      const nbRevisions: number = await revisionRepository.count({});
      expect(nbRevisions).toBe(2);
    });

    it('Harvesting multi communes', async () => {
      // CREATE ORGA
      const orgaInit = {
        id: `orgaId`,
        name: 'orgaName',
        perimeters: [
          {
            type: TypePerimeterEnum.COMMUNE,
            code: '31591',
          },
          {
            type: TypePerimeterEnum.COMMUNE,
            code: '67482',
          },
        ],
      };
      await createOrga(orgaInit);
      // CREATE SOURCE
      const url = 'url-source';
      const sourceInit = {
        id: `1234`,
        title: 'title',
        description: 'desc',
        url,
        enabled: true,
        lastHarvest: new Date('1970-01-01'),
        harvestingSince: null,
        organizationId: 'orgaId',
      };
      await createSource(sourceInit);
      axiosMock.onPost(`/validate/file`).reply(200, {
        parseOk: true,
        parseErrors: [],
        profilErrors: [],
        rows: [
          {
            isValid: false,
            rawValues: {},
            errors: [],
            parsedValues: { commune_insee: '31591' },
          },
          {
            isValid: true,
            rawValues: {},
            errors: [],
            parsedValues: { commune_insee: '67482' },
          },
        ],
      });
      // MOCK URL SOURCE
      axiosMock
        .onGet(url)
        .replyOnce(200, readFile('1.3-not-valid-multi-commune.csv'));
      // RUN WORKER
      await harvestingWorker.run();
      // CHECK HARVEST
      const [harvestRes]: Harvest[] = await harvestRepository.find({});
      const harvestExpected: Partial<Harvest> = {
        sourceId: '1234',
        status: StatusHarvestEnum.COMPLETED,
        updateStatus: UpdateStatusHarvestEnum.REJECTED,
      };
      expect(harvestRes).toMatchObject(harvestExpected);
      // CHECK REVISION
      const nbRevisions: number = await revisionRepository.count();
      expect(nbRevisions).toBe(0);
    });
  });
});
