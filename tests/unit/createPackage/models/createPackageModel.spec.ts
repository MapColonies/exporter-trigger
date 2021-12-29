import jsLogger from '@map-colonies/js-logger';
import { JobManagerClient } from '../../../../src/clients/jobManagerClient';
import { RasterCatalogManagerClient } from '../../../../src/clients/rasterCatalogManagerClient';
import { ICreateJobResponse, ICreatePackage } from '../../../../src/common/interfaces';
import { CreatePackageManager } from '../../../../src/createPackage/models/createPackageManager';
import { jobs, layerFromCatalog, userInput } from '../../../mocks/data';

let createPackageManager: CreatePackageManager;
let jobManagerClient: JobManagerClient;
let rasterCatalogManagerClient: RasterCatalogManagerClient;
let findLayerStub: jest.Mock;
let createJobStub: jest.Mock;
let getJobsStub: jest.Mock;
let updateJobStub: jest.Mock;

describe('CreatePackageManager', () => {
  beforeEach(() => {
    const logger = jsLogger({ enabled: false });
    jobManagerClient = new JobManagerClient(logger);
    rasterCatalogManagerClient = new RasterCatalogManagerClient(logger);
    createPackageManager = new CreatePackageManager(logger, jobManagerClient, rasterCatalogManagerClient);
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  describe('#create', () => {
    it('should create job and return its job and task ids', async () => {
      const input = {
        resourceId: 'temp_resourceId',
        version: 'temp_version',
        dbId: 'layerFromCatalog.id',
        targetResolution: 0.0000525,
        bbox: [0, 0, 0, 0],
        crs: 'EPSG:4326', 
        callbackURL: ['http://localhost:8080']
      };

      findLayerStub = jest.fn();
      createJobStub = jest.fn();
      getJobsStub = jest.fn();

      rasterCatalogManagerClient.findLayer = findLayerStub.mockResolvedValue(layerFromCatalog);
      jobManagerClient.createJob = createJobStub.mockResolvedValue({
        jobId: '09e29fa8-7283-4334-b3a4-99f75922de59',
        taskId: '66aa1e2e-784c-4178-b5a0-af962937d561',
      });

      const jobManager = jobManagerClient as unknown as { getJobs: unknown };
      jobManager.getJobs = getJobsStub.mockResolvedValue(jobs);

      // eslint-disable-next-line
      const checkForDuplicateResponse = await (createPackageManager as unknown as { checkForDuplicate: any }).checkForDuplicate(input);

      await createPackageManager.createPackage(input as unknown as ICreatePackage);

      expect(getJobsStub).toHaveBeenCalledTimes(6);
      expect(findLayerStub).toHaveBeenCalledTimes(1);
      expect(createJobStub).toHaveBeenCalledTimes(1);
      expect(checkForDuplicateResponse).toBeUndefined();
    });

    it('should return job and task-ids of existing in progress/pending job', async () => {
      findLayerStub = jest.fn();
      createJobStub = jest.fn();
      getJobsStub = jest.fn();
      updateJobStub = jest.fn();

      rasterCatalogManagerClient.findLayer = findLayerStub.mockResolvedValue(layerFromCatalog);
      jobManagerClient.createJob = createJobStub.mockResolvedValue(undefined);

      const jobManager = jobManagerClient as unknown as { getJobs: unknown; updateJob: unknown };
      jobManager.getJobs = getJobsStub.mockResolvedValue([jobs[0], jobs[1]]);
      jobManager.updateJob = updateJobStub.mockResolvedValue(undefined);

      // eslint-disable-next-line
      const checkForDuplicateResponse = await (createPackageManager as unknown as { checkForDuplicate: any }).checkForDuplicate(
        {
          resourceId: layerFromCatalog.metadata.productId,
          version: layerFromCatalog.metadata.productVersion,
          dbId: layerFromCatalog.id,
          targetResolution: userInput.targetResolution,
          bbox: userInput.bbox,
          crs: userInput.crs,
        },
        []
      );

      console.log(checkForDuplicateResponse);

      await createPackageManager.createPackage(userInput);
      const expectedReturn: ICreateJobResponse = {
        jobId: '5da59244-4748-4b0d-89b9-2c5e6ba72e70',
        taskIds: ['a3ffa55e-67b7-11ec-90d6-0242ac120003'],
      };

      expect(getJobsStub).toHaveBeenCalledTimes(2);
      expect(findLayerStub).toHaveBeenCalledTimes(1);
      expect(createJobStub).toHaveBeenCalledTimes(0);
      expect(checkForDuplicateResponse).toEqual(expectedReturn);
    });
  });
});
