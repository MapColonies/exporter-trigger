import httpStatusCodes from 'http-status-codes';
import { OperationStatus } from '@map-colonies/mc-priority-queue';
import { getApp } from '../../../src/app';
import { RasterCatalogManagerClient } from '../../../src/clients/rasterCatalogManagerClient';
import { getContainerConfig, resetContainer } from '../testContainerConfig';
import { ICreateJobResponse, ICreatePackage } from '../../../src/common/interfaces';
import { layerFromCatalog } from '../../mocks/data';
import { JobManagerWrapper } from '../../../src/clients/jobManagerWrapper';
import { CreatePackageManager } from '../../../src/createPackage/models/createPackageManager';
import { CreatePackageSender } from './helpers/createPackageSender';

describe('tiles', function () {
  let requestSender: CreatePackageSender;
  let findLayerSpy: jest.SpyInstance;
  let createJobSpy: jest.SpyInstance;
  let checkForDuplicateSpy: jest.SpyInstance;
  let validateFreeSpaceSpy: jest.SpyInstance;
  let checkForCompletedSpy: jest.SpyInstance;
  let checkForProcessingSpy: jest.SpyInstance;
  let normalize2Polygon: jest.SpyInstance;
  let generateTileGroupsSpy: jest.SpyInstance;

  beforeEach(function () {
    const app = getApp({
      override: [...getContainerConfig()],
      useChild: true,
    });
    requestSender = new CreatePackageSender(app);
    checkForDuplicateSpy = jest.spyOn(CreatePackageManager.prototype as unknown as { checkForDuplicate: jest.Mock }, 'checkForDuplicate');
    normalize2Polygon = jest.spyOn(CreatePackageManager.prototype as unknown as { normalize2Polygon: jest.Mock }, 'normalize2Polygon');
    checkForCompletedSpy = jest.spyOn(CreatePackageManager.prototype as unknown as { checkForCompleted: jest.Mock }, 'checkForCompleted');
    checkForProcessingSpy = jest.spyOn(CreatePackageManager.prototype as unknown as { checkForProcessing: jest.Mock }, 'checkForProcessing');
    validateFreeSpaceSpy = jest.spyOn(CreatePackageManager.prototype as unknown as { validateFreeSpace: jest.Mock }, 'validateFreeSpace');
    generateTileGroupsSpy = jest.spyOn(CreatePackageManager.prototype as unknown as { generateTileGroups: jest.Mock }, 'generateTileGroups');
    findLayerSpy = jest.spyOn(RasterCatalogManagerClient.prototype, 'findLayer');
    createJobSpy = jest.spyOn(JobManagerWrapper.prototype, 'createJob');
  });

  afterEach(function () {
    resetContainer();
    jest.resetAllMocks();
  });

  describe('Happy Path', function () {
    it('should return 200 status code and the job created details', async function () {
      const body: ICreatePackage = {
        dbId: layerFromCatalog.id,
        bbox: [34.811938017107494, 31.95475033759175, 34.82237261707599, 31.96426962177354],
        targetResolution: 0.00034332275390625,
        callbackURLs: ['http://example.getmap.com/callback'],
        crs: 'EPSG:4326',
        priority: 0,
      };
      findLayerSpy.mockResolvedValue(layerFromCatalog);
      createJobSpy.mockResolvedValue({ id: 'b1c59730-c31d-4e44-9c67-4dbbb3b1c812', taskIds: ['6556896a-113c-4397-a48b-0cb2c99658f5'] });
      checkForDuplicateSpy.mockResolvedValue(undefined);
      validateFreeSpaceSpy.mockResolvedValue(true);

      const resposne = await requestSender.create(body);
      expect(resposne).toSatisfyApiSpec();
      expect(findLayerSpy).toHaveBeenCalledTimes(1);
      expect(createJobSpy).toHaveBeenCalledTimes(1);
      expect(resposne.status).toBe(httpStatusCodes.OK);
    });

    it('should return 200 status code and the job created details even if bbox and resolution were not supplied', async function () {
      const body: ICreatePackage = {
        dbId: layerFromCatalog.id,
        callbackURLs: ['http://example.getmap.com/callback'],
        crs: 'EPSG:4326',
        priority: 0,
      };
      generateTileGroupsSpy.mockReturnValue([]);
      findLayerSpy.mockResolvedValue(layerFromCatalog);
      createJobSpy.mockResolvedValue({ id: 'b1c59730-c31d-4e44-9c67-4dbbb3b1c812', taskIds: ['6556896a-113c-4397-a48b-0cb2c99658f5'] });
      checkForDuplicateSpy.mockResolvedValue(undefined);
      validateFreeSpaceSpy.mockResolvedValue(true);

      const resposne = await requestSender.create(body);

      expect(resposne).toSatisfyApiSpec();
      expect(findLayerSpy).toHaveBeenCalledTimes(1);
      expect(createJobSpy).toHaveBeenCalledTimes(1);
      expect(resposne.status).toBe(httpStatusCodes.OK);
    });

    it(`should return 200 status code and the exists un-cleaned completed job's callback (with original bbox of request)`, async function () {
      checkForDuplicateSpy.mockRestore();

      const expirationTime = new Date();
      const body: ICreatePackage = {
        dbId: layerFromCatalog.id,
        bbox: [34.811938017107494, 31.95475033759175, 34.82237261707599, 31.96426962177354],
        targetResolution: 0.00034332275390625,
        callbackURLs: ['http://example.getmap.com/callback'],
        crs: 'EPSG:4326',
        priority: 0,
      };
      const origCallback = {
        dbId: layerFromCatalog.id,
        fileUri: 'http://example.getmap.com/callback',
        success: true,
        fileSize: 10,
        requestId: 'string',
        errorReason: '',
        packageName: 'string',
        expirationTime: expirationTime,
        targetResolution: 0.123,
        status: OperationStatus.COMPLETED,
        bbox: [-180, -90, 90, 180],
      };

      const expectedCompletedCallback = {
        dbId: layerFromCatalog.id,
        fileUri: 'http://example.getmap.com/callback',
        success: true,
        fileSize: 10,
        requestId: 'string',
        errorReason: '',
        packageName: 'string',
        expirationTime: expirationTime,
        targetResolution: 0.123,
        status: OperationStatus.COMPLETED,
        bbox: body.bbox,
      };
      findLayerSpy.mockResolvedValue(layerFromCatalog);
      checkForCompletedSpy.mockResolvedValue(origCallback);
      validateFreeSpaceSpy.mockResolvedValue(true);

      const response = await requestSender.create(body);

      expect(response).toSatisfyApiSpec();
      expect(findLayerSpy).toHaveBeenCalledTimes(1);
      expect(createJobSpy).toHaveBeenCalledTimes(0);
      expect(checkForCompletedSpy).toHaveBeenCalledTimes(1);
      expect(validateFreeSpaceSpy).toHaveBeenCalledTimes(0);
      expect(JSON.stringify(response.body)).toBe(JSON.stringify(expectedCompletedCallback));
      expect(response.status).toBe(httpStatusCodes.OK);
    });
  });

  it(`should return 200 status code and the exists un-cleaned completed job's callback (with original bbox as footprint of request)`, async function () {
    checkForDuplicateSpy.mockRestore();

    const expirationTime = new Date();
    const body: ICreatePackage = {
      dbId: layerFromCatalog.id,
      bbox: {
        type: 'Polygon',
        coordinates: [
          [
            [25, 15],
            [50, 15],
            [50, 40],
            [25, 40],
            [25, 15],
          ],
        ],
      },
      targetResolution: 0.00034332275390625,
      callbackURLs: ['http://example.getmap.com/callback'],
      crs: 'EPSG:4326',
      priority: 0,
    };
    const origCallback = {
      dbId: layerFromCatalog.id,
      fileUri: 'http://example.getmap.com/callback',
      success: true,
      fileSize: 10,
      requestId: 'string',
      errorReason: '',
      packageName: 'string',
      expirationTime: expirationTime,
      targetResolution: 0.123,
      status: OperationStatus.COMPLETED,
      bbox: [-180, -90, 90, 180],
    };

    const expectedCompletedCallback = {
      dbId: layerFromCatalog.id,
      fileUri: 'http://example.getmap.com/callback',
      success: true,
      fileSize: 10,
      requestId: 'string',
      errorReason: '',
      packageName: 'string',
      expirationTime: expirationTime,
      targetResolution: 0.123,
      status: OperationStatus.COMPLETED,
      bbox: body.bbox,
    };
    findLayerSpy.mockResolvedValue(layerFromCatalog);
    checkForCompletedSpy.mockResolvedValue(origCallback);
    validateFreeSpaceSpy.mockResolvedValue(true);

    const response = await requestSender.create(body);

    expect(response).toSatisfyApiSpec();
    expect(findLayerSpy).toHaveBeenCalledTimes(1);
    expect(normalize2Polygon).toHaveBeenCalledTimes(1);
    expect(checkForCompletedSpy).toHaveBeenCalledTimes(1);
    expect(createJobSpy).toHaveBeenCalledTimes(0);
    expect(validateFreeSpaceSpy).toHaveBeenCalledTimes(0);
    expect(JSON.stringify(response.body)).toBe(JSON.stringify(expectedCompletedCallback));
    expect(response.status).toBe(httpStatusCodes.OK);
  });

  it(`should return 200 status code and the exists in-progress job (id, task and status)`, async function () {
    checkForDuplicateSpy.mockRestore();

    const body: ICreatePackage = {
      dbId: layerFromCatalog.id,
      bbox: [34.811938017107494, 31.95475033759175, 34.82237261707599, 31.96426962177354],
      targetResolution: 0.00034332275390625,
      callbackURLs: ['http://example.getmap.com/callback'],
      crs: 'EPSG:4326',
      priority: 0,
    };

    const expectedInProgressJobResponse: ICreateJobResponse = {
      id: 'b1c59730-c31d-4e44-9c67-4dbbb3b1c812',
      taskIds: ['6556896a-113c-4397-a48b-0cb2c99658f5'],
      status: OperationStatus.IN_PROGRESS,
    };

    findLayerSpy.mockResolvedValue(layerFromCatalog);
    checkForCompletedSpy.mockResolvedValue(undefined);
    checkForProcessingSpy.mockResolvedValue(expectedInProgressJobResponse);
    validateFreeSpaceSpy.mockResolvedValue(true);

    const response = await requestSender.create(body);

    expect(response).toSatisfyApiSpec();
    expect(findLayerSpy).toHaveBeenCalledTimes(1);
    expect(createJobSpy).toHaveBeenCalledTimes(0);
    expect(checkForCompletedSpy).toHaveBeenCalledTimes(2);
    expect(checkForProcessingSpy).toHaveBeenCalledTimes(1);
    expect(validateFreeSpaceSpy).toHaveBeenCalledTimes(0);
    expect(response.body).toStrictEqual(expectedInProgressJobResponse);
    expect(response.status).toBe(httpStatusCodes.OK);
  });

  describe('Sad Path', function () {
    it('should return 400 status code because of bad data - no "dbId" field', async function () {
      const body = {
        targetResolution: 0.0000429153442382812,
        bbox: [34.811938017107494, 31.95475033759175, 34.82237261707599, 31.96426962177354],
        callbackURLs: ['http://example.getmap.com/callback'],
        crs: 'EPSG:4326',
        priority: 0,
      } as unknown as ICreatePackage;

      const resposne = await requestSender.create(body);

      expect(resposne).toSatisfyApiSpec();
      expect(findLayerSpy).toHaveBeenCalledTimes(0);
      expect(createJobSpy).toHaveBeenCalledTimes(0);
      expect(resposne.status).toBe(httpStatusCodes.BAD_REQUEST);
    });
  });

  describe('Bad Path', function () {
    it('should return 507 status code for insufficient storage to gpkg creation', async function () {
      const body: ICreatePackage = {
        dbId: layerFromCatalog.id,
        bbox: [34.811938017107494, 31.95475033759175, 34.82237261707599, 31.96426962177354],
        targetResolution: 0.00034332275390625,
        callbackURLs: ['http://example.getmap.com/callback'],
        crs: 'EPSG:4326',
        priority: 0,
      };
      generateTileGroupsSpy.mockReturnValue([]);
      findLayerSpy.mockResolvedValue(layerFromCatalog);
      checkForDuplicateSpy.mockResolvedValue(undefined);
      validateFreeSpaceSpy.mockResolvedValue(false);
      const resposne = await requestSender.create(body);

      expect(resposne).toSatisfyApiSpec();
      expect(findLayerSpy).toHaveBeenCalledTimes(1);
      expect(createJobSpy).toHaveBeenCalledTimes(0);
      expect(resposne.status).toBe(httpStatusCodes.INSUFFICIENT_STORAGE);
    });
  });
});
