import jsLogger from '@map-colonies/js-logger';
import { JobManagerClient } from '../../../src/clients/jobManagerClient';
import { JobStatus } from '../../../src/common/enums';
import { jobs, workerInput } from '../../mocks/data';

let jobManagerClient: JobManagerClient;
let postFun: jest.Mock;
let putFun: jest.Mock;
let getJobs: jest.Mock;

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
      await jobManagerClient.createJob(workerInput);

      expect(postFun).toHaveBeenCalledTimes(1);
    });

    it('should update job successfully', async () => {
      putFun = jest.fn();
      (jobManagerClient as unknown as { put: unknown }).put = putFun.mockResolvedValue(undefined);
      await jobManagerClient.updateJob('123213', { status: JobStatus.COMPLETED });

      expect(putFun).toHaveBeenCalledTimes(1);
    });

    it('should findCompletedJobs successfully', async () => {
      getJobs = jest.fn();

      const jobManager = jobManagerClient as unknown as { getJobs: unknown };
      jobManager.getJobs = getJobs.mockResolvedValue(jobs);

      const completedJobs = await jobManagerClient.findCompletedJob({
        resourceId: jobs[0].resourceId,
        version: jobs[0].version,
        dbId: jobs[0].parameters.dbId,
        targetResolution: jobs[0].parameters.targetResolution,
        crs: 'EPSG:4326',
        bbox: jobs[0].parameters.bbox,
      });

      expect(getJobs).toHaveBeenCalledTimes(1);
      expect(completedJobs).toBeDefined();
    });

    it('should findInProgressJob successfully', async () => {
      getJobs = jest.fn();

      const jobManager = jobManagerClient as unknown as { getJobs: unknown };
      jobManager.getJobs = getJobs.mockResolvedValue(jobs);

      const completedJobs = await jobManagerClient.findInProgressJob({
        resourceId: jobs[0].resourceId,
        version: jobs[0].version,
        dbId: jobs[0].parameters.dbId,
        targetResolution: jobs[0].parameters.targetResolution,
        crs: 'EPSG:4326',
        bbox: jobs[0].parameters.bbox,
      });

      expect(getJobs).toHaveBeenCalledTimes(1);
      expect(completedJobs).toBeDefined();
    });
  });
});
