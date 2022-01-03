import jsLogger from '@map-colonies/js-logger';
import { trace } from '@opentelemetry/api';
import httpStatusCodes from 'http-status-codes';
import { container } from 'tsyringe';
import { getApp } from '../../../src/app';
import { RasterCatalogManagerClient } from '../../../src/clients/rasterCatalogManagerClient';
import { SERVICES } from '../../../src/common/constants';
import { ICreatePackage } from '../../../src/common/interfaces';
import { layerFromCatalog } from '../../mocks/data';
import { JobManagerWrapper } from '../../../src/clients/jobManagerWrapper';
import { CreatePackageManager } from '../../../src/createPackage/models/createPackageManager';
import { CreatePackageSender } from './helpers/createPackageSender';

describe('tiles', function () {
  let requestSender: CreatePackageSender;
  let findLayerSpy: jest.SpyInstance;
  let createJobSpy: jest.SpyInstance;
  let checkForDuplicateSpy: jest.SpyInstance;

  beforeEach(function () {
    const app = getApp({
      override: [
        { token: SERVICES.LOGGER, provider: { useValue: jsLogger({ enabled: false }) } },
        { token: SERVICES.TRACER, provider: { useValue: trace.getTracer('testTracer') } },
      ],
      useChild: true,
    });
    requestSender = new CreatePackageSender(app);
    checkForDuplicateSpy = jest.spyOn(CreatePackageManager.prototype as unknown as { checkForDuplicate: jest.Mock }, 'checkForDuplicate');
    findLayerSpy = jest.spyOn(RasterCatalogManagerClient.prototype, 'findLayer');
    createJobSpy = jest.spyOn(JobManagerWrapper.prototype, 'createJob');
  });

  afterEach(function () {
    container.clearInstances();
    jest.resetAllMocks();
  });

  describe('Happy Path', function () {
    it('should return 200 status code and the job created details', async function () {
      const body: ICreatePackage = {
        dbId: layerFromCatalog.id,
        bbox: [34.811938017107494, 31.95475033759175, 34.82237261707599, 31.96426962177354],
        targetResolution: 0.0000429153442382812,
        callbackURLs: ['http://example.getmap.com/callback'],
        crs: 'EPSG:4326',
        priority: 0,
      };
      findLayerSpy.mockResolvedValue(layerFromCatalog);
      createJobSpy.mockResolvedValue({ id: 'b1c59730-c31d-4e44-9c67-4dbbb3b1c812', taskIds: ['6556896a-113c-4397-a48b-0cb2c99658f5'] });
      checkForDuplicateSpy.mockResolvedValue(undefined);

      const resposne = await requestSender.create(body);

      expect(resposne).toSatisfyApiSpec();
      expect(findLayerSpy).toHaveBeenCalledTimes(1);
      expect(createJobSpy).toHaveBeenCalledTimes(1);
      expect(resposne.status).toBe(httpStatusCodes.OK);
    });
  });

  describe('Sad Path', function () {
    it('should return 400 status code beause of bad data - no "bbox" field', async function () {
      const body = {
        dbId: layerFromCatalog.id,
        targetResolution: 0.0000429153442382812,
        callbackURLs: ['http://example.getmap.com/callback'],
        crs: 'EPSG:4326',
        priority: 0,
      } as unknown as ICreatePackage;

      const resposne = await requestSender.create(body);

      expect(findLayerSpy).toHaveBeenCalledTimes(0);
      expect(createJobSpy).toHaveBeenCalledTimes(0);
      expect(resposne.status).toBe(httpStatusCodes.BAD_REQUEST);
    });
  });
});
