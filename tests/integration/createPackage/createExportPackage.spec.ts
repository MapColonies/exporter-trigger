import httpStatusCodes from 'http-status-codes';
import { OperationStatus } from '@map-colonies/mc-priority-queue';
import { feature, featureCollection, Geometry } from '@turf/helpers';
import { getApp } from '../../../src/app';
import { RasterCatalogManagerClient } from '../../../src/clients/rasterCatalogManagerClient';
import { getContainerConfig, resetContainer } from '../testContainerConfig';
import { ICreateExportJobResponse, ICreatePackageRoi, JobExportDuplicationParams } from '../../../src/common/interfaces';
import { layerFromCatalog, fc1, fcNoMaxResolutionDeg, fcNoIntersection, fcTooHighResolution, fcBadMinResolutionDeg } from '../../mocks/data';
import { JobManagerWrapper } from '../../../src/clients/jobManagerWrapper';
import { CreatePackageManager } from '../../../src/createPackage/models/createPackageManager';
import { CreatePackageSender } from './helpers/createPackageSender';

describe('Export by ROI', function () {
  let requestSender: CreatePackageSender;
  let findLayerSpy: jest.SpyInstance;
  let createJobSpy: jest.SpyInstance;
  let checkForExportDuplicateSpy: jest.SpyInstance;
  let validateFreeSpaceSpy: jest.SpyInstance;
  let checkForExportCompletedSpy: jest.SpyInstance;
  let checkForExportProcessingSpy: jest.SpyInstance;

  beforeEach(function () {
    const app = getApp({
      override: [...getContainerConfig()],
      useChild: true,
    });
    requestSender = new CreatePackageSender(app);
    checkForExportDuplicateSpy = jest.spyOn(
      CreatePackageManager.prototype as unknown as { checkForExportDuplicate: jest.Mock },
      'checkForExportDuplicate'
    );
    checkForExportCompletedSpy = jest.spyOn(
      CreatePackageManager.prototype as unknown as { checkForExportCompleted: jest.Mock },
      'checkForExportCompleted'
    );
    checkForExportProcessingSpy = jest.spyOn(
      CreatePackageManager.prototype as unknown as { checkForExportProcessing: jest.Mock },
      'checkForExportProcessing'
    );
    validateFreeSpaceSpy = jest.spyOn(CreatePackageManager.prototype as unknown as { validateFreeSpace: jest.Mock }, 'validateFreeSpace');
    findLayerSpy = jest.spyOn(RasterCatalogManagerClient.prototype, 'findLayer');
    createJobSpy = jest.spyOn(JobManagerWrapper.prototype, 'createJob');
  });

  afterEach(function () {
    resetContainer();
    jest.resetAllMocks();
  });

  describe('Happy Path', function () {
    it('should return 200 status code and the job created details', async function () {
      const body: ICreatePackageRoi = {
        dbId: layerFromCatalog.id,
        roi: fc1,
        callbackURLs: ['http://example.getmap.com/callback'],
        crs: 'EPSG:4326',
        priority: 0,
      };

      findLayerSpy.mockResolvedValue(layerFromCatalog);
      checkForExportDuplicateSpy.mockResolvedValue(undefined);
      validateFreeSpaceSpy.mockResolvedValue(true);
      // TODO: remove and replace with `generateTileGroups` that is commented, when multiple tasks for GPKG target is possible
      // generateTileGroupsSpy.mockReturnValue([]);
      createJobSpy.mockResolvedValue({ id: 'b1c59730-c31d-4e44-9c67-4dbbb3b1c812', taskIds: ['6556896a-113c-4397-a48b-0cb2c99658f5'] });

      const resposne = await requestSender.createPackageRoi(body);
      expect(resposne).toSatisfyApiSpec();
      expect(findLayerSpy).toHaveBeenCalledTimes(1);
      expect(checkForExportDuplicateSpy).toHaveBeenCalledTimes(1);
      // TODO: remove and replace with `generateTileGroups` that is commented, when multiple tasks for GPKG target is possible
      // expect(generateTileGroupsSpy).toHaveBeenCalledTimes(2);
      expect(createJobSpy).toHaveBeenCalledTimes(1);
      expect(resposne.status).toBe(httpStatusCodes.OK);
    });

    it('should return 200 status code and the job created details even if ROI not provided (layers footprint based)', async function () {
      const body: ICreatePackageRoi = {
        dbId: layerFromCatalog.id,
        callbackURLs: ['http://example.getmap.com/callback'],
        crs: 'EPSG:4326',
        priority: 0,
      };
      const layerDefaultGeometry = feature(layerFromCatalog.metadata.footprint as Geometry, {
        maxResolutionDeg: layerFromCatalog.metadata.maxResolutionDeg as number,
      });
      const layerDefaultRoi = featureCollection([layerDefaultGeometry]);
      const dupParams: JobExportDuplicationParams = {
        crs: 'EPSG:4326',
        dbId: layerFromCatalog.id,
        resourceId: layerFromCatalog.metadata.productId as string,
        roi: layerDefaultRoi,
        version: layerFromCatalog.metadata.productVersion as string,
      };
      const callbacks = [{ url: 'http://example.getmap.com/callback', roi: layerDefaultRoi }];

      // TODO: remove and replace with `generateTileGroups` that is commented, when multiple tasks for GPKG target is possible
      // generateTileGroupsSpy.mockReturnValue([]);
      findLayerSpy.mockResolvedValue(layerFromCatalog);
      createJobSpy.mockResolvedValue({ id: 'b1c59730-c31d-4e44-9c67-4dbbb3b1c812', taskIds: ['6556896a-113c-4397-a48b-0cb2c99658f5'] });
      checkForExportDuplicateSpy.mockResolvedValue(undefined);
      validateFreeSpaceSpy.mockResolvedValue(true);

      const resposne = await requestSender.createPackageRoi(body);

      expect(resposne).toSatisfyApiSpec();
      expect(findLayerSpy).toHaveBeenCalledTimes(1);
      expect(createJobSpy).toHaveBeenCalledTimes(1);
      // TODO: remove and replace with `generateTileGroups` that is commented, when multiple tasks for GPKG target is possible
      // expect(generateTileGroupsSpy).toHaveBeenCalledTimes(1);
      expect(checkForExportDuplicateSpy).toHaveBeenCalledTimes(1);
      expect(checkForExportDuplicateSpy).toHaveBeenCalledWith(dupParams, callbacks);
      expect(resposne.status).toBe(httpStatusCodes.OK);
    });

    it(`should return 200 status code and the exists un-cleaned completed job's callback (with original bbox of request)`, async function () {
      checkForExportDuplicateSpy.mockRestore();

      const expirationTime = new Date();
      const body: ICreatePackageRoi = {
        dbId: layerFromCatalog.id,
        roi: fc1,
        callbackURLs: ['http://example.getmap.com/callback'],
        crs: 'EPSG:4326',
        priority: 0,
      };
      const origCallback = {
        roi: fc1,
        links: {
          dataURI:
            'https://files-server-route.io/test/downloads/415c9316e58862194145c4b54cf9d87e/Orthophoto_bluemarble_7_1_0_5_2023_02_28T15_09_50_924Z.gpkg',
          metadataURI:
            'https://files-server-route.io/test/downloads/415c9316e58862194145c4b54cf9d87e/Orthophoto_bluemarble_7_1_0_5_2023_02_28T15_09_50_924Z.json',
        },
        status: OperationStatus.COMPLETED,
        fileSize: 10,
        jobId: 'afbdd5e6-25db-4567-a81f-71e0e7d30761',
        expirationTime: expirationTime,
        recordCatalogId: layerFromCatalog.id,
      };

      const expectedCompletedCallback = {
        roi: fc1,
        links: {
          dataURI:
            'https://files-server-route.io/test/downloads/415c9316e58862194145c4b54cf9d87e/Orthophoto_bluemarble_7_1_0_5_2023_02_28T15_09_50_924Z.gpkg',
          metadataURI:
            'https://files-server-route.io/test/downloads/415c9316e58862194145c4b54cf9d87e/Orthophoto_bluemarble_7_1_0_5_2023_02_28T15_09_50_924Z.json',
        },
        status: OperationStatus.COMPLETED,
        fileSize: 10,
        jobId: 'afbdd5e6-25db-4567-a81f-71e0e7d30761',
        expirationTime: expirationTime,
        recordCatalogId: layerFromCatalog.id,
      };
      findLayerSpy.mockResolvedValue(layerFromCatalog);
      checkForExportCompletedSpy.mockResolvedValue(origCallback);
      checkForExportProcessingSpy.mockResolvedValue(undefined);
      validateFreeSpaceSpy.mockResolvedValue(true);

      const response = await requestSender.createPackageRoi(body);

      expect(response).toSatisfyApiSpec();
      expect(findLayerSpy).toHaveBeenCalledTimes(1);
      expect(createJobSpy).toHaveBeenCalledTimes(0);
      expect(checkForExportCompletedSpy).toHaveBeenCalledTimes(1);
      expect(checkForExportProcessingSpy).toHaveBeenCalledTimes(0);
      expect(validateFreeSpaceSpy).toHaveBeenCalledTimes(0);
      expect(JSON.stringify(response.body)).toBe(JSON.stringify(expectedCompletedCallback));
      expect(response.status).toBe(httpStatusCodes.OK);
    });

    it(`should return 200 status code and the exists un-cleaned In-progress job's response with job id, task id and OperationStatus=In-Progress`, async function () {
      checkForExportDuplicateSpy.mockRestore();

      const body: ICreatePackageRoi = {
        dbId: layerFromCatalog.id,
        roi: fc1,
        callbackURLs: ['http://example.getmap.com/callback'],
        crs: 'EPSG:4326',
        priority: 0,
      };

      const inProgressJobResonse: ICreateExportJobResponse = {
        jobId: 'b1c59730-c31d-4e44-9c67-4dbbb3b1c812',
        taskIds: ['6556896a-113c-4397-a48b-0cb2c99658f5'],
        status: OperationStatus.IN_PROGRESS,
        isDuplicated: true,
      };

      findLayerSpy.mockResolvedValue(layerFromCatalog);
      checkForExportCompletedSpy.mockResolvedValue(undefined);
      checkForExportProcessingSpy.mockResolvedValue(inProgressJobResonse);
      validateFreeSpaceSpy.mockResolvedValue(true);

      const response = await requestSender.createPackageRoi(body);

      expect(response).toSatisfyApiSpec();
      expect(findLayerSpy).toHaveBeenCalledTimes(1);
      expect(createJobSpy).toHaveBeenCalledTimes(0);
      expect(checkForExportCompletedSpy).toHaveBeenCalledTimes(2);
      expect(checkForExportProcessingSpy).toHaveBeenCalledTimes(1);
      expect(validateFreeSpaceSpy).toHaveBeenCalledTimes(0);
      expect(response.body).toStrictEqual(inProgressJobResonse);
      expect(response.status).toBe(httpStatusCodes.OK);
    });
  });

  describe('Sad Path', function () {
    it('should return 400 status code because of bad data - no "dbId" field', async function () {
      const body = {
        roi: fc1,
        callbackURLs: ['http://example.getmap.com/callback'],
        crs: 'EPSG:4326',
        priority: 0,
      } as unknown as ICreatePackageRoi;

      checkForExportDuplicateSpy.mockResolvedValue(undefined);

      const resposne = await requestSender.createPackageRoi(body);

      expect(resposne).toSatisfyApiSpec();
      expect(findLayerSpy).toHaveBeenCalledTimes(0);
      expect(checkForExportDuplicateSpy).toHaveBeenCalledTimes(0);
      expect(createJobSpy).toHaveBeenCalledTimes(0);

      expect(resposne.status).toBe(httpStatusCodes.BAD_REQUEST);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(JSON.parse(resposne.text).message).toBe(`request/body must have required property 'dbId'`);
    });

    it('should return 400 status code because of bad data - no "maxResolutionDeg" properties in feature', async function () {
      const body = {
        dbId: layerFromCatalog.id,
        roi: fcNoMaxResolutionDeg,
        callbackURLs: ['http://example.getmap.com/callback'],
        crs: 'EPSG:4326',
        priority: 0,
      } as unknown as ICreatePackageRoi;

      checkForExportDuplicateSpy.mockResolvedValue(undefined);
      const resposne = await requestSender.createPackageRoi(body);
      expect(resposne).toSatisfyApiSpec();
      expect(findLayerSpy).toHaveBeenCalledTimes(0);
      expect(checkForExportDuplicateSpy).toHaveBeenCalledTimes(0);
      expect(createJobSpy).toHaveBeenCalledTimes(0);
      expect(resposne.status).toBe(httpStatusCodes.BAD_REQUEST);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(JSON.parse(resposne.text).message).toBe(`request/body/roi/features/0/properties must have required property 'maxResolutionDeg'`);
    });

    it('should return 400 status code because of bad data - no "minResolutionDeg" is higher than maxResolutionDeg', async function () {
      const body: ICreatePackageRoi = {
        dbId: layerFromCatalog.id,
        roi: fcBadMinResolutionDeg,
        crs: 'EPSG:4326',
        priority: 0,
      } as unknown as ICreatePackageRoi;

      findLayerSpy.mockResolvedValue(layerFromCatalog);
      const maxResValue = fcBadMinResolutionDeg.features[0].properties?.maxResolutionDeg as unknown as number;
      const minResValue = fcBadMinResolutionDeg.features[0].properties?.minResolutionDeg as unknown as number;
      checkForExportDuplicateSpy.mockResolvedValue(undefined);
      const resposne = await requestSender.createPackageRoi(body);
      expect(resposne).toSatisfyApiSpec();
      expect(findLayerSpy).toHaveBeenCalledTimes(1);
      expect(checkForExportDuplicateSpy).toHaveBeenCalledTimes(0);
      expect(createJobSpy).toHaveBeenCalledTimes(0);
      expect(resposne.status).toBe(httpStatusCodes.BAD_REQUEST);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(JSON.parse(resposne.text).message).toBe(`The requested minResolutionDeg ${minResValue} is larger then maxResolutionDeg ${maxResValue}`);
    });

    it('should return 400 status code because of Bad Feature geometry - no intersection with layer geometry', async function () {
      findLayerSpy.mockResolvedValue(layerFromCatalog);

      const body = {
        dbId: layerFromCatalog.id,
        roi: fcNoIntersection,
        callbackURLs: ['http://example.getmap.com/callback'],
        crs: 'EPSG:4326',
        priority: 0,
      } as unknown as ICreatePackageRoi;

      checkForExportDuplicateSpy.mockResolvedValue(undefined);
      const resposne = await requestSender.createPackageRoi(body);
      expect(resposne).toSatisfyApiSpec();
      expect(findLayerSpy).toHaveBeenCalledTimes(1);
      expect(checkForExportDuplicateSpy).toHaveBeenCalledTimes(0);
      expect(createJobSpy).toHaveBeenCalledTimes(0);
      expect(resposne.status).toBe(httpStatusCodes.BAD_REQUEST);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(JSON.parse(resposne.text).message).toBe(
        `Requested ${JSON.stringify(fcNoIntersection.features[0].geometry)} has no intersection with requested layer ${
          layerFromCatalog.metadata.id as string
        }`
      );
    });

    it('should return 400 status code because of Bad Feature maxResolutionDeg property - requested resolution is higher than layer maximum', async function () {
      findLayerSpy.mockResolvedValue(layerFromCatalog);

      const body = {
        dbId: layerFromCatalog.id,
        roi: fcTooHighResolution,
        callbackURLs: ['http://example.getmap.com/callback'],
        crs: 'EPSG:4326',
        priority: 0,
      } as unknown as ICreatePackageRoi;

      checkForExportDuplicateSpy.mockResolvedValue(undefined);
      const resposne = await requestSender.createPackageRoi(body);
      expect(resposne).toSatisfyApiSpec();
      expect(findLayerSpy).toHaveBeenCalledTimes(1);
      expect(checkForExportDuplicateSpy).toHaveBeenCalledTimes(0);
      expect(createJobSpy).toHaveBeenCalledTimes(0);
      expect(resposne.status).toBe(httpStatusCodes.BAD_REQUEST);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(JSON.parse(resposne.text).message).toBe(
        `The requested resolution ${fcTooHighResolution.features[0].properties?.maxResolutionDeg as number} is larger then product resolution ${
          layerFromCatalog.metadata.maxResolutionDeg as number
        }`
      );
    });
  });

  describe('Bad Path', function () {
    it('should return 507 status code for insufficient storage to gpkg creation', async function () {
      const body: ICreatePackageRoi = {
        dbId: layerFromCatalog.id,
        roi: fc1,
        callbackURLs: ['http://example.getmap.com/callback'],
        crs: 'EPSG:4326',
        priority: 0,
      };
      findLayerSpy.mockResolvedValue(layerFromCatalog);
      checkForExportDuplicateSpy.mockResolvedValue(undefined);
      validateFreeSpaceSpy.mockResolvedValue(false);
      const resposne = await requestSender.createPackageRoi(body);

      expect(resposne).toSatisfyApiSpec();
      expect(findLayerSpy).toHaveBeenCalledTimes(1);
      expect(createJobSpy).toHaveBeenCalledTimes(0);
      expect(resposne.status).toBe(httpStatusCodes.INSUFFICIENT_STORAGE);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(JSON.parse(resposne.text).message).toBe(`There isn't enough free disk space to executing export`);
    });
  });
});
