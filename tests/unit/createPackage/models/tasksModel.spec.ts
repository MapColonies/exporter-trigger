import jsLogger from '@map-colonies/js-logger';
import { OperationStatus } from '@map-colonies/mc-priority-queue';
import { NotFoundError } from '@map-colonies/error-types';
import { ITaskStatusResponse, TasksManager } from '../../../../src/tasks/models/tasksManager';
import {
  CreateFinalizeTaskBody,
  ICallbackExportData,
  ICallbackExportResponse,
  ICallbackTargetExport,
  ITaskParameters,
  JobExportResponse,
  JobFinalizeResponse,
  TaskResponse,
} from '../../../../src/common/interfaces';
import { configMock, registerDefaultConfig } from '../../../mocks/config';
import { callbackClientMock, sendMock } from '../../../mocks/clients/callbackClient';
import { createExportJsonMetadataMock, packageManagerMock } from '../../../mocks/clients/packageManager';
import { jobManagerWrapperMock, getExportJobsMock } from '../../../mocks/clients/jobManagerWrapper';
import { mockCompletedJob } from '../../../mocks/data/mockJob';
import * as utils from '../../../../src/common/utils';
import { ArtifactType } from '../../../../src/common/enums';
import { tracerMock } from '../../../mocks/clients/tracer';

let tasksManager: TasksManager;
let getTasksByJobIdStub: jest.Mock;

