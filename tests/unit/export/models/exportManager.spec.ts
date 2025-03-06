import jsLogger from '@map-colonies/js-logger';
import { trace } from '@opentelemetry/api';
import nock from 'nock';
import { v4 as uuidv4 } from 'uuid';
import { container } from 'tsyringe';
import { SERVICES } from '@src/common/constants';
import { ExportManager } from '@src/export/models/exportManager';
import {
  createExportRequestNoRoiWithCallback,
  createExportRequestWithoutCallback,
  createExportResponse,
  getJobStatusByIdResponse,
  initExportRequestBody,
  initExportRequestBodyNoRoiWithCallback,
  initExportResponse,
  layerInfo,
} from '@tests/mocks/data';
import { NotFoundError } from '@map-colonies/error-types';
import { completedExportJobsResponse, completedExportParams, completedJobCallback } from '@tests/mocks/completedReqest';
import {
  findCriteria,
  inProgressExportParams,
  inProgressJobsResponse,
  pendingExportParams,
  processingResponse,
} from '@tests/mocks/processingRequest';
import { JobExportResponse } from '@src/common/interfaces';
import { ValidationManager } from '../../../../src/export/models/validationManager';
import { configMock, registerDefaultConfig, clear as clearConfig } from '../../../mocks/config';
import { JobManagerWrapper } from '../../../../src/clients/jobManagerWrapper';
import { RasterCatalogManagerClient } from '../../../../src/clients/rasterCatalogManagerClient';

let exportManager: ExportManager;
jest.mock('uuid', () => ({
  v4: jest.fn(),
}));

