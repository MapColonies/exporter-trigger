import jsLogger from '@map-colonies/js-logger';
import { OperationStatus } from '@map-colonies/mc-priority-queue';
import { getUTCDate } from '@map-colonies/mc-utils';
import { JobManagerWrapper } from '../../../src/clients/jobManagerWrapper';
import { JobResponse } from '../../../src/common/interfaces';
import { configMock, registerDefaultConfig } from '../../mocks/config';
import { inProgressJob, jobs, workerInput } from '../../mocks/data';

let jobManagerClient: JobManagerWrapper;
let postFun: jest.Mock;
let putFun: jest.Mock;
let getJobs: jest.Mock;
let get: jest.Mock;

describe('JobManagerClient', () => {
  describe('#createJob', () => {
    beforeEach(() => {
      registerDefaultConfig();
      const logger = jsLogger({ enabled: false });
      jobManagerClient = new JobManagerWrapper(logger);
    });

    afterEach(() => {
      jest.resetAllMocks();
      jest.restoreAllMocks();
    });

    it('should create job successfully', async () => {
      postFun = jest.fn();
      (jobManagerClient as unknown as { post: unknown }).post = postFun.mockResolvedValue({ id: '123', taskIds: ['123'] });
      await jobManagerClient.create(workerInput);

      expect(postFun).toHaveBeenCalledTimes(1);
    });

    it('should update job successfully', async () => {
      putFun = jest.fn();
      (jobManagerClient as unknown as { put: unknown }).put = putFun.mockResolvedValue(undefined);
      await jobManagerClient.updateJob('123213', { status: OperationStatus.COMPLETED });

      expect(putFun).toHaveBeenCalledTimes(1);
    });

    it('should findCompletedJobs successfully', async () => {
      getJobs = jest.fn();

      const jobManager = jobManagerClient as unknown as { getJobs: unknown };
      jobManager.getJobs = getJobs.mockResolvedValue(jobs);

      const completedJobs = await jobManagerClient.findCompletedJob({
        resourceId: jobs[0].resourceId,
        version: jobs[0].version,
        dbId: jobs[0].internalId as string,
        zoomLevel: jobs[0].parameters.zoomLevel,
        crs: 'EPSG:4326',
        sanitizedBbox: jobs[0].parameters.sanitizedBbox,
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
        dbId: jobs[0].internalId as string,
        zoomLevel: jobs[0].parameters.zoomLevel,
        crs: 'EPSG:4326',
        sanitizedBbox: jobs[0].parameters.sanitizedBbox,
      });

      expect(getJobs).toHaveBeenCalledTimes(1);
      expect(completedJobs).toBeDefined();
    });

    it('should get In-Progress jobs status successfully', async () => {
      getJobs = jest.fn();
      const jobs: JobResponse[] = [];
      jobs.push(inProgressJob);
      const jobManager = jobManagerClient as unknown as { getJobs: unknown };
      jobManager.getJobs = getJobs.mockResolvedValue(jobs);

      const result = await jobManagerClient.getInProgressJobs();

      expect(getJobs).toHaveBeenCalledTimes(1);
      expect(result).toBeDefined();
      expect(result).toEqual(jobs);
    });

    it('should successfully update job expirationDate (old expirationDate lower)', async () => {
      const expirationDays: number = configMock.get('jobManager.expirationDays');
      const testExpirationDate = getUTCDate();
      const expectedNewExpirationDate = getUTCDate();
      testExpirationDate.setDate(testExpirationDate.getDate() - expirationDays);
      expectedNewExpirationDate.setDate(expectedNewExpirationDate.getDate() + expirationDays);
      expectedNewExpirationDate.setSeconds(0, 0);

      get = jest.fn();
      putFun = jest.fn();
      (jobManagerClient as unknown as { put: unknown }).put = putFun.mockResolvedValue(undefined);
      const jobManager = jobManagerClient as unknown as { get: unknown };
      jobManager.get = get.mockResolvedValue({ ...inProgressJob, expirationDate: testExpirationDate });

      await jobManagerClient.validateAndUpdateExpiration(inProgressJob.id);

      expect(get).toHaveBeenCalledTimes(1);
      expect(putFun).toHaveBeenCalledTimes(1);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const expirationParamCall: Date = putFun.mock.calls[0][1].expirationDate;
      expirationParamCall.setSeconds(0, 0);
      expect(JSON.stringify(expirationParamCall)).toBe(JSON.stringify(expectedNewExpirationDate));
    });

    it('should not update job expirationDate (old expirationDate higher)', async () => {
      const expirationDays: number = configMock.get('jobManager.expirationDays');
      const testExpirationDate = getUTCDate();
      const expectedNewExpirationDate = getUTCDate();
      testExpirationDate.setDate(testExpirationDate.getDate() + 2 * expirationDays);
      expectedNewExpirationDate.setDate(expectedNewExpirationDate.getDate() + expirationDays);
      expectedNewExpirationDate.setSeconds(0, 0);

      get = jest.fn();
      putFun = jest.fn();
      (jobManagerClient as unknown as { put: unknown }).put = putFun.mockResolvedValue(undefined);
      const jobManager = jobManagerClient as unknown as { get: unknown };
      jobManager.get = get.mockResolvedValue({ ...inProgressJob, expirationDate: testExpirationDate });

      await jobManagerClient.validateAndUpdateExpiration(inProgressJob.id);

      expect(get).toHaveBeenCalledTimes(1);
      expect(putFun).toHaveBeenCalledTimes(0);
    });
  });
});
