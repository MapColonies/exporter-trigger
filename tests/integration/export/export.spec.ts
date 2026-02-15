import { v4 as uuidv4 } from 'uuid';
import httpStatusCodes from 'http-status-codes';
import { initConfig } from '@src/common/config';
import { configMock } from '@tests/mocks/config';
import {
  createExportDuplicateResponseTestCases,
  createExportInvalidMaxZoomLevel,
  createExportInvalidMinZoomLevel,
  createExportNotIntersectedPolygon,
  createExportRequestNoRoiWithCallback,
  createExportRequestWithoutCallback,
  createExportRequestWithoutRoi,
  createExportRequestWithRoiAndCallback,
  createExportRequestWithRoiAndNewCallback,
  createExportResponse,
  getJobStatusByIdResponse,
  initExportRequestBody,
  initExportRequestBodyNoRoiWithCallback,
  initExportRequestBodyWithMultiPolygon,
  initExportResponse,
  layerInfo,
} from '@tests/mocks/data';
import nock from 'nock';
import {
  completedExportJobsResponse,
  completedExportJobsResponseWithBufferedRoi,
  completedExportJobWithMultiPolygonResponse,
  completedExportJobWithMultiPolygonRoiForMultiPolygonLayer,
  completedExportParams,
  completedJobCallback,
  completedJobCallbackWithBufferedRoi,
  completedJobCallbackWithMultiPolygon,
} from '@tests/mocks/completedReqest';
import {
  addedCallbackUrl,
  findCriteria,
  inProgressExportParams,
  inProgressJobsResponse,
  pendingExportParams,
  processingResponse,
} from '@tests/mocks/processingRequest';
import { ValidationManager } from '@src/export/models/validationManager';
import { CallbackUrlsTargetArray, ExportJobParameters } from '@map-colonies/raster-shared';
import { JobExportResponse } from '@src/common/interfaces';
import { JobManagerWrapper } from '@src/clients/jobManagerWrapper';
import { layerWithMultiPolygonFootprint } from '@tests/mocks/geometryMocks';
import { CreateExportRequest } from '@src/utils/zod/schemas';
import { getTestContainerConfig, resetContainer } from '../testContainerConfig';
import { getApp } from '../../../src/app';
import { ExportSender } from './helpers/exportSender';

jest.mock('uuid', () => ({ v4: jest.fn() }));

