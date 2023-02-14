import fs from 'fs';
import { sep } from 'path';
import { BadRequestError } from '@map-colonies/error-types';
import jsLogger from '@map-colonies/js-logger';
import { IJobResponse, OperationStatus } from '@map-colonies/mc-priority-queue';
import { LayerMetadata } from '@map-colonies/mc-model-types';
import { BBox, Polygon } from '@turf/helpers';
import {
  jobManagerWrapperMock,
  findCompletedJobMock,
  findInProgressJobMock,
  findPendingJobMock,
  updateJobMock,
  createMock,
} from '../../../mocks/clients/jobManagerWrapper';
import { catalogManagerMock, findLayerMock } from '../../../mocks/clients/catalogManagerClient';
import { ICreateJobResponse, ICreatePackage, IJobParameters, ITaskParameters, JobDuplicationParams } from '../../../../src/common/interfaces';
import { CreatePackageManager } from '../../../../src/createPackage/models/createPackageManager';
import { completedJob, inProgressJob, layerFromCatalog, userInput } from '../../../mocks/data';
import { configMock, registerDefaultConfig } from '../../../mocks/config';
import { METADA_JSON_FILE_EXTENSION } from '../../../../src/common/constants';

jest.mock('fs', () => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return {
    ...jest.requireActual('fs'),
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    promises: {
      ...jest.requireActual('fs/promises'),
      writeFile: jest.fn(),
    },
  };
});

let createPackageManager: CreatePackageManager;

