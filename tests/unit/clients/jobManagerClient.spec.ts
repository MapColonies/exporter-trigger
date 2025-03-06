import jsLogger from '@map-colonies/js-logger';
import { trace } from '@opentelemetry/api';
import { container } from 'tsyringe';
import { NotFoundError } from '@map-colonies/error-types';
import { OperationStatus } from '@map-colonies/mc-priority-queue';
import { JobExportDuplicationParams } from '@src/common/interfaces';
import { inProgressJobsResponse } from '@tests/mocks/processingRequest';
import { completedExportJobsResponse } from '@tests/mocks/completedReqest';
import {
  createExportData,
  createJobResponse,
  dupParams,
  generateCreateJobRequest,
  getJobStatusByIdResponse,
  notContainedRoi,
} from '@tests/mocks/data';
import { SERVICES } from '../../../src/common/constants';
import { registerDefaultConfig } from '../../mocks/config';
import { JobManagerWrapper } from '../../../src/clients/jobManagerWrapper';

let jobManagerClient: JobManagerWrapper;
let put: jest.Mock;
let post: jest.Mock;
let get: jest.Mock;
let createJob: jest.Mock;

describe('JobManagerClient', () => {
  beforeEach(() => {
    const logger = jsLogger({ enabled: false });
    registerDefaultConfig();
    jobManagerClient = new JobManagerWrapper(logger, trace.getTracer('testTracer'));
    container.register(SERVICES.LOGGER, { useValue: logger });
  });

  afterEach(() => {
    container.clearInstances();
    jest.useRealTimers();
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  describe('Get jobs by job id', () => {
    it('should return job percentage and status by id', async () => {
      get = jest.fn();
      (jobManagerClient as unknown as { get: unknown }).get = get.mockResolvedValue(getJobStatusByIdResponse);
      const response = await jobManagerClient.getJobByJobId(inProgressJobsResponse[0].id);
      expect(get).toHaveBeenCalledTimes(1);
      expect(response).toBeDefined();
    });

    it('should throw NotFound error on non-existed job', async () => {
      get = jest.fn();
      (jobManagerClient as unknown as { get: unknown }).get = get.mockRejectedValue(new NotFoundError('Job not found'));
      const action = async () => jobManagerClient.getJobByJobId(inProgressJobsResponse[0].id);
      await expect(action()).rejects.toThrow(NotFoundError);
      expect(get).toHaveBeenCalledTimes(1);
    });
  });

  describe('findExportJobs', () => {
    it('should return completed job for export request', async () => {
      get = jest.fn();
      (jobManagerClient as unknown as { get: unknown }).get = get
        .mockResolvedValueOnce(completedExportJobsResponse)
        .mockResolvedValueOnce(completedExportJobsResponse[0])
        .mockResolvedValueOnce(completedExportJobsResponse[1]);

      const response = await jobManagerClient.findExportJobs(OperationStatus.COMPLETED, dupParams);
      expect(get).toHaveBeenCalledTimes(3);
      expect(response).toEqual(completedExportJobsResponse);
    });

    it('should return undefined on roi not contained in a completed job', async () => {
      const notContainedDuplicationParams: JobExportDuplicationParams = { ...dupParams, roi: notContainedRoi };
      get = jest.fn();
      (jobManagerClient as unknown as { get: unknown }).get = get.mockResolvedValue([]);
      const response = await jobManagerClient.findExportJobs(OperationStatus.COMPLETED, notContainedDuplicationParams);
      expect(get).toHaveBeenCalledTimes(1);
      expect(response).toStrictEqual([]);
    });

    it('should return undefined when no completed jobs where found', async () => {
      get = jest.fn();
      (jobManagerClient as unknown as { get: unknown }).get = get.mockResolvedValue(undefined);
      const response = await jobManagerClient.findExportJobs(OperationStatus.COMPLETED, dupParams);
      expect(get).toHaveBeenCalledTimes(1);
      expect(response).toBeUndefined();
    });
  });

  describe('updateJobExpirationDate', () => {
    it('should update expirationDate', async () => {
      get = jest.fn();
      put = jest.fn();
      (jobManagerClient as unknown as { put: unknown }).put = put.mockResolvedValue(undefined);
      (jobManagerClient as unknown as { get: unknown }).get = get.mockResolvedValue(completedExportJobsResponse[1]);

      const action = async () => {
        await jobManagerClient.updateJobExpirationDate(completedExportJobsResponse[1].id);
      };
      await expect(action()).resolves.not.toThrow();
      expect(get).toHaveBeenCalledTimes(1);
      expect(put).toHaveBeenCalledTimes(1);
    });

    it('should not update expirationDate', async () => {
      get = jest.fn();
      put = jest.fn();
      (jobManagerClient as unknown as { put: unknown }).put = put.mockResolvedValue(undefined);
      (jobManagerClient as unknown as { get: unknown }).get = get.mockResolvedValue(completedExportJobsResponse[0]);
      const action = async () => {
        await jobManagerClient.updateJobExpirationDate(completedExportJobsResponse[0].id);
      };
      await expect(action()).resolves.not.toThrow();
      expect(get).toHaveBeenCalledTimes(1);
      expect(put).toHaveBeenCalledTimes(0);
    });

    describe('createExportJob', () => {
      it('should post a new init export request', async () => {
        createJob = jest.fn();
        jest.useFakeTimers().setSystemTime(new Date('2025-02-26T00:00:00Z'));

        (jobManagerClient as unknown as { createJob: unknown }).createJob = createJob.mockResolvedValue(createJobResponse);

        const result = await jobManagerClient.createExportJob(createExportData);
        expect(result).toEqual({ jobId: createJobResponse.id, status: OperationStatus.PENDING });
        expect(createJob).toHaveBeenCalledWith(generateCreateJobRequest(createExportData));
      });
    });

    describe('findByCriteria', () => {
      it('should post a new init export request', async () => {
        post = jest.fn();
        (jobManagerClient as unknown as { post: unknown }).post = post.mockResolvedValue(inProgressJobsResponse);
        const response = await jobManagerClient.findAllProcessingExportJobs();
        expect(post).toHaveBeenCalledTimes(1);
        expect(response).toEqual(inProgressJobsResponse);
      });
    });
  });
});
