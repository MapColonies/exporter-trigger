import jsLogger from '@map-colonies/js-logger';
import { JobManagerClient } from '../../../../src/clients/jobManagerClient';
import { RasterCatalogManagerClient } from '../../../../src/clients/rasterCatalogManagerClient';
import { ICreatePackage } from '../../../../src/common/interfaces';
import { CreatePackageManager } from '../../../../src/createPackage/models/createPackageManager';
import { layerFromCatalog } from '../../../mocks/data';

let createPackageManager: CreatePackageManager;
let jobManagerClient: JobManagerClient;
let rasterCatalogManagerClient: RasterCatalogManagerClient;
let findLayerStub: jest.Mock;
let createJobStub: jest.Mock;

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
      const userInput: ICreatePackage = {
        dbId: '6007f15c-8978-4c83-adcb-655fb2185856',
        targetResolution: 0.0000014576721191406,
        callbackURL: 'http://callback-url.com',
        bbox: [0, 0, 1, 1],
        packageName: 'temp',
      };

      findLayerStub = jest.fn();
      createJobStub = jest.fn();

      rasterCatalogManagerClient.findLayer = findLayerStub.mockResolvedValue(layerFromCatalog);
      jobManagerClient.createJob = createJobStub.mockResolvedValue({
        jobId: '09e29fa8-7283-4334-b3a4-99f75922de59',
        taskId: '66aa1e2e-784c-4178-b5a0-af962937d561',
      });

      await createPackageManager.createPackage(userInput);

      expect(findLayerStub).toHaveBeenCalledTimes(1);
      expect(createJobStub).toHaveBeenCalledTimes(1);
    });
  });
});
