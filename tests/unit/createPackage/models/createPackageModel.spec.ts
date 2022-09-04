import { BadRequestError } from '@map-colonies/error-types';
import jsLogger from '@map-colonies/js-logger';
import { OperationStatus } from '@map-colonies/mc-priority-queue';
import { BBox2d } from '@turf/helpers/dist/js/lib/geojson';
import {
  jobManagerWrapperMock,
  findCompletedJobMock,
  findInProgressJobMock,
  findPendingJobMock,
  updateJobMock,
  createMock,
} from '../../../mocks/clients/jobManagerWrapper';
import { catalogManagerMock, findLayerMock } from '../../../mocks/clients/catalogManagerClient';
import { ICreateJobResponse, ICreatePackage, JobDuplicationParams } from '../../../../src/common/interfaces';
import { CreatePackageManager } from '../../../../src/createPackage/models/createPackageManager';
import { inProgressJob, layerFromCatalog, userInput } from '../../../mocks/data';

let createPackageManager: CreatePackageManager;

describe('CreatePackageManager', () => {
  beforeEach(() => {
    const logger = jsLogger({ enabled: false });
    createPackageManager = new CreatePackageManager(logger, jobManagerWrapperMock, catalogManagerMock);
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  describe('#create', () => {
    it('should create job and return his job and task ids', async () => {
      const req: ICreatePackage = {
        dbId: layerFromCatalog.id,
        bbox: [0, 1, 3, 5],
        callbackURLs: ['testUrl'],
        targetResolution: 0.0439453125,
        crs: 'EPSG:4326',
      };

      const expectedsanitizedBbox: BBox2d = [0, -90, 180, 90];
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

      findLayerMock.mockResolvedValue(layerFromCatalog);
      createMock.mockResolvedValue(expectedCreateJobResponse);
      findCompletedJobMock.mockResolvedValue(undefined);
      findInProgressJobMock.mockResolvedValue(undefined);
      findPendingJobMock.mockResolvedValue(undefined);

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

    it('should return job and task-ids of existing in pending job', async () => {
      const expectedsanitizedBbox: BBox2d = [0, 2.8125, 25.3125, 42.1875];
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
      findPendingJobMock.mockResolvedValue(inProgressJob);

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
      const expectedsanitizedBbox: BBox2d = [0, 2.8125, 25.3125, 42.1875];
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
      findInProgressJobMock.mockResolvedValue(inProgressJob);

      const res = await createPackageManager.createPackage(userInput);
      const expectedReturn: ICreateJobResponse = {
        id: inProgressJob.id,
        taskIds: [inProgressJob.tasks![0].id],
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

    it('should throw bad request error when requested resolution is higher then the layer resolution', async () => {
      const layer = { ...layerFromCatalog, metadata: { ...layerFromCatalog.metadata, maxResolutionDeg: 0.072 } };
      findLayerMock.mockResolvedValue(layer);

      const action = async () => createPackageManager.createPackage(userInput);

      await expect(action).rejects.toThrow(BadRequestError);
      expect(findLayerMock).toHaveBeenCalledTimes(1);
      expect(findLayerMock).toHaveBeenCalledWith(layer.id);
    });
  });
});
