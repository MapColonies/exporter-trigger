import jsLogger from '@map-colonies/js-logger';
import { JobManagerClient } from '../../../src/clients/jobManagerClient';
import { layerMetadata, workerInput } from '../../mocks/data';

let jobManagerClient: JobManagerClient;
let postFun: jest.Mock;

describe('JobManagerClient', () => {
  describe('#createJob', () => {
    beforeEach(() => {
      const logger = jsLogger({ enabled: false });
      jobManagerClient = new JobManagerClient(logger);
    });

    afterEach(() => {
      jest.resetAllMocks();
      jest.restoreAllMocks();
    });

    it('should create job successfully', async () => {
      postFun = jest.fn();
      (jobManagerClient as unknown as { post: unknown }).post = postFun.mockResolvedValue({ id: '123', taskIds: ['123'] });
      await jobManagerClient.createJob(workerInput, layerMetadata);

      expect(postFun).toHaveBeenCalledTimes(1);
    });
  });
});
