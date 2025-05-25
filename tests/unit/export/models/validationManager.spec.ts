import jsLogger from '@map-colonies/js-logger';
import { trace } from '@opentelemetry/api';
import { BadRequestError, InsufficientStorage, NotFoundError } from '@map-colonies/error-types';
import nock from 'nock';
import { container } from 'tsyringe';
import { SERVICES } from '@src/common/constants';
import { getUTCDate } from '@map-colonies/mc-utils';
import { completedExportJobsResponse, completedExportParams, completedJobCallback } from '@tests/mocks/completedReqest';
import {
  addedCallbackUrl,
  inProgressExportParams,
  inProgressJobsResponse,
  pendingExportParams,
  processingResponse,
} from '@tests/mocks/processingRequest';
import { CallbackUrlsTargetArray, ExportJobParameters } from '@map-colonies/raster-shared';
import { JobExportResponse } from '@src/common/interfaces';
import { RasterCatalogManagerClient } from '../../../../src/clients/rasterCatalogManagerClient';
import { JobManagerWrapper } from '../../../../src/clients/jobManagerWrapper';
import { dupParams, layerInfo, validateFeatureCollection } from '../../../mocks/data';
import { configMock, registerDefaultConfig, clear as clearConfig } from '../../../mocks/config';
import { ValidationManager } from '../../../../src/export/models/validationManager';

let validationManager: ValidationManager;
let jobManagerWrapper: JobManagerWrapper;

