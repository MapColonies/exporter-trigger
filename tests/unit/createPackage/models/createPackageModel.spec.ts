import jsLogger from '@map-colonies/js-logger';
import { OperationStatus } from '@map-colonies/mc-priority-queue';
import { JobManagerWrapper } from '../../../../src/clients/jobManagerWrapper';
import { RasterCatalogManagerClient } from '../../../../src/clients/rasterCatalogManagerClient';
import { ICreateJobResponse, ICreatePackage, JobDuplicationParams } from '../../../../src/common/interfaces';
import { CreatePackageManager } from '../../../../src/createPackage/models/createPackageManager';
import { inProgressJob, jobs, layerFromCatalog, userInput } from '../../../mocks/data';

let createPackageManager: CreatePackageManager;
let jobManagerWrapper: JobManagerWrapper;
let rasterCatalogManagerClient: RasterCatalogManagerClient;
let findLayerStub: jest.Mock;
let createJobStub: jest.Mock;
let getJobsStub: jest.Mock;
let updateJobStub: jest.Mock;

describe('CreatePackageManager', () => {
  beforeEach(() => {
    const logger = jsLogger({ enabled: false });
    jobManagerWrapper = new JobManagerWrapper(logger);
    rasterCatalogManagerClient = new RasterCatalogManagerClient(logger);
    createPackageManager = new CreatePackageManager(logger, jobManagerWrapper, rasterCatalogManagerClient);
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  describe('#create', () => {
    it('should create job and return its job and task ids', async () => {
      const jobDupParams: JobDuplicationParams = {
        resourceId: 'temp_resourceId',
        version: 'temp_version',
        dbId: layerFromCatalog.id,
        zoomLevel: 4,
        bbox: [0, 1, 3, 5],
        crs: 'EPSG:4326',
      };

      findLayerStub = jest.fn();
      createJobStub = jest.fn();
      getJobsStub = jest.fn();

      rasterCatalogManagerClient.findLayer = findLayerStub.mockResolvedValue(layerFromCatalog);
      jobManagerWrapper.createJob = createJobStub.mockResolvedValue({
        jobId: '09e29fa8-7283-4334-b3a4-99f75922de59',
        taskId: '66aa1e2e-784c-4178-b5a0-af962937d561',
      });

      const jobManager = jobManagerWrapper as unknown as { getJobs: unknown };
      jobManager.getJobs = getJobsStub.mockResolvedValue(jobs);

      // eslint-disable-next-line
      const checkForDuplicateResponse = await (createPackageManager as unknown as { checkForDuplicate: any }).checkForDuplicate(jobDupParams, []);

      await createPackageManager.createPackage(jobDupParams as unknown as ICreatePackage);

      expect(getJobsStub).toHaveBeenCalledTimes(8);
      expect(findLayerStub).toHaveBeenCalledTimes(1);
      expect(createJobStub).toHaveBeenCalledTimes(1);
      expect(checkForDuplicateResponse).toBeUndefined();
    });

    it('should return job and task-ids of existing in progress/pending job', async () => {
      const jobDupParams: JobDuplicationParams = {
        resourceId: layerFromCatalog.metadata.productId as string,
        version: layerFromCatalog.metadata.productVersion as string,
        dbId: layerFromCatalog.id,
        zoomLevel: 4,
        bbox: userInput.bbox,
        crs: userInput.crs as string,
      };

      findLayerStub = jest.fn();
      createJobStub = jest.fn();
      getJobsStub = jest.fn();
      updateJobStub = jest.fn();

      rasterCatalogManagerClient.findLayer = findLayerStub.mockResolvedValue(layerFromCatalog);
      jobManagerWrapper.createJob = createJobStub.mockResolvedValue(undefined);

      const jobManager = jobManagerWrapper as unknown as { getJobs: unknown; updateJob: unknown };
      jobManager.getJobs = getJobsStub
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce([inProgressJob])
        .mockResolvedValueOnce(undefined)
        .mockResolvedValue([inProgressJob]);
      jobManager.updateJob = updateJobStub.mockResolvedValue(undefined);

      // eslint-disable-next-line
      const checkForDuplicateResponse = await (createPackageManager as unknown as { checkForDuplicate: any }).checkForDuplicate(jobDupParams, []);

      await createPackageManager.createPackage(userInput);
      const expectedReturn: ICreateJobResponse = {
        id: inProgressJob.id,
        taskIds: [inProgressJob.tasks[0].id],
        status: OperationStatus.IN_PROGRESS,
      };

      expect(getJobsStub).toHaveBeenCalledTimes(4);
      expect(findLayerStub).toHaveBeenCalledTimes(1);
      expect(createJobStub).toHaveBeenCalledTimes(0);
      expect(checkForDuplicateResponse).toEqual(expectedReturn);
    });
  });
});
