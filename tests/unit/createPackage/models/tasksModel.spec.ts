import { sep } from 'path';
import jsLogger from '@map-colonies/js-logger';
import { OperationStatus } from '@map-colonies/mc-priority-queue';
import { NotFoundError } from '@map-colonies/error-types';
import { ITaskStatusResponse, TasksManager } from '../../../../src/tasks/models/tasksManager';
import { ICallbackDataBase, ITaskParameters, JobResponse, TaskResponse } from '../../../../src/common/interfaces';
import { registerDefaultConfig } from '../../../mocks/config';
import { callbackClientMock, sendMock } from '../../../mocks/clients/callbackClient';
import { createJsonMetadataMock, packageManagerMock } from '../../../mocks/clients/packageManager';
import { jobManagerWrapperMock, getInProgressJobsMock as getInProgressJobsMock, updateJobMock } from '../../../mocks/clients/jobManagerWrapper';
import { mockJob } from '../../../mocks/data/mockJob';
import * as utils from '../../../../src/common/utils';

let tasksManager: TasksManager;
let getTasksByJobIdStub: jest.Mock;

describe('TasksManager', () => {
  beforeEach(() => {
    const logger = jsLogger({ enabled: false });
    registerDefaultConfig();
    tasksManager = new TasksManager(logger, jobManagerWrapperMock, callbackClientMock, packageManagerMock);
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  describe('#getTaskStatusByJobId', () => {
    it('should throw NotFoundError when jobId is not exists', async () => {
      const emptyTasksResponse: TaskResponse[] = [];

      getTasksByJobIdStub = jest.fn();
      jobManagerWrapperMock.getTasksByJobId = getTasksByJobIdStub.mockResolvedValue(emptyTasksResponse);

      const action = async () => tasksManager.getTaskStatusByJobId('09e29fa8-7283-4334-b3a4-99f75922de59');

      await expect(action).rejects.toThrow(NotFoundError);
      expect(getTasksByJobIdStub).toHaveBeenCalledTimes(1);
    });

    it('should successfully return task status by jobId', async () => {
      const tasksResponse: TaskResponse[] = [
        {
          id: '0a5552f7-01eb-40af-a912-eed8fa9e1561',
          jobId: '0a5552f7-01eb-40af-a912-eed8fa9e1568',
          type: 'rasterTilesExporterd',
          description: '',
          parameters: {} as unknown as ITaskParameters,
          status: OperationStatus.IN_PROGRESS,
          percentage: 23,
          reason: '',
          attempts: 0,
          resettable: true,
          created: '2022-08-02T13:02:18.475Z',
          updated: '2022-08-02T15:01:56.658Z',
        },
      ];

      getTasksByJobIdStub = jest.fn();
      jobManagerWrapperMock.getTasksByJobId = getTasksByJobIdStub.mockResolvedValue(tasksResponse);

      const result = tasksManager.getTaskStatusByJobId('0a5552f7-01eb-40af-a912-eed8fa9e1568');
      const expectedResult: ITaskStatusResponse = {
        percentage: tasksResponse[0].percentage,
        status: tasksResponse[0].status,
      };
      await expect(result).resolves.not.toThrow();
      await expect(result).resolves.toEqual(expectedResult);
      expect(getTasksByJobIdStub).toHaveBeenCalledTimes(1);
    });
  });
  describe('#getJobsByTaskStatus', () => {
    it('should return completed job with no failed jobs', async () => {
      const jobs: JobResponse[] = [];
      const completedMockJob = { ...mockJob, completedTasks: 1 };
      jobs.push(completedMockJob);
      getInProgressJobsMock.mockResolvedValue(jobs);

      const jobsStatus = await tasksManager.getJobsByTaskStatus();

      expect(jobsStatus.completedJobs?.length).toBe(1);
      expect(jobsStatus.failedJobs?.length).toBe(0);
      expect(getInProgressJobsMock).toHaveBeenCalledTimes(1);
    });

    it('should return failed job with no completed jobs', async () => {
      const jobs: JobResponse[] = [];
      const failedMockJob = { ...mockJob, failedTasks: 1 };
      jobs.push(failedMockJob);
      getInProgressJobsMock.mockResolvedValue(jobs);

      const jobsStatus = await tasksManager.getJobsByTaskStatus();

      expect(jobsStatus.completedJobs?.length).toBe(0);
      expect(jobsStatus.failedJobs?.length).toBe(1);
      expect(getInProgressJobsMock).toHaveBeenCalledTimes(1);
    });

    it('should return completed job and failed job', async () => {
      const jobs: JobResponse[] = [];
      const completedMockJob = { ...mockJob, completedTasks: 1 };
      const failedMockJob = { ...mockJob, failedTasks: 1 };
      jobs.push(completedMockJob, failedMockJob);
      getInProgressJobsMock.mockResolvedValue(jobs);

      const jobsStatus = await tasksManager.getJobsByTaskStatus();

      expect(jobsStatus.completedJobs?.length).toBe(1);
      expect(jobsStatus.failedJobs?.length).toBe(1);
      expect(getInProgressJobsMock).toHaveBeenCalledTimes(1);
    });

    it('should return an empty jobs response if task is in progress', async () => {
      const jobs: JobResponse[] = [];

      const inProgressMockJob = { ...mockJob, inProgressTasks: 1 };
      jobs.push(inProgressMockJob);
      getInProgressJobsMock.mockResolvedValue(jobs);

      const jobsStatus = await tasksManager.getJobsByTaskStatus();

      expect(jobsStatus.completedJobs?.length).toBe(0);
      expect(jobsStatus.failedJobs?.length).toBe(0);
      expect(getInProgressJobsMock).toHaveBeenCalledTimes(1);
    });

    it('should return an empty jobs response if task is in pending', async () => {
      const jobs: JobResponse[] = [];
      const pendingMockJob = { ...mockJob, pendingTasks: 1 };
      jobs.push(pendingMockJob);
      getInProgressJobsMock.mockResolvedValue(jobs);

      const jobsStatus = await tasksManager.getJobsByTaskStatus();

      expect(jobsStatus.completedJobs?.length).toBe(0);
      expect(jobsStatus.failedJobs?.length).toBe(0);
      expect(getInProgressJobsMock).toHaveBeenCalledTimes(1);
    });

    it('should return an empty jobs response if task is in expired', async () => {
      const jobs: JobResponse[] = [];
      const expiredMockJob = { ...mockJob, expiredTasks: 1 };
      jobs.push(expiredMockJob);
      getInProgressJobsMock.mockResolvedValue(jobs);

      const jobsStatus = await tasksManager.getJobsByTaskStatus();

      expect(jobsStatus.completedJobs?.length).toBe(0);
      expect(jobsStatus.failedJobs?.length).toBe(0);
      expect(getInProgressJobsMock).toHaveBeenCalledTimes(1);
    });

    it('should return an empty jobs response if task is in aborted', async () => {
      const jobs: JobResponse[] = [];
      const abortedMockJob = { ...mockJob, abortedTasks: 1 };
      jobs.push(abortedMockJob);
      getInProgressJobsMock.mockResolvedValue(jobs);

      const jobsStatus = await tasksManager.getJobsByTaskStatus();

      expect(jobsStatus.completedJobs?.length).toBe(0);
      expect(jobsStatus.failedJobs?.length).toBe(0);
      expect(getInProgressJobsMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('#sendCallbacks', () => {
    it('should return callback data with the expected params for success jobs', async () => {
      sendMock.mockResolvedValue(200);
      const getFileSizeSpy = jest.spyOn(utils, 'getFileSize');
      getFileSizeSpy.mockResolvedValue(2000);
      const expirationTime = new Date();
      const expectedCallbackData: ICallbackDataBase = {
        fileUri: `http://download-service/downloads/test${sep}test.gpkg`,
        expirationTime: expirationTime,
        fileSize: 2000,
        dbId: '880a9316-0f10-4874-92e2-a62d587a1169',
        packageName: 'test.gpkg',
        requestId: 'b729f0e0-af64-4c2c-ba4e-e799e2f3df0f',
        targetResolution: 0.072,
        success: true,
        errorReason: undefined,
      };

      const callbackData = await tasksManager.sendCallbacks(mockJob, expirationTime);
      expect(callbackData).toEqual(expectedCallbackData);
    });

    it('should return callback data with the expected params for failed jobs', async () => {
      sendMock.mockResolvedValue(200);
      const getFileSizeSpy = jest.spyOn(utils, 'getFileSize');
      getFileSizeSpy.mockResolvedValue(2000);
      const expirationTime = new Date();
      const errMessage = 'gpkg failed to create';
      const expectedCallbackData: ICallbackDataBase = {
        fileUri: '',
        expirationTime: expirationTime,
        fileSize: 0,
        dbId: '880a9316-0f10-4874-92e2-a62d587a1169',
        packageName: 'test.gpkg',
        requestId: 'b729f0e0-af64-4c2c-ba4e-e799e2f3df0f',
        targetResolution: 0.072,
        success: false,
        errorReason: errMessage,
      };
      const callbackData = await tasksManager.sendCallbacks(mockJob, expirationTime, errMessage);
      expect(callbackData).toEqual(expectedCallbackData);
    });

    it('should return callback data even if callback response got rejected', async () => {
      sendMock.mockRejectedValue({});
      const expirationTime = new Date();

      const action = async () => tasksManager.sendCallbacks(mockJob, expirationTime);
      await expect(action()).resolves.not.toThrow();
    });
  });

  describe('#finalizeJob', () => {
    let sendCallbacksSpy: jest.SpyInstance;

    it('should successfuly finalize a job with status completed', async () => {
      const expirationTime = new Date();
      createJsonMetadataMock.mockResolvedValue({});
      updateJobMock.mockResolvedValue({});
      sendCallbacksSpy = jest.spyOn(tasksManager, 'sendCallbacks');

      const action = async () => tasksManager.finalizeJob(mockJob, expirationTime);
      await expect(action()).resolves.not.toThrow();
      expect(createJsonMetadataMock).toHaveBeenCalledTimes(1);
      expect(sendCallbacksSpy).toHaveBeenCalledTimes(1);
      expect(updateJobMock).toHaveBeenCalledTimes(1);
    });

    it('should successfuly finalize a job with status failed due to error while create json metadata file', async () => {
      const expirationTime = new Date();
      createJsonMetadataMock.mockRejectedValue({});
      updateJobMock.mockResolvedValue({});
      sendCallbacksSpy = jest.spyOn(tasksManager, 'sendCallbacks');

      const action = async () => tasksManager.finalizeJob(mockJob, expirationTime);
      await expect(action()).resolves.not.toThrow();
      expect(createJsonMetadataMock).toHaveBeenCalledTimes(1);
      expect(sendCallbacksSpy).toHaveBeenCalledTimes(1);
      expect(updateJobMock).toHaveBeenCalledTimes(1);
    });

    it('should successfuly finalize a job with job status failed without create json metadata file due to failed in task', async () => {
      const expirationTime = new Date();
      updateJobMock.mockResolvedValue({});
      sendCallbacksSpy = jest.spyOn(tasksManager, 'sendCallbacks');

      const errMessage = 'gpkg failed to create';
      const action = async () => tasksManager.finalizeJob(mockJob, expirationTime, false, errMessage);
      await expect(action()).resolves.not.toThrow();
      expect(createJsonMetadataMock).toHaveBeenCalledTimes(0);
      expect(sendCallbacksSpy).toHaveBeenCalledTimes(1);
      expect(updateJobMock).toHaveBeenCalledTimes(1);
    });
  });
});
