import jsLogger from '@map-colonies/js-logger';
import { trace } from '@opentelemetry/api';
import httpStatusCodes from 'http-status-codes';
import { container } from 'tsyringe';
import { getApp } from '../../../src/app';
import { RasterCatalogManagerClient } from '../../../src/clients/rasterCatalogManagerClient';
import { SERVICES } from '../../../src/common/constants';
import { ICreatePackage } from '../../../src/common/interfaces';
import { CreatePackageSender } from './helpers/createPackageSender';
import { layerFromCatalog } from '../../mocks/data';
import { JobManagerClient } from '../../../src/clients/jobManagerClient';

describe('tiles', function () {
  let requestSender: CreatePackageSender;
  let findLayerSpy: jest.SpyInstance;
  let createJobSpy: jest.SpyInstance;

  beforeEach(function () {
    const app = getApp({
      override: [
        { token: SERVICES.LOGGER, provider: { useValue: jsLogger({ enabled: false }) } },
        { token: SERVICES.TRACER, provider: { useValue: trace.getTracer('testTracer') } },
      ],
      useChild: true,
    });
    requestSender = new CreatePackageSender(app);
    findLayerSpy = jest.spyOn(RasterCatalogManagerClient.prototype, 'findLayer');
    createJobSpy = jest.spyOn(JobManagerClient.prototype, 'createJob');
  });

  afterEach(function () {
    container.clearInstances();
    jest.resetAllMocks();
  });

  describe('Happy Path', function () {
    it('should return 200 status code and the job created details', async function () {
      const body: ICreatePackage = {
        dbId: layerFromCatalog.id,
        packageName: 'myPackage',
        bbox: [34.811938017107494, 31.95475033759175, 34.82237261707599, 31.96426962177354],
        targetResolution: 0.0000429153442382812,
        callbackURL: 'http://example.getmap.com/callback',
        crs: 'EPSG:4326',
        priority: 0,
      };
      findLayerSpy.mockResolvedValue(layerFromCatalog);
      createJobSpy.mockResolvedValue({ jobId: 'b1c59730-c31d-4e44-9c67-4dbbb3b1c812', taskId: '6556896a-113c-4397-a48b-0cb2c99658f5' });

      const resposne = await requestSender.create(body);

      expect(findLayerSpy).toHaveBeenCalledTimes(1);
      expect(createJobSpy).toHaveBeenCalledTimes(1);
      expect(resposne.status).toBe(httpStatusCodes.OK);
    });
  });
});