describe('export', function () {
  let requestSender: ExportSender;
  let catalogManagerURL: string;
  let jobManagerURL: string;

  beforeAll(async function () {
    await initConfig(true);
  });

  beforeEach(async function () {
    const [app] = await getApp({ override: [...getTestContainerConfig()], useChild: false });
    requestSender = new ExportSender(app);
    catalogManagerURL = configMock.get<string>('externalClientsConfig.clientsUrls.rasterCatalogManager.url');
    jobManagerURL = configMock.get<string>('externalClientsConfig.clientsUrls.jobManager.url');
  });

  afterEach(function () {
    nock.cleanAll();
    resetContainer();
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  describe('create', function () {
    describe('Happy Path', function () {
      it('should return 200 status code and create an export init', async function () {
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

        const response = await requestSender.export(createExportRequestWithoutCallback);

        expect(response.body).toEqual(createExportResponse);

        expect(response.status).toBe(httpStatusCodes.OK);
        expect(response).toSatisfyApiSpec();
      });

      it('should return 200 status code and return completed job', async function () {
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

        const response = await requestSender.export(createExportRequestWithoutCallback);

        expect(response.body).toEqual(completedJobCallback);

        expect(response.status).toBe(httpStatusCodes.OK);
        expect(response).toSatisfyApiSpec();
      });

      it('should return 200 status code and return completed job when roi is contained by buffer of job roi', async function () {
        const layerId = createExportRequestWithoutCallback.dbId;

        nock(catalogManagerURL).post(`/records/find`, { id: layerId }).reply(200, [layerInfo]);
        nock(jobManagerURL)
          .get('/jobs')
          .query(completedExportParams as Record<string, string>)
          .reply(200, completedExportJobsResponseWithBufferedRoi);
        nock(jobManagerURL)
          .get(`/jobs/${completedExportJobsResponseWithBufferedRoi[0].id}`)
          .query({ shouldReturnTasks: false })
          .reply(200, completedExportJobsResponseWithBufferedRoi[0])
          .persist();

        const response = await requestSender.export(createExportRequestWithoutCallback);

        expect(response.body).toEqual(completedJobCallbackWithBufferedRoi);

        expect(response.status).toBe(httpStatusCodes.OK);
        expect(response).toSatisfyApiSpec();
      });

      it('should return 200 status code and return completed job on race condition', async function () {
        const layerId = createExportRequestWithoutCallback.dbId;

        nock(catalogManagerURL).post(`/records/find`, { id: layerId }).reply(200, [layerInfo]);
        nock(jobManagerURL)
          .get('/jobs')
          .query(completedExportParams as Record<string, string>)
          .reply(200, []);
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

        nock(jobManagerURL)
          .get('/jobs')
          .query(completedExportParams as Record<string, string>)
          .reply(200, completedExportJobsResponse);
        nock(jobManagerURL)
          .get(`/jobs/${completedExportJobsResponse[0].id}`)
          .query({ shouldReturnTasks: false })
          .reply(200, completedExportJobsResponse[0])
          .persist();

        const response = await requestSender.export(createExportRequestWithoutCallback);

        expect(response.body).toEqual(completedJobCallback);

        expect(response.status).toBe(httpStatusCodes.OK);
        expect(response).toSatisfyApiSpec();
      });

      it('should return 200 status code and return a processing job', async function () {
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

        const response = await requestSender.export(createExportRequestWithoutCallback);

        expect(response.body).toEqual(processingResponse);

        expect(response.status).toBe(httpStatusCodes.OK);
        expect(response).toSatisfyApiSpec();
      });

      it('should return 200 status code , create init job when no roi provided and with callback', async function () {
        const layerId = createExportRequestWithoutCallback.dbId;
        (uuidv4 as jest.Mock).mockReturnValue(initExportRequestBodyNoRoiWithCallback.additionalIdentifiers);
        jest.spyOn(Date.prototype, 'toJSON').mockReturnValue('2025_01_09T12_39_36_961Z');
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

        const response = await requestSender.export(createExportRequestNoRoiWithCallback);

        expect(response.body).toEqual(createExportResponse);

        expect(response.status).toBe(httpStatusCodes.OK);
        expect(response).toSatisfyApiSpec();
      });
      it('should return 200 status code, return a processing job and add non duplicate callbackUrls', async function () {
        const layerId = createExportRequestNoRoiWithCallback.dbId;
        const duplicateJob = [{ ...inProgressJobsResponse[0] }];
        const updatedCallbackParameters = JSON.parse(JSON.stringify(duplicateJob[0].parameters)) as ExportJobParameters;
        (updatedCallbackParameters.exportInputParams.callbackUrls as CallbackUrlsTargetArray).push(addedCallbackUrl[0]);

        nock(catalogManagerURL).post(`/records/find`, { id: layerId }).reply(200, [layerInfo]);
        nock(jobManagerURL)
          .get('/jobs')
          .query(completedExportParams as Record<string, string>)
          .reply(200, [])
          .persist();
        nock(jobManagerURL)
          .get('/jobs')
          .query(inProgressExportParams as Record<string, string>)
          .reply(200, duplicateJob);
        nock(jobManagerURL).get(`/jobs/${duplicateJob[0].id}`).query({ shouldReturnTasks: false }).reply(200, duplicateJob[0]).persist();
        nock(jobManagerURL)
          .get('/jobs')
          .query(pendingExportParams as Record<string, string>)
          .reply(200, []);
        nock(jobManagerURL)
          .post(`/jobs/find`, findCriteria as Record<string, string>)
          .reply(200, []);

        nock(jobManagerURL)
          .put(`/jobs/${duplicateJob[0].id}`, JSON.stringify({ parameters: updatedCallbackParameters }))
          .reply(200, []);

        const response = await requestSender.export(createExportRequestWithRoiAndNewCallback);

        expect(response.body).toEqual(processingResponse);

        expect(response.status).toBe(httpStatusCodes.OK);
        expect(response).toSatisfyApiSpec();
      });

      it('should return 200 status code, return a processing job and add new callbackUrls', async function () {
        const layerId = createExportRequestNoRoiWithCallback.dbId;
        const duplicateJob = [{ ...inProgressJobsResponse[0] }];
        // Perform a deep copy of the parameters object
        const updatedCallbackParameters = JSON.parse(JSON.stringify(duplicateJob[0].parameters)) as ExportJobParameters;
        // Use type assertion to safely delete the property
        delete (duplicateJob[0].parameters.exportInputParams as { callbackUrls?: unknown }).callbackUrls;

        nock(catalogManagerURL).post(`/records/find`, { id: layerId }).reply(200, [layerInfo]);
        nock(jobManagerURL)
          .get('/jobs')
          .query(completedExportParams as Record<string, string>)
          .reply(200, [])
          .persist();
        nock(jobManagerURL)
          .get('/jobs')
          .query(inProgressExportParams as Record<string, string>)
          .reply(200, duplicateJob);
        nock(jobManagerURL).get(`/jobs/${duplicateJob[0].id}`).query({ shouldReturnTasks: false }).reply(200, duplicateJob[0]).persist();
        nock(jobManagerURL)
          .get('/jobs')
          .query(pendingExportParams as Record<string, string>)
          .reply(200, []);
        nock(jobManagerURL)
          .post(`/jobs/find`, findCriteria as Record<string, string>)
          .reply(200, []);

        nock(jobManagerURL)
          .put(`/jobs/${duplicateJob[0].id}`, JSON.stringify({ parameters: updatedCallbackParameters }))
          .reply(200, []);

        const response = await requestSender.export(createExportRequestWithRoiAndCallback);

        expect(response.body).toEqual(processingResponse);

        expect(response.status).toBe(httpStatusCodes.OK);
        expect(response).toSatisfyApiSpec();
      });

      test.each(createExportDuplicateResponseTestCases)(
        '$description',
        async function (testCase) {
          const {
            findLayerParams,
            layerMetadataResponse,
            duplicationParams,
            duplicateJobsResponseWithoutParams,
            duplicateJobResponseWithParams,
            request,
            expected,
          } = testCase;

          nock(catalogManagerURL).post(`/records/find`, findLayerParams).reply(200, layerMetadataResponse);
          nock(jobManagerURL)
            .get('/jobs')
            .query(duplicationParams as Record<string, string>)
            .reply(200, duplicateJobsResponseWithoutParams);
          nock(jobManagerURL)
            .get(`/jobs/${duplicateJobsResponseWithoutParams[0].id}`)
            .query({ shouldReturnTasks: false })
            .reply(200, duplicateJobResponseWithParams);
          nock(jobManagerURL).put(`/jobs/${duplicateJobsResponseWithoutParams[0].id}`).reply(200);
          jest
            .spyOn(JobManagerWrapper.prototype, 'updateJobExpirationDate')
            .mockResolvedValue(duplicateJobResponseWithParams.parameters.cleanupDataParams?.cleanupExpirationTimeUTC);

          const response = await requestSender.export(request);
          expect(response.body).toEqual(expected);
          expect(response.status).toBe(httpStatusCodes.OK);
        },
        1000000
      );

      it('should return 200 status code and create export job with MultiPolygon footprint from layer', async function () {
        // Create export request WITHOUT ROI (so it will use layer footprint)
        const createExportRequestWithMultiPolygon = {
          dbId: createExportRequestWithoutCallback.dbId,
          crs: createExportRequestWithoutCallback.crs,
          callbackURLs: [],
          description: 'lublub',
          // No ROI - will use layer footprint
        };

        const layerId = createExportRequestWithMultiPolygon.dbId;

        (uuidv4 as jest.Mock).mockReturnValue(initExportRequestBodyWithMultiPolygon.additionalIdentifiers);
        jest.spyOn(Date.prototype, 'toJSON').mockReturnValue('2025_01_09T10_04_06_711Z');

        nock(catalogManagerURL).post(`/records/find`, { id: layerId }).reply(200, [layerWithMultiPolygonFootprint]);
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

        nock(jobManagerURL).post(`/jobs`).reply(200, initExportResponse);

        const response = await requestSender.export(createExportRequestWithMultiPolygon);

        // Verify response creates new job with MultiPolygon footprint
        expect(response.body).toEqual(createExportResponse);
        expect(response.status).toBe(httpStatusCodes.OK);
        expect(response).toSatisfyApiSpec();
      });

      it('should return 200 status code and return completed job when no ROI provided with MultiPolygon footprint', async function () {
        const layerId = createExportRequestWithoutRoi.dbId;

        nock(catalogManagerURL).post(`/records/find`, { id: layerId }).reply(200, [layerWithMultiPolygonFootprint]);
        nock(jobManagerURL)
          .get('/jobs')
          .query(completedExportParams as Record<string, string>)
          .reply(200, completedExportJobWithMultiPolygonResponse);
        nock(jobManagerURL)
          .get(`/jobs/${completedExportJobWithMultiPolygonResponse[0].id}`)
          .query({ shouldReturnTasks: false })
          .reply(200, completedExportJobWithMultiPolygonResponse[0])
          .persist();

        const response = await requestSender.export(createExportRequestWithoutRoi);

        expect(response.body).toEqual(completedJobCallbackWithMultiPolygon);

        expect(response.status).toBe(httpStatusCodes.OK);
        expect(response).toSatisfyApiSpec();
      });

      it('should return 200 status code and return completed job when roi is multipolygon and contained by job multipolygon', async function () {
        const createExportRequestWithMultiPolygon = {
          dbId: createExportRequestWithoutCallback.dbId,
          crs: createExportRequestWithoutCallback.crs,
          callbackURLs: [],
          description: 'lublub',
          // No ROI - will use layer footprint
        };

        const layerId = createExportRequestWithMultiPolygon.dbId;

        (uuidv4 as jest.Mock).mockReturnValue(initExportRequestBodyWithMultiPolygon.additionalIdentifiers);
        jest.spyOn(Date.prototype, 'toJSON').mockReturnValue('2025_01_09T10_04_06_711Z');

        nock(catalogManagerURL).post(`/records/find`, { id: layerId }).reply(200, [layerWithMultiPolygonFootprint]);
        nock(jobManagerURL)
          .get('/jobs')
          .query(completedExportParams as Record<string, string>)
          .reply(200, completedExportJobWithMultiPolygonRoiForMultiPolygonLayer);
        nock(jobManagerURL)
          .get(`/jobs/${completedExportJobWithMultiPolygonRoiForMultiPolygonLayer[0].id}`)
          .query({ shouldReturnTasks: false })
          .reply(200, completedExportJobWithMultiPolygonRoiForMultiPolygonLayer[0])
          .persist();
        nock(jobManagerURL)
          .get('/jobs')
          .query(inProgressExportParams as Record<string, string>)
          .reply(200, undefined)
          .persist();
        nock(jobManagerURL)
          .get('/jobs')
          .query(pendingExportParams as Record<string, string>)
          .reply(200, undefined);
        nock(jobManagerURL)
          .post(`/jobs/find`, findCriteria as Record<string, string>)
          .reply(200, inProgressJobsResponse);

        nock(jobManagerURL).post(`/jobs`).reply(200, initExportResponse);

        const response = await requestSender.export(createExportRequestWithMultiPolygon);

        // Verify response creates new job with MultiPolygon footprint
        expect(response.body).toEqual(createExportResponse);
        expect(response.status).toBe(httpStatusCodes.OK);
        expect(response).toSatisfyApiSpec();
      });
    });

    describe('Bad Path', function () {
      it('should return 400 bad request when zod validation fails with invalid request body', async function () {
        // Send completely invalid request body that will fail Zod parsing
        const invalidRequest = {
          dbId: 123, // Should be string
          crs: ['invalid'], // Should be string
          priority: 'high', // Should be number
          roi: 'not-a-valid-geojson', // Should be valid FeatureCollection
          callbackURLs: 'not-an-array', // Should be array
        };

        const response = await requestSender.export(invalidRequest as unknown as CreateExportRequest);

        expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
        expect(response.body).toHaveProperty('message');
        expect(response).toSatisfyApiSpec();
      });

      it('should return 400 bad request when zod validation fails with missing required fields', async function () {
        // Send request without required dbId field
        const invalidRequest = {
          crs: 'EPSG:4326',
          description: 'test',
        };

        const response = await requestSender.export(invalidRequest as unknown as CreateExportRequest);

        expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
        expect(response.body).toHaveProperty('message');
        expect(response).toSatisfyApiSpec();
      });

      it('should return not found status code when layer not found', async function () {
        const layerId = createExportRequestWithoutCallback.dbId;

        nock(catalogManagerURL).post(`/records/find`, { id: layerId }).reply(200, []);
        const response = await requestSender.export(createExportRequestWithoutCallback);

        expect(response.status).toBe(httpStatusCodes.NOT_FOUND);
        expect(response).toSatisfyApiSpec();
      });

      it('should return bad request status code when dbId is not uuid', async function () {
        const invalidIdRequest = { ...createExportRequestWithoutCallback, dbId: 'invalid' };
        const response = await requestSender.export(invalidIdRequest);

        expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
        expect(response).toSatisfyApiSpec();
      });

      it('should return bad request status code when crs is not valid', async function () {
        const invalidIdRequest = { ...createExportRequestWithoutCallback, crs: 'invalid' };
        const response = await requestSender.export(invalidIdRequest);

        expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
        expect(response).toSatisfyApiSpec();
      });

      it('should return bad request when requested zoom level is bigger than maxZoom level', async function () {
        const layerId = createExportInvalidMaxZoomLevel.dbId;
        nock(catalogManagerURL).post(`/records/find`, { id: layerId }).reply(200, [layerInfo]);

        const response = await requestSender.export(createExportInvalidMaxZoomLevel);

        expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
        expect(response).toSatisfyApiSpec();
      });

      it('should return bad request when requested zoom level is smaller than minZoom level', async function () {
        const layerId = createExportInvalidMinZoomLevel.dbId;
        nock(catalogManagerURL).post(`/records/find`, { id: layerId }).reply(200, [layerInfo]);

        const response = await requestSender.export(createExportInvalidMinZoomLevel);

        expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
        expect(response).toSatisfyApiSpec();
      });

      it('should return bad request when requested polygon doesnt intersect with layer footprint', async function () {
        const layerId = createExportNotIntersectedPolygon.dbId;
        nock(catalogManagerURL).post(`/records/find`, { id: layerId }).reply(200, [layerInfo]);

        const response = await requestSender.export(createExportNotIntersectedPolygon);

        expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
        expect(response).toSatisfyApiSpec();
      });
    });

    describe('Sad Path', function () {
      it('should return internal server error when an error occurs in raster catalog', async function () {
        const layerId = createExportRequestWithoutCallback.dbId;

        nock(catalogManagerURL).post(`/records/find`, { id: layerId }).reply(500, []);
        const response = await requestSender.export(createExportRequestWithoutCallback);

        expect(response.status).toBe(httpStatusCodes.INTERNAL_SERVER_ERROR);
        expect(response).toSatisfyApiSpec();
      });

      it('should return internal server error when an error occurs in jobManager', async function () {
        const layerId = createExportRequestWithoutCallback.dbId;

        nock(catalogManagerURL).post(`/records/find`, { id: layerId }).reply(200, [layerInfo]);
        nock(jobManagerURL)
          .get('/jobs')
          .query(completedExportParams as Record<string, string>)
          .reply(500, []);
        const response = await requestSender.export(createExportRequestWithoutCallback);

        expect(response.status).toBe(httpStatusCodes.INTERNAL_SERVER_ERROR);
        expect(response).toSatisfyApiSpec();
      });

      it('should return insufficient storage error when not enough', async function () {
        const layerId = createExportRequestWithoutCallback.dbId;

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

        jest.spyOn(ValidationManager.prototype as unknown as { getFreeStorage: () => Promise<number> }, 'getFreeStorage').mockResolvedValue(1);

        const response = await requestSender.export(createExportRequestWithoutCallback);

        expect(response.status).toBe(httpStatusCodes.INSUFFICIENT_STORAGE);
        expect(response).toSatisfyApiSpec();
      });
    });
  });

  describe('getJobStatus', function () {
    describe('Happy Path', function () {
      it('should return 200 status code and the tasks matched the jobId', async function () {
        const jobRequest = inProgressJobsResponse[0] as unknown as JobExportResponse;

        nock(jobManagerURL).get(`/jobs/${jobRequest.id}`).query({ shouldReturnTasks: false }).reply(200, jobRequest);

        const response = await requestSender.getStatusByJobId(jobRequest.id);

        expect(response.body).toEqual(getJobStatusByIdResponse);

        expect(response).toSatisfyApiSpec();
        expect(response.status).toBe(httpStatusCodes.OK);
      });
    });

    describe('Sad Path', function () {
      it('should return 500 status code when internalServerError from job Manager', async function () {
        const jobId = '0c940a1b-67ca-45ec-b659-8428c8fa4c22';

        nock(jobManagerURL).get(`/jobs/${jobId}`).query({ shouldReturnTasks: false }).reply(500);
        const response = await requestSender.getStatusByJobId(jobId);

        expect(response).toSatisfyApiSpec();
        expect(response.status).toBe(httpStatusCodes.INTERNAL_SERVER_ERROR);
        expect.assertions(2);
      });
    });

    describe('Bad Path', function () {
      it('should return 400 status code when jobId is not a valid uuid', async function () {
        const jobId = 'string';

        const response = await requestSender.getStatusByJobId(jobId);

        expect(response).toSatisfyApiSpec();
        expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
      });

      it('should return 404 status code when no job was found', async function () {
        const jobId = '0c940a1b-67ca-45ec-b659-8428c8fa4c21';

        nock(jobManagerURL).get(`/jobs/${jobId}`).query({ shouldReturnTasks: false }).reply(404);

        const response = await requestSender.getStatusByJobId(jobId);

        expect(response).toSatisfyApiSpec();
        expect(response.status).toBe(httpStatusCodes.NOT_FOUND);
        expect.assertions(2);
      });
    });
  });
});