describe('TasksManager', () => {
  beforeEach(() => {
    const logger = jsLogger({ enabled: false });
    registerDefaultConfig();
    tasksManager = new TasksManager(logger, jobManagerWrapperMock, callbackClientMock, packageManagerMock, tracerMock);
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
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
        const jobs: JobFinalizeResponse[] = [];
        const completedMockJob = { ...mockCompletedJob, completedTasks: 1 };
        jobs.push(completedMockJob);
        getExportJobsMock.mockResolvedValue(jobs);

        const jobsStatus = await tasksManager.getExportJobsByTaskStatus();

        expect(jobsStatus.completedJobs?.length).toBe(1);
        expect(jobsStatus.failedJobs?.length).toBe(0);
        expect(getExportJobsMock).toHaveBeenCalledTimes(1);
      });

      it('should return failed job with no completed jobs', async () => {
        const jobs: JobFinalizeResponse[] = [];
        const failedMockJob = { ...mockCompletedJob, failedTasks: 1 };
        jobs.push(failedMockJob);
        getExportJobsMock.mockResolvedValue(jobs);

        const jobsStatus = await tasksManager.getExportJobsByTaskStatus();

        expect(jobsStatus.completedJobs?.length).toBe(0);
        expect(jobsStatus.failedJobs?.length).toBe(1);
        expect(getExportJobsMock).toHaveBeenCalledTimes(1);
      });

      it('should return completed job and failed job', async () => {
        const jobs: JobFinalizeResponse[] = [];
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
        const jobs: JobFinalizeResponse[] = [];

        const inProgressMockJob = { ...mockCompletedJob, inProgressTasks: 1 };
        jobs.push(inProgressMockJob);
        getExportJobsMock.mockResolvedValue(jobs);

        const jobsStatus = await tasksManager.getExportJobsByTaskStatus();

        expect(jobsStatus.completedJobs?.length).toBe(0);
        expect(jobsStatus.failedJobs?.length).toBe(0);
        expect(getExportJobsMock).toHaveBeenCalledTimes(1);
      });

      it('should return an empty jobs response if task is in pending', async () => {
        const jobs: JobFinalizeResponse[] = [];
        const pendingMockJob = { ...mockCompletedJob, pendingTasks: 1 };
        jobs.push(pendingMockJob);
        getExportJobsMock.mockResolvedValue(jobs);

        const jobsStatus = await tasksManager.getExportJobsByTaskStatus();

        expect(jobsStatus.completedJobs?.length).toBe(0);
        expect(jobsStatus.failedJobs?.length).toBe(0);
        expect(getExportJobsMock).toHaveBeenCalledTimes(1);
      });

      it('should return an empty jobs response if task is in expired', async () => {
        const jobs: JobFinalizeResponse[] = [];
        const expiredMockJob = { ...mockCompletedJob, expiredTasks: 1 };
        jobs.push(expiredMockJob);
        getExportJobsMock.mockResolvedValue(jobs);

        const jobsStatus = await tasksManager.getExportJobsByTaskStatus();

        expect(jobsStatus.completedJobs?.length).toBe(0);
        expect(jobsStatus.failedJobs?.length).toBe(0);
        expect(getExportJobsMock).toHaveBeenCalledTimes(1);
      });

      it('should return an empty jobs response if task is in aborted', async () => {
        const jobs: JobFinalizeResponse[] = [];
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
        const callbackData: ICallbackExportData = {
          links: {
            dataURI: 'http://download-service/downloads/test${sep}test.gpkg',
            metadataURI: 'http://download-service/downloads/test${sep}test.json',
          },
          recordCatalogId: '880a9316-0f10-4874-92e2-a62d587a1169',
          jobId: 'b729f0e0-af64-4c2c-ba4e-e799e2f3df0f',
          expirationTime: expirationTime,
          fileSize: 2000,
          errorReason: undefined,
          roi: {
            type: 'FeatureCollection',
            features: [],
          },
        };

        const expectedCallbacksData = mockCompletedJob.parameters.callbacks as unknown as ICallbackTargetExport[];
        const actualCallBackUrls = expectedCallbacksData.map((callback) => callback.url);

        await tasksManager.sendExportCallbacks(mockCompletedJob, callbackData);
        expect(sendMock).toHaveBeenCalledTimes(2);
        expect(sendMock.mock.calls).toHaveLength(expectedCallbacksData.length);
        const receviedCallbacks = sendMock.mock.calls;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
        const urlsArr = receviedCallbacks.map((call) => call[0]);
        expect(urlsArr).toEqual(actualCallBackUrls);
      });

      it('should return callback data even if callback response got rejected', async () => {
        sendMock.mockRejectedValue({});
        const expirationTime = new Date();
        const callbackData: ICallbackExportData = {
          links: {
            dataURI: 'http://download-service/downloads/test${sep}test.gpkg',
            metadataURI: 'http://download-service/downloads/test${sep}test.json',
          },
          recordCatalogId: '880a9316-0f10-4874-92e2-a62d587a1169',
          jobId: 'b729f0e0-af64-4c2c-ba4e-e799e2f3df0f',
          expirationTime: expirationTime,
          fileSize: 2000,
          errorReason: undefined,
          roi: {
            type: 'FeatureCollection',
            features: [],
          },
        };
        const action = async () => tasksManager.sendExportCallbacks(mockCompletedJob, callbackData);
        await expect(action()).resolves.not.toThrow();
        expect(sendMock).toHaveBeenCalledTimes(2);
      });
    });

    describe('#getFinalizeJobById', () => {
      it('should get job that included finalize task', async () => {
        const getJob = jest.fn();
        (jobManagerWrapperMock as unknown as { getJob: unknown }).getJob = getJob.mockResolvedValue({ mockCompletedJob });
        await tasksManager.getFinalizeJobById(mockCompletedJob.id);
        expect(getJob).toHaveBeenCalledTimes(1);
        expect(getJob).toHaveBeenCalledWith(mockCompletedJob.id);
      });
    });

    describe('#createFinalizeTask', () => {
      it('should create new success finalize task', async () => {
        const finalizeTaskType = configMock.get<string>('externalClientsConfig.exportJobAndTaskTypes.taskFinalizeType');
        const expectedCreateTaskRequest: CreateFinalizeTaskBody = {
          type: finalizeTaskType,
          parameters: { exporterTaskStatus: OperationStatus.COMPLETED },
          status: OperationStatus.PENDING,
          blockDuplication: true,
        };

        const enqueueTask = jest.fn();
        (jobManagerWrapperMock as unknown as { enqueueTask: unknown }).enqueueTask = enqueueTask.mockResolvedValue(undefined);
        const mockJobFinalized = JSON.parse(JSON.stringify(mockCompletedJob)) as JobExportResponse;
        await tasksManager.createFinalizeTask(mockJobFinalized, finalizeTaskType);
        expect(enqueueTask).toHaveBeenCalledTimes(1);
        expect(enqueueTask).toHaveBeenCalledWith(mockCompletedJob.id, expectedCreateTaskRequest);
      });

      it('should create new not success finalize task', async () => {
        const finalizeTaskType = configMock.get<string>('externalClientsConfig.exportJobAndTaskTypes.taskFinalizeType');
        const expectedCreateTaskRequest: CreateFinalizeTaskBody = {
          type: finalizeTaskType,
          parameters: { reason: 'GPKG corrupted', exporterTaskStatus: OperationStatus.FAILED },
          status: OperationStatus.PENDING,
          blockDuplication: true,
        };

        const enqueueTask = jest.fn();
        (jobManagerWrapperMock as unknown as { enqueueTask: unknown }).enqueueTask = enqueueTask.mockResolvedValue(undefined);
        const mockJobFinalized = JSON.parse(JSON.stringify(mockCompletedJob)) as JobExportResponse;
        await tasksManager.createFinalizeTask(mockJobFinalized, finalizeTaskType, false, 'GPKG corrupted');
        expect(enqueueTask).toHaveBeenCalledTimes(1);
        expect(enqueueTask).toHaveBeenCalledWith(mockCompletedJob.id, expectedCreateTaskRequest);
      });
    });

    describe('#FinalizingSuccessExportJob', () => {
      it('should successfully generate finalize a job data with status completed - and invoke relative callbacks', async () => {
        const downloadUrl = configMock.get<string>('downloadServerUrl');
        const getFileSizeSpy = jest.spyOn(utils, 'getFileSize');
        getFileSizeSpy.mockResolvedValue(2000);
        const expirationTime = new Date();
        createExportJsonMetadataMock.mockResolvedValue(true);

        const expectedCallbackParamData: ICallbackExportResponse = {
          expirationTime,
          fileSize: 2000,
          links: {
            dataURI: `${downloadUrl}/downloads/${mockCompletedJob.parameters.relativeDirectoryPath}/${mockCompletedJob.parameters.fileNamesTemplates.dataURI}`,
            metadataURI: `${downloadUrl}/downloads/${mockCompletedJob.parameters.relativeDirectoryPath}/${mockCompletedJob.parameters.fileNamesTemplates.metadataURI}`,
          },
          recordCatalogId: mockCompletedJob.internalId as string,
          jobId: mockCompletedJob.id,
          errorReason: undefined,
          description: 'test job',
          roi: mockCompletedJob.parameters.roi,
          status: OperationStatus.COMPLETED,
          artifacts: [
            {
              name: 'Orthophoto_testArea_1_0_2023_02_28T15_09_50_924Z.gpkg',
              size: 2000,
              type: ArtifactType.GPKG,
              url: 'http://download-service/downloads/415c9316e58862194145c4b54cf9d87e/Orthophoto_testArea_1_0_2023_02_28T15_09_50_924Z.gpkg',
            },
            {
              name: 'Orthophoto_testArea_1_0_2023_02_28T15_09_50_924Z.json',
              size: 2000,
              type: ArtifactType.METADATA,
              url: 'http://download-service/downloads/415c9316e58862194145c4b54cf9d87e/Orthophoto_testArea_1_0_2023_02_28T15_09_50_924Z.json',
            },
          ],
        };

        const expectedUpdateRequest = {
          reason: undefined,
          percentage: 100,
          status: OperationStatus.COMPLETED,
          parameters: {
            ...mockCompletedJob.parameters,
            callbackParams: expectedCallbackParamData,
            cleanupData: { directoryPath: mockCompletedJob.parameters.relativeDirectoryPath, cleanupExpirationTimeUTC: expirationTime },
          },
        };
        const results = await tasksManager.finalizeGPKGSuccess(mockCompletedJob, expirationTime);
        expect(createExportJsonMetadataMock).toHaveBeenCalledTimes(1);
        expect(results).toStrictEqual(expectedUpdateRequest);
      });

      it('should generate finalize a job data with status failed - and invoke relative callbacks', async () => {
        const getFileSizeSpy = jest.spyOn(utils, 'getFileSize');
        getFileSizeSpy.mockResolvedValue(0);
        const expirationTime = new Date();
        createExportJsonMetadataMock.mockResolvedValue(false);

        const expectedCallbackParamData: ICallbackExportResponse = {
          expirationTime,
          fileSize: 0,
          links: {
            dataURI: `${mockCompletedJob.parameters.fileNamesTemplates.dataURI}`,
            metadataURI: `${mockCompletedJob.parameters.fileNamesTemplates.metadataURI}`,
          },
          recordCatalogId: mockCompletedJob.internalId as string,
          jobId: mockCompletedJob.id,
          errorReason: 'Failed on metadata.json creation',
          description: 'test job',
          roi: mockCompletedJob.parameters.roi,
          status: OperationStatus.FAILED,
          artifacts: [
            {
              name: 'Orthophoto_testArea_1_0_2023_02_28T15_09_50_924Z.gpkg',
              size: 0,
              type: ArtifactType.GPKG,
              url: undefined,
            },
            {
              name: 'Orthophoto_testArea_1_0_2023_02_28T15_09_50_924Z.json',
              size: 0,
              type: ArtifactType.METADATA,
              url: undefined,
            },
          ],
        };

        const expectedUpdateRequest = {
          reason: 'Failed on metadata.json creation',
          percentage: 0,
          status: OperationStatus.FAILED,
          parameters: {
            ...mockCompletedJob.parameters,
            callbackParams: { ...expectedCallbackParamData, roi: mockCompletedJob.parameters.roi, status: OperationStatus.FAILED },
            cleanupData: { directoryPath: mockCompletedJob.parameters.relativeDirectoryPath, cleanupExpirationTimeUTC: expirationTime },
          },
        };
        const results = await tasksManager.finalizeGPKGSuccess(mockCompletedJob, expirationTime);
        expect(createExportJsonMetadataMock).toHaveBeenCalledTimes(1);
        expect(results).toStrictEqual(expectedUpdateRequest);
      });
    });

    describe('#FinalizingFailureExportJob', () => {
      it('should generate finalize a job data for failed exported job with status failed - and invoke relative callbacks', async () => {
        const exportingErrorMsg = 'Failed on generating gpkg';
        const getFileSizeSpy = jest.spyOn(utils, 'getFileSize');
        getFileSizeSpy.mockResolvedValue(0);
        const expirationTime = new Date();

        const expectedCallbackParamData: ICallbackExportResponse = {
          expirationTime,
          fileSize: 0,
          links: {
            dataURI: `${mockCompletedJob.parameters.fileNamesTemplates.dataURI}`,
            metadataURI: `${mockCompletedJob.parameters.fileNamesTemplates.metadataURI}`,
          },
          recordCatalogId: mockCompletedJob.internalId as string,
          jobId: mockCompletedJob.id,
          errorReason: exportingErrorMsg,
          description: 'test job',
          roi: mockCompletedJob.parameters.roi,
          status: OperationStatus.FAILED,
          artifacts: [
            {
              name: 'Orthophoto_testArea_1_0_2023_02_28T15_09_50_924Z.gpkg',
              size: 0,
              type: ArtifactType.GPKG,
              url: undefined,
            },
            {
              name: 'Orthophoto_testArea_1_0_2023_02_28T15_09_50_924Z.json',
              size: 0,
              type: ArtifactType.METADATA,
              url: undefined,
            },
          ],
        };

        const expectedUpdateRequest = {
          reason: exportingErrorMsg,
          percentage: 0,
          status: OperationStatus.FAILED,
          parameters: {
            ...mockCompletedJob.parameters,
            callbackParams: expectedCallbackParamData,
            cleanupData: { directoryPath: mockCompletedJob.parameters.relativeDirectoryPath, cleanupExpirationTimeUTC: expirationTime },
          },
        };
        const results = await tasksManager.finalizeGPKGFailure(mockCompletedJob, expirationTime, exportingErrorMsg);
        expect(results).toStrictEqual(expectedUpdateRequest);
      });
    });
  });
});