describe('ExportManager', () => {
  registerDefaultConfig();
  const catalogManagerURL = configMock.get<string>('externalClientsConfig.clientsUrls.rasterCatalogManager.url');
  const jobManagerURL = configMock.get<string>('externalClientsConfig.clientsUrls.jobManager.url');
  beforeEach(() => {
    registerDefaultConfig();
    const logger = jsLogger({ enabled: false });
    container.register(SERVICES.LOGGER, { useValue: logger });
    const jobManagerWrapper = new JobManagerWrapper(logger, trace.getTracer('testTracer'));
    const catalogManagerClient = new RasterCatalogManagerClient(logger, trace.getTracer('testTracer'));
    const validationManager = new ValidationManager(configMock, logger, trace.getTracer('testTracer'), jobManagerWrapper, catalogManagerClient);
    exportManager = new ExportManager(configMock, logger, trace.getTracer('testTracer'), jobManagerWrapper, validationManager);
  });

  afterEach(() => {
    nock.cleanAll();
    clearConfig();
    jest.useRealTimers();
    jest.resetAllMocks();
  });
  describe('getJobStatusByJobId', () => {
    it('should successfully return job status by jobId', async () => {
      const jobRequest = inProgressJobsResponse[0] as unknown as JobExportResponse;
      nock(jobManagerURL).get(`/jobs/${jobRequest.id}`).query({ shouldReturnTasks: false }).reply(200, jobRequest);

      const response = await exportManager.getJobStatusByJobId(jobRequest.id);

      expect(response).toEqual(getJobStatusByIdResponse);
    });
    it('should throw NotFoundError when jobId doesnt exist', async () => {
      const jobRequest = inProgressJobsResponse[0] as unknown as JobExportResponse;
      nock(jobManagerURL).get(`/jobs/${jobRequest.id}`).query({ shouldReturnTasks: false }).reply(404, []);

      const action = async () => exportManager.getJobStatusByJobId(jobRequest.id);

      await expect(action()).rejects.toThrow(NotFoundError);
    });
  });

  describe('createExport', () => {
    it('should create an init export job successfully', async () => {
      const layerId = createExportRequestWithoutCallback.dbId;
      (uuidv4 as jest.Mock).mockReturnValue(initExportRequestBody.additionalIdentifiers);
      jest.spyOn(Date.prototype, 'toJSON').mockReturnValue('2025_01_09T10_04_06_711Z');
      nock(catalogManagerURL).post(`/records/find`, { id: layerId }).reply(200, [layerInfo]);
      nock(jobManagerURL)
        .get('/jobs')
        .query(completedExportParams as Record<string, string>)
        .reply(200, undefined);
      nock(jobManagerURL)
        .get('/jobs')
        .query(inProgressExportParams as Record<string, string>)
        .reply(200, undefined);
      nock(jobManagerURL)
        .get('/jobs')
        .query(pendingExportParams as Record<string, string>)
        .reply(200, undefined);
      nock(jobManagerURL)
        .post(`/jobs/find`, findCriteria as Record<string, string>)
        .reply(200, inProgressJobsResponse);

      nock(jobManagerURL).post(`/jobs`, initExportRequestBody).reply(200, initExportResponse);

      const result = await exportManager.createExport(createExportRequestWithoutCallback);
      expect(result).toStrictEqual(createExportResponse);
    });

    it('should return completed export job', async () => {
      const layerId = createExportRequestWithoutCallback.dbId;

      nock(catalogManagerURL).post(`/records/find`, { id: layerId }).reply(200, [layerInfo]);
      nock(jobManagerURL)
        .get('/jobs')
        .query(completedExportParams as Record<string, string>)
        .reply(200, completedExportJobsResponse);
      nock(jobManagerURL)
        .get(`/jobs/${completedExportJobsResponse[0].id}`)
        .query({ shouldReturnTasks: false })
        .reply(200, completedExportJobsResponse[0])
        .persist();

      const result = await exportManager.createExport(createExportRequestWithoutCallback);
      expect(result).toEqual(completedJobCallback);
    });

    it('should return processing in-progress job', async () => {
      const layerId = createExportRequestWithoutCallback.dbId;

      nock(catalogManagerURL).post(`/records/find`, { id: layerId }).reply(200, [layerInfo]);
      nock(jobManagerURL)
        .get('/jobs')
        .query(completedExportParams as Record<string, string>)
        .reply(200, [])
        .persist();
      nock(jobManagerURL)
        .get('/jobs')
        .query(inProgressExportParams as Record<string, string>)
        .reply(200, inProgressJobsResponse);
      nock(jobManagerURL)
        .get(`/jobs/${inProgressJobsResponse[0].id}`)
        .query({ shouldReturnTasks: false })
        .reply(200, inProgressJobsResponse[0])
        .persist();
      nock(jobManagerURL).get(`/jobs/${inProgressJobsResponse[1].id}`).query({ shouldReturnTasks: false }).reply(200, inProgressJobsResponse[1]);
      nock(jobManagerURL)
        .get('/jobs')
        .query(pendingExportParams as Record<string, string>)
        .reply(200, []);

      nock(jobManagerURL).put(`/jobs/${inProgressJobsResponse[0].id}`, JSON.stringify(inProgressJobsResponse[0].parameters)).reply(200, []);
      const result = await exportManager.createExport(createExportRequestWithoutCallback);
      expect(result).toEqual(processingResponse);
    });

    it('should throw notFound error on non-existing layer', async () => {
      const layerId = createExportRequestWithoutCallback.dbId;

      nock(catalogManagerURL).post(`/records/find`, { id: layerId }).reply(200, []);
      const action = async () => exportManager.createExport(createExportRequestWithoutCallback);
      await expect(action()).rejects.toThrow(NotFoundError);
    });

    it('should create init export job when no roi provided and with callback', async () => {
      const layerId = createExportRequestWithoutCallback.dbId;
      (uuidv4 as jest.Mock).mockReturnValue(initExportRequestBodyNoRoiWithCallback.additionalIdentifiers);

      nock(catalogManagerURL).post(`/records/find`, { id: layerId }).reply(200, [layerInfo]);
      nock(jobManagerURL)
        .get('/jobs')
        .query(completedExportParams as Record<string, string>)
        .reply(200, undefined);
      nock(jobManagerURL)
        .get('/jobs')
        .query(inProgressExportParams as Record<string, string>)
        .reply(200, undefined);
      nock(jobManagerURL)
        .get('/jobs')
        .query(pendingExportParams as Record<string, string>)
        .reply(200, undefined);
      nock(jobManagerURL)
        .post(`/jobs/find`, findCriteria as Record<string, string>)
        .reply(200, inProgressJobsResponse);

      nock(jobManagerURL).post(`/jobs`, initExportRequestBodyNoRoiWithCallback).reply(200, initExportResponse);
      jest.spyOn(Date.prototype, 'toJSON').mockReturnValue('2025_01_09T12_39_36_961Z');

      const result = await exportManager.createExport(createExportRequestNoRoiWithCallback);
      expect(result).toStrictEqual(createExportResponse);
    });
  });
});