describe('CreatePackageManager', () => {
  beforeEach(() => {
    const logger = jsLogger({ enabled: false });
    registerDefaultConfig();
    createPackageManager = new CreatePackageManager(configMock, logger, jobManagerWrapperMock, catalogManagerMock);
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  describe('#create', () => {
    it('should create job and return its job and task ids', async () => {
      const req: ICreatePackage = {
        dbId: layerFromCatalog.id,
        bbox: [0, 1, 3, 5],
        callbackURLs: ['testUrl'],
        targetResolution: 0.0439453125,
        crs: 'EPSG:4326',
      };

      const expectedsanitizedBbox: BBox = [0, 0, 11.25, 11.25];
      const jobDupParams: JobDuplicationParams = {
        resourceId: 'string',
        version: '1.0',
        dbId: layerFromCatalog.id,
        zoomLevel: 4,
        sanitizedBbox: expectedsanitizedBbox,
        crs: 'EPSG:4326',
      };

      const expectedCreateJobResponse = {
        jobId: '09e29fa8-7283-4334-b3a4-99f75922de59',
        taskIds: ['66aa1e2e-784c-4178-b5a0-af962937d561'],
        status: OperationStatus.IN_PROGRESS,
      };
      const validateFreeSpaceSpy = jest.spyOn(CreatePackageManager.prototype as unknown as { validateFreeSpace: jest.Mock }, 'validateFreeSpace');

      findLayerMock.mockResolvedValue(layerFromCatalog);
      createMock.mockResolvedValue(expectedCreateJobResponse);
      findCompletedJobMock.mockResolvedValue(undefined);
      findInProgressJobMock.mockResolvedValue(undefined);
      findPendingJobMock.mockResolvedValue(undefined);
      validateFreeSpaceSpy.mockResolvedValue(true);
      const res = await createPackageManager.createPackage(req);

      expect(res).toEqual(expectedCreateJobResponse);
      expect(findLayerMock).toHaveBeenCalledWith(req.dbId);
      expect(findLayerMock).toHaveBeenCalledTimes(1);
      expect(createMock).toHaveBeenCalledTimes(1);
      expect(findCompletedJobMock).toHaveBeenCalledWith(jobDupParams);
      expect(findCompletedJobMock).toHaveBeenCalledTimes(1);
      expect(findInProgressJobMock).toHaveBeenCalledWith(jobDupParams);
      expect(findInProgressJobMock).toHaveBeenCalledTimes(1);
    });

    it('should create job and convert provided footprint to bbox', async () => {
      const footprint: Polygon = {
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
      };
      const req: ICreatePackage = {
        dbId: layerFromCatalog.id,
        bbox: footprint,
        callbackURLs: ['testUrl'],
        targetResolution: 0.0439453125,
        crs: 'EPSG:4326',
      };

      const expectedsanitizedBbox: BBox = [22.5, 11.25, 56.25, 45];
      const jobDupParams: JobDuplicationParams = {
        resourceId: 'string',
        version: '1.0',
        dbId: layerFromCatalog.id,
        zoomLevel: 4,
        sanitizedBbox: expectedsanitizedBbox,
        crs: 'EPSG:4326',
      };

      const expectedCreateJobResponse = {
        jobId: '09e29fa8-7283-4334-b3a4-99f75922de59',
        taskIds: ['66aa1e2e-784c-4178-b5a0-af962937d561'],
        status: OperationStatus.IN_PROGRESS,
      };
      const validateFreeSpaceSpy = jest.spyOn(CreatePackageManager.prototype as unknown as { validateFreeSpace: jest.Mock }, 'validateFreeSpace');
      const normalize2PolygonSpy = jest.spyOn(CreatePackageManager.prototype as unknown as { normalize2Polygon: jest.Mock }, 'normalize2Polygon');

      findLayerMock.mockResolvedValue(layerFromCatalog);
      createMock.mockResolvedValue(expectedCreateJobResponse);
      findCompletedJobMock.mockResolvedValue(undefined);
      findInProgressJobMock.mockResolvedValue(undefined);
      findPendingJobMock.mockResolvedValue(undefined);
      validateFreeSpaceSpy.mockResolvedValue(true);
      const res = await createPackageManager.createPackage(req);

      expect(res).toEqual(expectedCreateJobResponse);
      expect(findLayerMock).toHaveBeenCalledWith(req.dbId);
      expect(findLayerMock).toHaveBeenCalledTimes(1);
      expect(normalize2PolygonSpy).toHaveBeenCalledTimes(1);
      expect(createMock).toHaveBeenCalledTimes(1);
      expect(findCompletedJobMock).toHaveBeenCalledWith(jobDupParams);
      expect(findCompletedJobMock).toHaveBeenCalledTimes(1);
      expect(findInProgressJobMock).toHaveBeenCalledWith(jobDupParams);
      expect(findInProgressJobMock).toHaveBeenCalledTimes(1);
    });

    it(`should create job and take original layer's resolution and sanitized bbox`, async () => {
      const req: ICreatePackage = {
        dbId: layerFromCatalog.id,
        callbackURLs: ['testUrl'],
        crs: 'EPSG:4326',
      };

      const expectedCreateJobResponse = {
        jobId: '09e29fa8-7283-4334-b3a4-99f75922de59',
        taskIds: ['66aa1e2e-784c-4178-b5a0-af962937d561'],
        status: OperationStatus.IN_PROGRESS,
      };

      const validateFreeSpaceSpy = jest.spyOn(CreatePackageManager.prototype as unknown as { validateFreeSpace: jest.Mock }, 'validateFreeSpace');

      const expectedsanitizedBbox: BBox = [0, -90, 180, 90];
      const expectedTargetResolution = layerFromCatalog.metadata.maxResolutionDeg;

      findLayerMock.mockResolvedValue(layerFromCatalog);
      createMock.mockResolvedValue(expectedCreateJobResponse);
      findCompletedJobMock.mockResolvedValue(undefined);
      findInProgressJobMock.mockResolvedValue(undefined);
      findPendingJobMock.mockResolvedValue(undefined);
      validateFreeSpaceSpy.mockResolvedValue(true);

      const res = await createPackageManager.createPackage(req);

      expect(res).toEqual(expectedCreateJobResponse);
      expect(findLayerMock).toHaveBeenCalledWith(req.dbId);
      expect(findLayerMock).toHaveBeenCalledTimes(1);
      expect(createMock).toHaveBeenCalledTimes(1);
      expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({
          targetResolution: expectedTargetResolution,
          sanitizedBbox: expectedsanitizedBbox,
        })
      );
    });

    it('should return job and task-ids of existing in pending job', async () => {
      const expectedsanitizedBbox: BBox = [0, 2.8125, 25.3125, 42.1875];
      const jobDupParams: JobDuplicationParams = {
        resourceId: layerFromCatalog.metadata.productId as string,
        version: layerFromCatalog.metadata.productVersion as string,
        dbId: layerFromCatalog.id,
        zoomLevel: 7,
        sanitizedBbox: expectedsanitizedBbox,
        crs: userInput.crs as string,
      };

      findLayerMock.mockResolvedValue(layerFromCatalog);
      createMock.mockResolvedValue(undefined);
      updateJobMock.mockResolvedValue(undefined);
      findCompletedJobMock.mockResolvedValue(undefined);
      findInProgressJobMock.mockResolvedValue(undefined);
      findPendingJobMock.mockResolvedValue(JSON.parse(JSON.stringify(inProgressJob)));

      await createPackageManager.createPackage(userInput);

      expect(findLayerMock).toHaveBeenCalledWith(layerFromCatalog.id);
      expect(findLayerMock).toHaveBeenCalledTimes(1);
      expect(createMock).toHaveBeenCalledTimes(0);
      expect(findCompletedJobMock).toHaveBeenNthCalledWith(1, jobDupParams);
      expect(findCompletedJobMock).toHaveBeenNthCalledWith(2, jobDupParams);
      expect(findCompletedJobMock).toHaveBeenCalledTimes(2);
      expect(findInProgressJobMock).toHaveBeenCalledWith(jobDupParams);
      expect(findInProgressJobMock).toHaveBeenCalledTimes(1);
      expect(findPendingJobMock).toHaveBeenCalledWith(jobDupParams);
      expect(findPendingJobMock).toHaveBeenCalledTimes(1);
    });

    it('should return job and task-ids of existing in progress job', async () => {
      const expectedsanitizedBbox: BBox = [0, 2.8125, 25.3125, 42.1875];
      const jobDupParams: JobDuplicationParams = {
        resourceId: layerFromCatalog.metadata.productId as string,
        version: layerFromCatalog.metadata.productVersion as string,
        dbId: layerFromCatalog.id,
        zoomLevel: 7,
        sanitizedBbox: expectedsanitizedBbox,
        crs: userInput.crs as string,
      };

      findLayerMock.mockResolvedValue(layerFromCatalog);
      createMock.mockResolvedValue(undefined);
      updateJobMock.mockResolvedValue(undefined);
      findCompletedJobMock.mockResolvedValue(undefined);
      findInProgressJobMock.mockResolvedValue(JSON.parse(JSON.stringify(inProgressJob)));

      const res = await createPackageManager.createPackage(userInput);
      const expectedReturn: ICreateJobResponse = {
        id: inProgressJob.id,
        taskIds: [(inProgressJob.tasks as unknown as IJobResponse<IJobParameters, ITaskParameters>[])[0].id],
        status: OperationStatus.IN_PROGRESS,
      };

      expect(res).toEqual(expectedReturn);
      expect(findLayerMock).toHaveBeenCalledWith(jobDupParams.dbId);
      expect(findLayerMock).toHaveBeenCalledTimes(1);
      expect(createMock).toHaveBeenCalledTimes(0);
      expect(findCompletedJobMock).toHaveBeenNthCalledWith(1, jobDupParams);
      expect(findCompletedJobMock).toHaveBeenNthCalledWith(2, jobDupParams);
      expect(findCompletedJobMock).toHaveBeenCalledTimes(2);
      expect(findInProgressJobMock).toHaveBeenCalledWith(jobDupParams);
      expect(findInProgressJobMock).toHaveBeenCalledTimes(1);
      expect(findPendingJobMock).toHaveBeenCalledTimes(0);
    });

    it('should increase callbacks array of existing in progress job', async () => {
      const expectedsanitizedBbox: BBox = [0, 2.8125, 25.3125, 42.1875];
      const jobDupParams: JobDuplicationParams = {
        resourceId: layerFromCatalog.metadata.productId as string,
        version: layerFromCatalog.metadata.productVersion as string,
        dbId: layerFromCatalog.id,
        zoomLevel: 7,
        sanitizedBbox: expectedsanitizedBbox,
        crs: userInput.crs as string,
      };
      const expirationDays: number = configMock.get('jobManager.expirationDays');
      const testExpirationDate = new Date();
      testExpirationDate.setDate(testExpirationDate.getDate() - expirationDays);
      findLayerMock.mockResolvedValue(layerFromCatalog);
      createMock.mockResolvedValue(undefined);
      updateJobMock.mockResolvedValue(undefined);
      findCompletedJobMock.mockResolvedValue(undefined);
      findInProgressJobMock.mockResolvedValue(JSON.parse(JSON.stringify({ ...inProgressJob, expirationDate: testExpirationDate })));
      const jobUpdateParams = {
        parameters: {
          fileName: 'test.gpkg',
          relativeDirectoryPath: 'test',
          crs: 'EPSG:4326',
          sanitizedBbox: [0, 0, 25, 41],
          zoomLevel: 4,
          callbacks: [
            { url: 'http://localhost:6969', bbox: [0, 0, 25, 41] },
            { url: 'http://new-added-callback-url.com', bbox: [-5, 3, 25, 41] },
          ],
          targetResolution: 0.0439453125,
        },
      };
      const res = await createPackageManager.createPackage({ ...userInput, callbackURLs: ['http://new-added-callback-url.com'] });
      const expectedReturn: ICreateJobResponse = {
        id: inProgressJob.id,
        taskIds: [(inProgressJob.tasks as unknown as IJobResponse<IJobParameters, ITaskParameters>[])[0].id],
        status: OperationStatus.IN_PROGRESS,
      };

      expect(res).toEqual(expectedReturn);
      expect(findLayerMock).toHaveBeenCalledWith(jobDupParams.dbId);
      expect(findLayerMock).toHaveBeenCalledTimes(1);
      expect(createMock).toHaveBeenCalledTimes(0);
      expect(findCompletedJobMock).toHaveBeenNthCalledWith(1, jobDupParams);
      expect(findCompletedJobMock).toHaveBeenNthCalledWith(2, jobDupParams);
      expect(findCompletedJobMock).toHaveBeenCalledTimes(2);
      expect(findInProgressJobMock).toHaveBeenCalledWith(jobDupParams);
      expect(findInProgressJobMock).toHaveBeenCalledTimes(1);
      expect(updateJobMock).toHaveBeenCalledWith('fa3ab609-377a-4d96-bf0b-e0bb72f683b8', jobUpdateParams);
      expect(findPendingJobMock).toHaveBeenCalledTimes(0);
    });

    it('should throw bad request error when requested resolution is higher than the layer resolution', async () => {
      const layer = { ...layerFromCatalog, metadata: { ...layerFromCatalog.metadata, maxResolutionDeg: 0.072 } };
      findLayerMock.mockResolvedValue(layer);

      const action = async () => createPackageManager.createPackage(userInput);

      await expect(action).rejects.toThrow(BadRequestError);
      expect(findLayerMock).toHaveBeenCalledTimes(1);
      expect(findLayerMock).toHaveBeenCalledWith(layer.id);
    });
  });

  it('should create metada.json file with the correct parameters', async () => {
    const fileName = 'file';
    const directoryName = '/tmp/gpkgDir';

    const mockGgpkgPath = `${directoryName}/${fileName}`;

    findLayerMock.mockResolvedValue(layerFromCatalog);

    await createPackageManager.createJsonMetadata(mockGgpkgPath, completedJob);

    const expectedFileName = `${directoryName}${sep}${fileName}${METADA_JSON_FILE_EXTENSION}`;
    const expectedMetadata: LayerMetadata = {
      ...layerFromCatalog.metadata,
      maxResolutionDeg: completedJob.parameters.targetResolution,
      footprint: {
        type: 'Feature',
        bbox: [0, 0, 25, 41],
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [0, 0],
              [25, 0],
              [25, 41],
              [0, 41],
              [0, 0],
            ],
          ],
        },
      },
    };

    expect(fs.promises.writeFile).toHaveBeenCalledTimes(1);
    expect(fs.promises.writeFile).toHaveBeenCalledWith(expectedFileName, JSON.stringify(expectedMetadata));
  });
});