describe('ValidationManager', () => {
  registerDefaultConfig();
  const catalogManagerURL = configMock.get<string>('externalClientsConfig.clientsUrls.rasterCatalogManager.url');
  const jobManagerURL = configMock.get<string>('externalClientsConfig.clientsUrls.jobManager.url');
  beforeEach(() => {
    registerDefaultConfig();
    const logger = jsLogger({ enabled: false });
    container.register(SERVICES.LOGGER, { useValue: logger });
    jobManagerWrapper = new JobManagerWrapper(logger, trace.getTracer('testTracer'));
    const catalogManagerClient = new RasterCatalogManagerClient(logger, trace.getTracer('testTracer'));
    validationManager = new ValidationManager(configMock, logger, trace.getTracer('testTracer'), jobManagerWrapper, catalogManagerClient);
  });

  afterEach(() => {
    nock.cleanAll();
    clearConfig();
    jest.resetAllMocks();
  });

  describe('findLayer', () => {
    it('should return layer metadata when the layer is found', async () => {
      const layerId = layerInfo.metadata.id;
      nock(catalogManagerURL).post(`/records/find`, { id: layerId }).reply(200, [layerInfo]);
      const result = await validationManager.findLayer(layerId);

      expect(result).toEqual(layerInfo.metadata);
    });

    it('should throw an error if the layer is not found', async () => {
      const layerId = layerInfo.metadata.id;

      nock(catalogManagerURL).post(`/records/find`, { id: layerId }).reply(200, []);

      await expect(validationManager.findLayer(layerId)).rejects.toThrow(NotFoundError);
    });
  });

  describe('validateZoom', () => {
    it('should throw a BadRequestError if zoom level exceeds maxZoom', () => {
      const record = { zoomLevel: 12, targetResolutionDeg: 0.1, targetResolutionMeter: 0.1, minResolutionDeg: 0.01, minZoomLevel: 1 };

      expect(() => validationManager.validateZoom(record, 10, 0.05)).toThrow(
        new BadRequestError("The requested resolution 0.1 is larger then product's resolution 0.05")
      );
    });

    it('should not throw if zoom level is within bounds', () => {
      const record = { zoomLevel: 5, targetResolutionDeg: 0.01, minZoomLevel: 3, targetResolutionMeter: 0.01, minResolutionDeg: 0.01 };

      expect(() => validationManager.validateZoom(record, 10, 0.05)).not.toThrow();
    });

    it('should throw a BadRequestError if minZoomLevel is larger than targetResolutionDeg', () => {
      const record = { zoomLevel: 5, targetResolutionDeg: 0.01, minZoomLevel: 8, targetResolutionMeter: 0.01, minResolutionDeg: 0.01 };

      expect(() => validationManager.validateZoom(record, 10, 0.05)).toThrow(
        new BadRequestError('The requested resolution 5 is smaller then minResolutionDeg 8')
      );
    });
  });

  describe('validateFeaturesCollection', () => {
    it('should validate all features and return sanitized records', () => {
      const { validRequest } = validateFeatureCollection;

      const result = validationManager.validateFeaturesCollection(
        validRequest.featuresRecords,
        validRequest.footprint,
        validRequest.maxZomm,
        validRequest.srcRes
      );

      expect(result).toEqual(validRequest.featuresRecords);
    });

    it('should throw an error if a feature does not intersect with the footprint', () => {
      const { notIntersected } = validateFeatureCollection.invalid;

      const action = () =>
        validationManager.validateFeaturesCollection(
          notIntersected.featuresRecords,
          notIntersected.footprint,
          notIntersected.maxZomm,
          notIntersected.srcRes
        );

      expect(action).toThrow(BadRequestError);
    });
  });

  describe('checkForExportDuplicate', () => {
    it('should return undefined when no duplicate jobs', async () => {
      const { crs, productId, version, catalogId, roi } = dupParams;
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

      const result = await validationManager.checkForExportDuplicate(productId, version, catalogId, roi, crs);

      expect(result).toBeUndefined();
    });

    it('should return completed job duplication without expirationDate update', async () => {
      const { crs, productId, version, catalogId, roi } = dupParams;
      nock(jobManagerURL)
        .get('/jobs')
        .query(completedExportParams as Record<string, string>)
        .reply(200, completedExportJobsResponse);
      nock(jobManagerURL)
        .get(`/jobs/${completedExportJobsResponse[0].id}`)
        .query({ shouldReturnTasks: false })
        .reply(200, completedExportJobsResponse[0])
        .persist();
      nock(jobManagerURL)
        .get(`/jobs/${completedExportJobsResponse[1].id}`)
        .query({ shouldReturnTasks: false })
        .reply(200, completedExportJobsResponse[1])
        .persist();

      const result = await validationManager.checkForExportDuplicate(productId, version, catalogId, roi, crs);

      expect(result).toEqual(completedJobCallback);
    });

    it('should return a completed export job with race condition', async () => {
      const { crs, productId, version, catalogId, roi } = dupParams;
      nock(jobManagerURL)
        .get('/jobs')
        .query(completedExportParams as Record<string, string>)
        .reply(200, []);
      nock(jobManagerURL)
        .get('/jobs')
        .query(inProgressExportParams as Record<string, string>)
        .reply(200, inProgressJobsResponse);
      nock(jobManagerURL).get(`/jobs/${inProgressJobsResponse[0].id}`).query({ shouldReturnTasks: false }).reply(200, inProgressJobsResponse[0]);
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

      nock(jobManagerURL).put(`/jobs/${inProgressJobsResponse[0].id}`, JSON.stringify(inProgressJobsResponse[0].parameters)).reply(200, []);

      const result = await validationManager.checkForExportDuplicate(productId, version, catalogId, roi, crs);

      expect(result).toEqual(completedJobCallback);
    });

    it('should return completed job duplication with expirationDate update', async () => {
      const { crs, productId, version, catalogId, roi } = dupParams;
      const completedJobWithChangedExpiration = { ...completedExportJobsResponse[0] };
      const newExpirationDate = getUTCDate();
      newExpirationDate.setDate(newExpirationDate.getDate() + 30);
      const updateExpirationParams = {
        parameters: {
          ...completedExportJobsResponse[0].parameters,
          cleanupDataParams: {
            ...completedExportJobsResponse[0].parameters.cleanupDataParams,
            cleanupExpirationTimeUTC: newExpirationDate,
            directoryPath: completedExportJobsResponse[0].parameters.cleanupDataParams.directoryPath,
          },
        },
      };

      const expirationDateSpy = jest.spyOn(jobManagerWrapper, 'updateJobExpirationDate');
      const completedJobCallbackWithUpdatedExpiration = { ...completedJobCallback, expirationTime: newExpirationDate as unknown as string };

      completedJobWithChangedExpiration.parameters.cleanupDataParams.cleanupExpirationTimeUTC = '2025-02-01T12:28:50.000Z';
      nock(jobManagerURL)
        .get('/jobs')
        .query(completedExportParams as Record<string, string>)
        .reply(200, [completedJobWithChangedExpiration]);
      nock(jobManagerURL)
        .get(`/jobs/${completedExportJobsResponse[0].id}`)
        .query({ shouldReturnTasks: false })
        .reply(200, completedJobWithChangedExpiration)
        .persist();
      nock(jobManagerURL).put(`/jobs/${completedExportJobsResponse[0].id}`, JSON.stringify(updateExpirationParams)).reply(200);

      const result = await validationManager.checkForExportDuplicate(productId, version, catalogId, roi, crs);

      expect(result).toEqual(completedJobCallbackWithUpdatedExpiration);
      expect(expirationDateSpy).toHaveBeenCalledTimes(1);
    });

    it('should return a processing export job without race condition', async () => {
      const { crs, productId, version, catalogId, roi } = dupParams;
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

      const result = await validationManager.checkForExportDuplicate(productId, version, catalogId, roi, crs);

      expect(result).toEqual(processingResponse);
    });

    it('should return a processing export job and add new callbacks', async () => {
      const { crs, productId, version, catalogId, roi } = dupParams;
      const updatedCallbackParameters: ExportJobParameters = { ...(inProgressJobsResponse[0].parameters as ExportJobParameters) };
      //This uses the logical assignment operator (||=), which assigns a value only if the left-hand side is falsy.
      (updatedCallbackParameters.exportInputParams.callbackUrls ||= []).push(addedCallbackUrl[0]);

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

      nock(jobManagerURL)
        .put(`/jobs/${inProgressJobsResponse[0].id}`, JSON.stringify({ parameters: updatedCallbackParameters }))
        .reply(200, []);

      const result = await validationManager.checkForExportDuplicate(productId, version, catalogId, roi, crs, addedCallbackUrl);

      expect(result).toEqual(processingResponse);
    });

    it('should return an processing export job and add a callback', async () => {
      const { crs, productId, version, catalogId, roi } = dupParams;
      const duplicateJob = [{ ...inProgressJobsResponse[0] }];
      // Perform a deep copy of the parameters object
      const updatedCallbackParameters = JSON.parse(JSON.stringify(duplicateJob[0].parameters)) as ExportJobParameters;
      // Use type assertion to safely delete the property
      delete (duplicateJob[0].parameters.exportInputParams as { callbackUrls?: unknown }).callbackUrls;
      updatedCallbackParameters.exportInputParams.callbackUrls = addedCallbackUrl;

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
        .put(`/jobs/${duplicateJob[0].id}`, JSON.stringify({ parameters: updatedCallbackParameters }))
        .reply(200, []);

      const updateCallbackSpy = jest.spyOn(
        validationManager as unknown as {
          updateExportCallbackURLs: (processingJob: JobExportResponse, newCallbacks?: CallbackUrlsTargetArray) => Promise<void>;
        },
        'updateExportCallbackURLs'
      );
      const result = await validationManager.checkForExportDuplicate(productId, version, catalogId, roi, crs, addedCallbackUrl);

      expect(result).toEqual(processingResponse);

      expect(updateCallbackSpy).toHaveBeenNthCalledWith(1, duplicateJob[0], addedCallbackUrl);
      //expect(updateCallbackSpy).toHaveBeenCalledTimes(1);
    });

    it('should return an processing export job and create a new callback property', async () => {
      const { crs, productId, version, catalogId, roi } = dupParams;
      const duplicateJob = [{ ...inProgressJobsResponse[0] }];
      // Perform a deep copy of the parameters object
      const updatedCallbackParameters = JSON.parse(JSON.stringify(duplicateJob[0].parameters)) as ExportJobParameters;
      // Use type assertion to safely delete the property
      delete (duplicateJob[0].parameters.exportInputParams as { callbackUrls?: unknown }).callbackUrls;
      updatedCallbackParameters.exportInputParams.callbackUrls = addedCallbackUrl;

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
        .put(`/jobs/${duplicateJob[0].id}`, JSON.stringify({ parameters: updatedCallbackParameters }))
        .reply(200, []);

      const result = await validationManager.checkForExportDuplicate(productId, version, catalogId, roi, crs, addedCallbackUrl);

      expect(result).toEqual(processingResponse);
    });
  });

  it('should return undefined when no duplicate jobs', async () => {
    const { crs, productId, version, catalogId, roi } = dupParams;
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

    const result = await validationManager.checkForExportDuplicate(productId, version, catalogId, roi, crs);

    expect(result).toBeUndefined();
  });

  describe('validateFreeSpace', () => {
    it('should not throw error when sufficient free space', async () => {
      jest.spyOn(validationManager as unknown as { getFreeStorage: () => Promise<number> }, 'getFreeStorage').mockResolvedValue(10000);
      const action = async () => validationManager.validateFreeSpace(1111, 'path');

      await expect(action()).resolves.not.toThrow();
    });

    it('should throw InsufficientStorage error when not enough sufficient free space', async () => {
      jest.spyOn(validationManager as unknown as { getFreeStorage: () => Promise<number> }, 'getFreeStorage').mockResolvedValue(1);
      const action = async () => validationManager.validateFreeSpace(1111, 'path');

      await expect(action()).rejects.toThrow(InsufficientStorage);
    });
  });
});
