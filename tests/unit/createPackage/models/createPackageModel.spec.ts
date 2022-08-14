import { BadRequestError } from '@map-colonies/error-types';
import jsLogger from '@map-colonies/js-logger';
import { OperationStatus } from '@map-colonies/mc-priority-queue';
import { JobManagerWrapper } from '../../../../src/clients/jobManagerWrapper';
import { RasterCatalogManagerClient } from '../../../../src/clients/rasterCatalogManagerClient';
import { ICreateJobResponse, ICreatePackage, JobDuplicationParams } from '../../../../src/common/interfaces';
import { CreatePackageManager } from '../../../../src/createPackage/models/createPackageManager';
import { inProgressJob, layerFromCatalog, userInput } from '../../../mocks/data';

let createPackageManager: CreatePackageManager;
let jobManagerWrapperMock: JobManagerWrapper;
let rasterCatalogManagerClientMock: RasterCatalogManagerClient;
const findLayerStub = jest.fn();
const createJobStub = jest.fn();
const updateJobStub = jest.fn();
const findCompletedJobMock = jest.fn();
const findInProgressJobMock = jest.fn();
const findPendingJobMock = jest.fn();

describe('CreatePackageManager', () => {
  beforeEach(() => {
    const logger = jsLogger({ enabled: false });
    rasterCatalogManagerClientMock = {
      findLayer: findLayerStub,
    } as unknown as RasterCatalogManagerClient;
    jobManagerWrapperMock = {
      create: createJobStub,
      findCompletedJob: findCompletedJobMock,
      findInProgressJob: findInProgressJobMock,
      findPendingJob: findPendingJobMock,
      updateJob: updateJobStub,
    } as unknown as JobManagerWrapper;
    createPackageManager = new CreatePackageManager(logger, jobManagerWrapperMock, rasterCatalogManagerClientMock);
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
      const jobDupParams: JobDuplicationParams = {
        resourceId: 'temp_resourceId',
        version: 'temp_version',
        dbId: layerFromCatalog.id,
        zoomLevel: 4,
        sanitizedBbox: [0, 1, 3, 5],
        crs: 'EPSG:4326',
      };

      findLayerStub.mockResolvedValue(layerFromCatalog);
      createJobStub.mockResolvedValue({
        jobId: '09e29fa8-7283-4334-b3a4-99f75922de59',
        taskIds: ['66aa1e2e-784c-4178-b5a0-af962937d561'],
        status: OperationStatus.IN_PROGRESS,
      });

      findCompletedJobMock.mockResolvedValue(undefined);
      findInProgressJobMock.mockResolvedValue(undefined);
      findPendingJobMock.mockResolvedValue(undefined);

      // eslint-disable-next-line
      const checkForDuplicateResponse = await (createPackageManager as unknown as { checkForDuplicate: any }).checkForDuplicate(jobDupParams, []);

      await createPackageManager.createPackage(req);

      expect(checkForDuplicateResponse).toBeUndefined();
      expect(findLayerStub).toHaveBeenCalledTimes(1);
      expect(createJobStub).toHaveBeenCalledTimes(1);
      expect(findCompletedJobMock).toHaveBeenCalledTimes(2);
      expect(findInProgressJobMock).toHaveBeenCalledTimes(2);
    });

    it('should return job and task-ids of existing in pending job', async () => {
      const jobDupParams: JobDuplicationParams = {
        resourceId: layerFromCatalog.metadata.productId as string,
        version: layerFromCatalog.metadata.productVersion as string,
        dbId: layerFromCatalog.id,
        zoomLevel: 4,
        sanitizedBbox: userInput.bbox,
        crs: userInput.crs as string,
      };

      findLayerStub.mockResolvedValue(layerFromCatalog);
      createJobStub.mockResolvedValue(undefined);

      updateJobStub.mockResolvedValue(undefined);
      findCompletedJobMock.mockResolvedValue(undefined);
      findInProgressJobMock.mockResolvedValue(undefined);
      findPendingJobMock.mockResolvedValue(inProgressJob);

      // eslint-disable-next-line
      const checkForDuplicateResponse = await (createPackageManager as unknown as { checkForDuplicate: any }).checkForDuplicate(jobDupParams, []);

      await createPackageManager.createPackage(userInput);
      const expectedReturn: ICreateJobResponse = {
        id: inProgressJob.id,
        taskIds: [inProgressJob.tasks[0].id],
        status: OperationStatus.IN_PROGRESS,
      };

      expect(findLayerStub).toHaveBeenCalledTimes(1);
      expect(createJobStub).toHaveBeenCalledTimes(0);
      expect(checkForDuplicateResponse).toEqual(expectedReturn);

      expect(findCompletedJobMock).toHaveBeenCalledTimes(4);
      expect(findInProgressJobMock).toHaveBeenCalledTimes(2);
      expect(findPendingJobMock).toHaveBeenCalledTimes(2);
    });

    it('should return job and task-ids of existing in progress job', async () => {
      const jobDupParams: JobDuplicationParams = {
        resourceId: layerFromCatalog.metadata.productId as string,
        version: layerFromCatalog.metadata.productVersion as string,
        dbId: layerFromCatalog.id,
        zoomLevel: 4,
        sanitizedBbox: userInput.bbox,
        crs: userInput.crs as string,
      };

      findLayerStub.mockResolvedValue(layerFromCatalog);
      createJobStub.mockResolvedValue(undefined);

      updateJobStub.mockResolvedValue(undefined);
      findCompletedJobMock.mockResolvedValue(undefined);
      findInProgressJobMock.mockResolvedValue(inProgressJob);

      // eslint-disable-next-line
      const checkForDuplicateResponse = await (createPackageManager as unknown as { checkForDuplicate: any }).checkForDuplicate(jobDupParams, []);

      await createPackageManager.createPackage(userInput);
      const expectedReturn: ICreateJobResponse = {
        id: inProgressJob.id,
        taskIds: [inProgressJob.tasks[0].id],
        status: OperationStatus.IN_PROGRESS,
      };

      expect(findLayerStub).toHaveBeenCalledTimes(1);
      expect(createJobStub).toHaveBeenCalledTimes(0);
      expect(checkForDuplicateResponse).toEqual(expectedReturn);

      expect(findCompletedJobMock).toHaveBeenCalledTimes(4);
      expect(findInProgressJobMock).toHaveBeenCalledTimes(2);
      expect(findPendingJobMock).toHaveBeenCalledTimes(0);
    });

    it('should throw bad request error when requested resolution is higher then the layer resolution', async () => {
      const layer = { ...layerFromCatalog, metadata: { ...layerFromCatalog.metadata, maxResolutionDeg: 0.072 } };
      findLayerStub.mockResolvedValue(layer);

      const action = async () => createPackageManager.createPackage(userInput);

      await expect(action).rejects.toThrow(BadRequestError);
    });
  });
});
