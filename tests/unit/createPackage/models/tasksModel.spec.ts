import { sep } from 'path';
import jsLogger from '@map-colonies/js-logger';
import { IUpdateJobBody, OperationStatus } from '@map-colonies/mc-priority-queue';
import { NotFoundError } from '@map-colonies/error-types';
import { ITaskStatusResponse, TasksManager } from '../../../../src/tasks/models/tasksManager';
import {
  ICallbackDataBase,
  ICallbackDataExportBase,
  IJobExportParameters,
  ITaskParameters,
  JobExportResponse,
  JobResponse,
  TaskResponse,
} from '../../../../src/common/interfaces';
import { configMock, registerDefaultConfig } from '../../../mocks/config';
import { callbackClientMock, sendMock } from '../../../mocks/clients/callbackClient';
import { createExportJsonMetadataMock, createJsonMetadataMock, packageManagerMock } from '../../../mocks/clients/packageManager';
import {
  jobManagerWrapperMock,
  getInProgressJobsMock as getInProgressJobsMock,
  updateJobMock,
  getExportJobsMock,
} from '../../../mocks/clients/jobManagerWrapper';
import { mockCompletedJob, mockJob } from '../../../mocks/data/mockJob';
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
  describe('GetMap', () => {
    /**
     * @deprecated GetMap API - will be deprecated on future
     */
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

    /**
     * @deprecated GetMap API - will be deprecated on future
     */
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

      it('should successfully finalize a job with status completed', async () => {
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

      it('should successfully finalize a job with status failed due to error while create json metadata file', async () => {
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

      it('should successfully finalize a job with job status failed without create json metadata file due to failed in task', async () => {
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
  describe('ROI', () => {
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
        const jobs: JobExportResponse[] = [];
        const completedMockJob = { ...mockCompletedJob, completedTasks: 1 };
        jobs.push(completedMockJob);
        getExportJobsMock.mockResolvedValue(jobs);

        const jobsStatus = await tasksManager.getExportJobsByTaskStatus();

        expect(jobsStatus.completedJobs?.length).toBe(1);
        expect(jobsStatus.failedJobs?.length).toBe(0);
        expect(getExportJobsMock).toHaveBeenCalledTimes(1);
      });

      it('should return failed job with no completed jobs', async () => {
        const jobs: JobExportResponse[] = [];
        const failedMockJob = { ...mockCompletedJob, failedTasks: 1 };
        jobs.push(failedMockJob);
        getExportJobsMock.mockResolvedValue(jobs);

        const jobsStatus = await tasksManager.getExportJobsByTaskStatus();

        expect(jobsStatus.completedJobs?.length).toBe(0);
        expect(jobsStatus.failedJobs?.length).toBe(1);
        expect(getExportJobsMock).toHaveBeenCalledTimes(1);
      });

      it('should return completed job and failed job', async () => {
        const jobs: JobExportResponse[] = [];
        const completedMockJob = { ...mockCompletedJob, completedTasks: 1 };
        const failedMockJob = { ...mockCompletedJob, failedTasks: 1 };
        jobs.push(completedMockJob, failedMockJob);
        getExportJobsMock.mockResolvedValue(jobs);

        const jobsStatus = await tasksManager.getExportJobsByTaskStatus();

        expect(jobsStatus.completedJobs?.length).toBe(1);
        expect(jobsStatus.failedJobs?.length).toBe(1);
        expect(getExportJobsMock).toHaveBeenCalledTimes(1);
      });

      it('should return an empty jobs response if task is in progress', async () => {
        const jobs: JobExportResponse[] = [];

        const inProgressMockJob = { ...mockCompletedJob, inProgressTasks: 1 };
        jobs.push(inProgressMockJob);
        getExportJobsMock.mockResolvedValue(jobs);

        const jobsStatus = await tasksManager.getExportJobsByTaskStatus();

        expect(jobsStatus.completedJobs?.length).toBe(0);
        expect(jobsStatus.failedJobs?.length).toBe(0);
        expect(getExportJobsMock).toHaveBeenCalledTimes(1);
      });

      it('should return an empty jobs response if task is in pending', async () => {
        const jobs: JobExportResponse[] = [];
        const pendingMockJob = { ...mockCompletedJob, pendingTasks: 1 };
        jobs.push(pendingMockJob);
        getExportJobsMock.mockResolvedValue(jobs);

        const jobsStatus = await tasksManager.getExportJobsByTaskStatus();

        expect(jobsStatus.completedJobs?.length).toBe(0);
        expect(jobsStatus.failedJobs?.length).toBe(0);
        expect(getExportJobsMock).toHaveBeenCalledTimes(1);
      });

      it('should return an empty jobs response if task is in expired', async () => {
        const jobs: JobExportResponse[] = [];
        const expiredMockJob = { ...mockCompletedJob, expiredTasks: 1 };
        jobs.push(expiredMockJob);
        getExportJobsMock.mockResolvedValue(jobs);

        const jobsStatus = await tasksManager.getExportJobsByTaskStatus();

        expect(jobsStatus.completedJobs?.length).toBe(0);
        expect(jobsStatus.failedJobs?.length).toBe(0);
        expect(getExportJobsMock).toHaveBeenCalledTimes(1);
      });

      it('should return an empty jobs response if task is in aborted', async () => {
        const jobs: JobExportResponse[] = [];
        const abortedMockJob = { ...mockCompletedJob, abortedTasks: 1 };
        jobs.push(abortedMockJob);
        getExportJobsMock.mockResolvedValue(jobs);

        const jobsStatus = await tasksManager.getExportJobsByTaskStatus();

        expect(jobsStatus.completedJobs?.length).toBe(0);
        expect(jobsStatus.failedJobs?.length).toBe(0);
        expect(getExportJobsMock).toHaveBeenCalledTimes(1);
      });
    });

    describe('#sendCallbacks', () => {
      it('should send callback data with the expected params for success jobs to all clients', async () => {
        sendMock.mockResolvedValue(200);
        const expirationTime = new Date();
        const callbackData: ICallbackDataExportBase = {
          links: {
            dataURI: 'http://download-service/downloads/test${sep}test.gpkg',
            metadataURI: 'http://download-service/downloads/test${sep}test.json',
          },
          recordCatalogId: '880a9316-0f10-4874-92e2-a62d587a1169',
          requestJobId: 'b729f0e0-af64-4c2c-ba4e-e799e2f3df0f',
          expirationTime: expirationTime,
          fileSize: 2000,
          errorReason: undefined,
        };

        const actualCallBackUrls = mockCompletedJob.parameters.callbacks.map((callback) => callback.url);

        await tasksManager.sendExportCallbacks(mockCompletedJob, callbackData);
        expect(sendMock).toHaveBeenCalledTimes(2);
        expect(sendMock.mock.calls).toHaveLength(mockCompletedJob.parameters.callbacks.length);
        const receviedCallbacks = sendMock.mock.calls;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
        const urlsArr = receviedCallbacks.map((call) => call[0]);
        expect(urlsArr).toEqual(actualCallBackUrls);
      });

      it('should return callback data even if callback response got rejected', async () => {
        sendMock.mockRejectedValue({});
        const expirationTime = new Date();
        const callbackData: ICallbackDataExportBase = {
          links: {
            dataURI: 'http://download-service/downloads/test${sep}test.gpkg',
            metadataURI: 'http://download-service/downloads/test${sep}test.json',
          },
          recordCatalogId: '880a9316-0f10-4874-92e2-a62d587a1169',
          requestJobId: 'b729f0e0-af64-4c2c-ba4e-e799e2f3df0f',
          expirationTime: expirationTime,
          fileSize: 2000,
          errorReason: undefined,
        };
        const action = async () => tasksManager.sendExportCallbacks(mockCompletedJob, callbackData);
        await expect(action()).resolves.not.toThrow();
        expect(sendMock).toHaveBeenCalledTimes(2);
      });
    });

    describe('#FinalizingExportJob', () => {
      let sendCallbacksSpy: jest.SpyInstance;

      it('should successfully finalize a job with status completed', async () => {
        const downloadUrl = configMock.get<string>('downloadServerUrl');
        const getFileSizeSpy = jest.spyOn(utils, 'getFileSize');
        getFileSizeSpy.mockResolvedValue(2000);
        const expirationTime = new Date();
        createExportJsonMetadataMock.mockResolvedValue({});
        updateJobMock.mockResolvedValue({});
        sendCallbacksSpy = jest.spyOn(tasksManager, 'sendExportCallbacks');

        const expectedCallbackParamData: ICallbackDataExportBase = {
          expirationTime,
          fileSize: 2000,
          links: {
            dataURI: `${downloadUrl}/downloads/${mockCompletedJob.parameters.relativeDirectoryPath}/${mockCompletedJob.parameters.fileNamesTemplates.dataURI}`,
            metadataURI: `${downloadUrl}/downloads/${mockCompletedJob.parameters.relativeDirectoryPath}/${mockCompletedJob.parameters.fileNamesTemplates.metadataURI}`,
          },
          recordCatalogId: mockCompletedJob.internalId as string,
          requestJobId: mockCompletedJob.id,
          errorReason: undefined,
        };

        const expectedUpdateRequest = {
          reason: undefined,
          percentage: 100,
          status: OperationStatus.COMPLETED,
          parameters: {
            ...mockCompletedJob.parameters,
            callbackParams: { ...expectedCallbackParamData, roi: mockCompletedJob.parameters.roi, status: OperationStatus.COMPLETED },
            cleanupData: { directoryPath: mockCompletedJob.parameters.relativeDirectoryPath, cleanupExpirationTime: expirationTime },
          },
        };
        const action = async () => tasksManager.finalizeExportJob(mockCompletedJob, expirationTime);
        await expect(action()).resolves.not.toThrow();
        expect(createExportJsonMetadataMock).toHaveBeenCalledTimes(1);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const createdCallbackParam: ICallbackDataExportBase = sendCallbacksSpy.mock.calls[0][1] as ICallbackDataExportBase;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const updateRequest = updateJobMock.mock.calls[0][1] as IUpdateJobBody<IJobExportParameters>;
        expect(sendCallbacksSpy).toHaveBeenCalledTimes(1);
        expect(updateJobMock).toHaveBeenCalledTimes(1);
        expect(createdCallbackParam).toStrictEqual(expectedCallbackParamData);
        expect(updateRequest).toStrictEqual(expectedUpdateRequest);
      });

      it('should successfully finalize a job with status completed even if gpkg file size was failed', async () => {
        const downloadUrl = configMock.get<string>('downloadServerUrl');
        const getFileSizeSpy = jest.spyOn(utils, 'getFileSize');
        getFileSizeSpy.mockRejectedValue({ message: 'failed getting file size' });
        const expirationTime = new Date();
        createExportJsonMetadataMock.mockResolvedValue({});
        updateJobMock.mockResolvedValue({});
        sendCallbacksSpy = jest.spyOn(tasksManager, 'sendExportCallbacks');

        const expectedCallbackParamData: ICallbackDataExportBase = {
          expirationTime,
          fileSize: 0,
          links: {
            dataURI: `${downloadUrl}/downloads/${mockCompletedJob.parameters.relativeDirectoryPath}/${mockCompletedJob.parameters.fileNamesTemplates.dataURI}`,
            metadataURI: `${downloadUrl}/downloads/${mockCompletedJob.parameters.relativeDirectoryPath}/${mockCompletedJob.parameters.fileNamesTemplates.metadataURI}`,
          },
          recordCatalogId: mockCompletedJob.internalId as string,
          requestJobId: mockCompletedJob.id,
          errorReason: undefined,
        };

        const expectedUpdateRequest = {
          reason: undefined,
          percentage: 100,
          status: OperationStatus.COMPLETED,
          parameters: {
            ...mockCompletedJob.parameters,
            callbackParams: { ...expectedCallbackParamData, roi: mockCompletedJob.parameters.roi, status: OperationStatus.COMPLETED },
            cleanupData: { directoryPath: mockCompletedJob.parameters.relativeDirectoryPath, cleanupExpirationTime: expirationTime },
          },
        };
        const action = async () => tasksManager.finalizeExportJob(mockCompletedJob, expirationTime);
        await expect(action()).resolves.not.toThrow();
        expect(createExportJsonMetadataMock).toHaveBeenCalledTimes(1);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const createdCallbackParam: ICallbackDataExportBase = sendCallbacksSpy.mock.calls[0][1] as ICallbackDataExportBase;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const updateRequest = updateJobMock.mock.calls[0][1] as IUpdateJobBody<IJobExportParameters>;
        expect(sendCallbacksSpy).toHaveBeenCalledTimes(1);
        expect(updateJobMock).toHaveBeenCalledTimes(1);
        expect(createdCallbackParam).toStrictEqual(expectedCallbackParamData);
        expect(updateRequest).toStrictEqual(expectedUpdateRequest);
      });

      it('should successfully finalize a job with status failed due to error while create json metadata file', async () => {
        const expirationTime = new Date();
        const getFileSizeSpy = jest.spyOn(utils, 'getFileSize');
        getFileSizeSpy.mockResolvedValue(0);
        createExportJsonMetadataMock.mockRejectedValue({ message: 'failed generate metadata.json' });
        updateJobMock.mockResolvedValue({});
        sendCallbacksSpy = jest.spyOn(tasksManager, 'sendExportCallbacks');

        const expectedUpdateRequest = {
          reason: JSON.stringify({ message: 'failed generate metadata.json' }),
          percentage: 100,
          status: OperationStatus.FAILED,
          parameters: {
            ...mockCompletedJob.parameters,
            cleanupData: { directoryPath: mockCompletedJob.parameters.relativeDirectoryPath, cleanupExpirationTime: expirationTime },
          },
        };
        const action = async () => tasksManager.finalizeExportJob(mockCompletedJob, expirationTime);
        await expect(action()).resolves.not.toThrow();
        expect(createExportJsonMetadataMock).toHaveBeenCalledTimes(1);
        expect(sendCallbacksSpy).toHaveBeenCalledTimes(0);
        expect(getFileSizeSpy).toHaveBeenCalledTimes(0);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const updateRequest = updateJobMock.mock.calls[0][1] as IUpdateJobBody<IJobExportParameters>;
        expect(updateRequest).toStrictEqual(expectedUpdateRequest);
        expect(updateJobMock).toHaveBeenCalledTimes(1);
      });

      it('should successfully finalize a job with status failed with failure of process callbackParam failure', async () => {
        const getFileSizeSpy = jest.spyOn(utils, 'getFileSize');
        getFileSizeSpy.mockRejectedValue({ message: 'failed getting file size' });
        const expirationTime = new Date();
        createExportJsonMetadataMock.mockResolvedValue({});
        updateJobMock.mockResolvedValue({});
        sendCallbacksSpy = jest.spyOn(tasksManager, 'sendExportCallbacks');

        const expectedCallbackParamData: ICallbackDataExportBase = {
          expirationTime,
          fileSize: 0,
          links: mockCompletedJob.parameters.fileNamesTemplates,
          recordCatalogId: mockCompletedJob.internalId as string,
          requestJobId: mockCompletedJob.id,
          errorReason: 'testError',
        };

        const expectedUpdateRequest = {
          reason: 'testError',
          percentage: undefined,
          status: OperationStatus.FAILED,
          parameters: {
            ...mockCompletedJob.parameters,
            callbackParams: { ...expectedCallbackParamData, roi: mockCompletedJob.parameters.roi, status: OperationStatus.FAILED },
            cleanupData: { directoryPath: mockCompletedJob.parameters.relativeDirectoryPath, cleanupExpirationTime: expirationTime },
          },
        };
        const action = async () => tasksManager.finalizeExportJob(mockCompletedJob, expirationTime, false, 'testError');
        await expect(action()).resolves.not.toThrow();
        expect(createExportJsonMetadataMock).toHaveBeenCalledTimes(0);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const createdCallbackParam: ICallbackDataExportBase = sendCallbacksSpy.mock.calls[0][1] as ICallbackDataExportBase;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const updateRequest = updateJobMock.mock.calls[0][1] as IUpdateJobBody<IJobExportParameters>;
        expect(sendCallbacksSpy).toHaveBeenCalledTimes(1);
        expect(updateJobMock).toHaveBeenCalledTimes(1);
        expect(createdCallbackParam).toStrictEqual(expectedCallbackParamData);
        expect(updateRequest).toStrictEqual(expectedUpdateRequest);
      });
    });
  });
});
