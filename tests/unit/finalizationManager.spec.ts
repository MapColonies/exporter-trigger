/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/naming-convention */
import jsLogger from '@map-colonies/js-logger';
import { ITaskResponse, IUpdateJobBody, OperationStatus } from '@map-colonies/mc-priority-queue';
import { FinalizationManager } from '../../src/finalizationManager';
import { ackMock, dequeueMock, queueClientMock, rejectMock } from '../mocks/clients/queueClient';
import {
  taskManagerMock,
  createFinalizeTaskMock,
  finalizeGPKGSuccessMock,
  finalizeGPKGFailureMock,
  finalizeJobMock,
  getExportJobsByTaskStatusMock,
  getFinalizeJobByIdMock,
  getJobsByTaskStatusMock,
} from '../mocks/clients/taskManager';
import { IExportJobStatusResponse, IJobExportParameters, IJobStatusResponse, ITaskFinalizeParameters } from '../../src/common/interfaces';
import { completedExportJob, inProgressJob, inProgressExportJob } from '../mocks/data';
import { registerDefaultConfig } from '../mocks/config';
import { jobManagerWrapperMock, updateJobMock, deleteTaskByIdMock } from '../mocks/clients/jobManagerWrapper';

let finalizationManager: FinalizationManager;

describe('FinalizationManager', () => {
  beforeEach(() => {
    const logger = jsLogger({ enabled: false });
    registerDefaultConfig();
    finalizationManager = new FinalizationManager(logger, taskManagerMock, queueClientMock, jobManagerWrapperMock);
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  describe('#jobStatusPoll', () => {
    it('should poll completed jobs for getmap and roi jobs', async () => {
      const getmapJobStatus: IJobStatusResponse = {
        completedJobs: [JSON.parse(JSON.stringify(inProgressJob)), JSON.parse(JSON.stringify(inProgressJob))],
        failedJobs: [],
      };

      const roiJobStatus: IExportJobStatusResponse = {
        completedJobs: [
          JSON.parse(JSON.stringify(inProgressExportJob)),
          JSON.parse(JSON.stringify(inProgressExportJob)),
          JSON.parse(JSON.stringify(inProgressExportJob)),
        ],
        failedJobs: [],
      };
      getJobsByTaskStatusMock.mockReturnValue(getmapJobStatus);
      getExportJobsByTaskStatusMock.mockReturnValue(roiJobStatus);
      finalizeJobMock.mockReturnValue(undefined);
      createFinalizeTaskMock.mockReturnValue(undefined);

      await finalizationManager.jobStatusPoll();

      expect(getJobsByTaskStatusMock).toHaveBeenCalledTimes(1);
      expect(getExportJobsByTaskStatusMock).toHaveBeenCalledTimes(1);
      expect(finalizeJobMock).toHaveBeenCalledTimes(2);
      expect(createFinalizeTaskMock).toHaveBeenCalledTimes(3);
    });

    it('should poll failed jobs for getmap and roi jobs', async () => {
      const getmapJobStatus: IJobStatusResponse = {
        completedJobs: [],
        failedJobs: [JSON.parse(JSON.stringify(inProgressJob)), JSON.parse(JSON.stringify(inProgressJob))],
      };

      const roiJobStatus: IExportJobStatusResponse = {
        completedJobs: [],
        failedJobs: [
          JSON.parse(JSON.stringify(inProgressExportJob)),
          JSON.parse(JSON.stringify(inProgressExportJob)),
          JSON.parse(JSON.stringify(inProgressExportJob)),
        ],
      };
      getJobsByTaskStatusMock.mockReturnValue(getmapJobStatus);
      getExportJobsByTaskStatusMock.mockReturnValue(roiJobStatus);
      finalizeJobMock.mockReturnValue(undefined);
      createFinalizeTaskMock.mockReturnValue(undefined);

      await finalizationManager.jobStatusPoll();

      expect(getJobsByTaskStatusMock).toHaveBeenCalledTimes(1);
      expect(getExportJobsByTaskStatusMock).toHaveBeenCalledTimes(1);
      expect(finalizeJobMock).toHaveBeenCalledTimes(2);
      expect(createFinalizeTaskMock).toHaveBeenCalledTimes(3);
    });
  });
  describe('#jobFinalizePoll', () => {
    it('should poll finalize task and execute finalizing to job with success (success exporting)', async () => {
      const dequeuedFinalizeTask: ITaskResponse<ITaskFinalizeParameters> = {
        id: 'b729f0e0-af64-4c2c-ba4e-e799e2f3df0f',
        jobId: '880a9316-0f10-4874-92e2-a62d587a1169',
        description: 'string',
        parameters: { exporterTaskStatus: OperationStatus.COMPLETED },
        created: '2022-08-29T07:06:05.043Z',
        updated: '2022-08-29T07:06:05.043Z',
        type: 'string',
        status: OperationStatus.IN_PROGRESS,
        reason: 'string',
        attempts: 1,
        resettable: false,
      };

      const expirationDate = new Date();
      const expectedUpdateParams: IUpdateJobBody<IJobExportParameters> = {
        status: OperationStatus.COMPLETED,
        parameters: {
          ...completedExportJob.parameters,
          callbackParams: {
            roi: completedExportJob.parameters.roi,
            status: OperationStatus.COMPLETED,
            links: { metadataURI: 'test', dataURI: 'test' },
            expirationTime: expirationDate,
            recordCatalogId: completedExportJob.internalId as string,
            fileSize: 1000,
            jobId: completedExportJob.id,
            fileNames: { metadataName: 'test', dataName: 'test' },
          },
        },
      };

      dequeueMock.mockReturnValue(dequeuedFinalizeTask);
      getFinalizeJobByIdMock.mockReturnValue(completedExportJob);
      finalizeGPKGSuccessMock.mockReturnValue(expectedUpdateParams);

      await finalizationManager.jobFinalizePoll();

      expect(dequeueMock).toHaveBeenCalledTimes(1);
      expect(getFinalizeJobByIdMock).toHaveBeenCalledTimes(1);
      expect(finalizeGPKGSuccessMock).toHaveBeenCalledTimes(1);
      expect(finalizeGPKGFailureMock).toHaveBeenCalledTimes(0);
      expect(ackMock).toHaveBeenCalledTimes(1);
      expect(updateJobMock).toHaveBeenCalledTimes(1);
      expect(updateJobMock).toHaveBeenCalledWith(completedExportJob.id, expectedUpdateParams);
      expect(rejectMock).toHaveBeenCalledTimes(0);
      expect(deleteTaskByIdMock).toHaveBeenCalledTimes(0);
    });

    it('should poll finalize task and execute finalizing to job with attempts failure (failed exporting)', async () => {
      const dequeuedFinalizeTask: ITaskResponse<ITaskFinalizeParameters> = {
        id: 'b729f0e0-af64-4c2c-ba4e-e799e2f3df0f',
        jobId: '880a9316-0f10-4874-92e2-a62d587a1169',
        description: 'string',
        parameters: { exporterTaskStatus: OperationStatus.FAILED },
        created: '2022-08-29T07:06:05.043Z',
        updated: '2022-08-29T07:06:05.043Z',
        type: 'string',
        status: OperationStatus.IN_PROGRESS,
        reason: 'string',
        attempts: 1,
        resettable: false,
      };

      const expirationDate = new Date();
      const expectedUpdateParams: IUpdateJobBody<IJobExportParameters> = {
        status: OperationStatus.FAILED,
        percentage: 0,
        parameters: {
          ...completedExportJob.parameters,
          callbackParams: {
            roi: completedExportJob.parameters.roi,
            status: OperationStatus.FAILED,
            links: { metadataURI: 'testTemplate', dataURI: 'testTemplate' },
            expirationTime: expirationDate,
            recordCatalogId: completedExportJob.internalId as string,
            fileSize: 0,
            errorReason: 'Failed on GPKG creation',
            jobId: completedExportJob.id,
            fileNames: { metadataName: 'testTemplate', dataName: 'testTemplate' }
          },
        },
      };

      dequeueMock.mockResolvedValue(dequeuedFinalizeTask);
      getFinalizeJobByIdMock.mockResolvedValue(completedExportJob);
      finalizeGPKGFailureMock.mockResolvedValue(expectedUpdateParams);
      await finalizationManager.jobFinalizePoll();

      expect(dequeueMock).toHaveBeenCalledTimes(1);
      expect(getFinalizeJobByIdMock).toHaveBeenCalledTimes(1);
      expect(finalizeGPKGFailureMock).toHaveBeenCalledTimes(1);
      expect(finalizeGPKGSuccessMock).toHaveBeenCalledTimes(0);
      expect(ackMock).toHaveBeenCalledTimes(1);
      expect(rejectMock).toHaveBeenCalledTimes(0);
      expect(updateJobMock).toHaveBeenCalledTimes(1);
      expect(updateJobMock).toHaveBeenCalledWith(completedExportJob.id, expectedUpdateParams);
      expect(deleteTaskByIdMock).toHaveBeenCalledTimes(1);
    });

    it('should poll finalize task and execute finalizing task rejection (because not reached the job - Async function)', async () => {
      const dequeuedFinalizeTask: ITaskResponse<ITaskFinalizeParameters> = {
        id: 'b729f0e0-af64-4c2c-ba4e-e799e2f3df0f',
        jobId: '880a9316-0f10-4874-92e2-a62d587a1169',
        description: 'string',
        parameters: { exporterTaskStatus: OperationStatus.COMPLETED },
        created: '2022-08-29T07:06:05.043Z',
        updated: '2022-08-29T07:06:05.043Z',
        type: 'string',
        status: OperationStatus.IN_PROGRESS,
        reason: 'string',
        attempts: 10,
        resettable: false,
      };

      dequeueMock.mockReturnValue(dequeuedFinalizeTask);
      getFinalizeJobByIdMock.mockRejectedValue('internal server error');
      finalizeGPKGSuccessMock.mockResolvedValue(undefined);
      await finalizationManager.jobFinalizePoll();

      expect(dequeueMock).toHaveBeenCalledTimes(1);
      expect(getFinalizeJobByIdMock).toHaveBeenCalledTimes(1);
      expect(finalizeGPKGSuccessMock).toHaveBeenCalledTimes(0);
      expect(finalizeGPKGFailureMock).toHaveBeenCalledTimes(0);
      expect(rejectMock).toHaveBeenCalledTimes(1);
      expect(rejectMock).toHaveBeenCalledWith(dequeuedFinalizeTask.jobId, dequeuedFinalizeTask.id, true);
      expect(deleteTaskByIdMock).toHaveBeenCalledTimes(0);
    });

    it('should poll finalize task and reject because max-attempts', async () => {
      const dequeuedFinalizeTask: ITaskResponse<ITaskFinalizeParameters> = {
        id: 'b729f0e0-af64-4c2c-ba4e-e799e2f3df0f',
        jobId: '880a9316-0f10-4874-92e2-a62d587a1169',
        description: 'string',
        parameters: { exporterTaskStatus: OperationStatus.COMPLETED },
        created: '2022-08-29T07:06:05.043Z',
        updated: '2022-08-29T07:06:05.043Z',
        type: 'string',
        status: OperationStatus.IN_PROGRESS,
        reason: 'string',
        attempts: 10,
        resettable: false,
      };

      dequeueMock.mockReturnValue(dequeuedFinalizeTask);
      getFinalizeJobByIdMock.mockReturnValue(completedExportJob);
      finalizeGPKGSuccessMock.mockReturnValue(undefined);

      await finalizationManager.jobFinalizePoll();

      expect(dequeueMock).toHaveBeenCalledTimes(1);
      expect(getFinalizeJobByIdMock).toHaveBeenCalledTimes(1);
      expect(finalizeGPKGSuccessMock).toHaveBeenCalledTimes(0);
      expect(finalizeGPKGFailureMock).toHaveBeenCalledTimes(0);
      expect(ackMock).toHaveBeenCalledTimes(0);
      expect(rejectMock).toHaveBeenCalledTimes(1);
      expect(rejectMock).toHaveBeenCalledWith(dequeuedFinalizeTask.jobId, dequeuedFinalizeTask.id, false);
      expect(updateJobMock).toHaveBeenCalledTimes(1);
      expect(updateJobMock).toHaveBeenCalledWith(completedExportJob.id, { status: OperationStatus.FAILED, percentage: undefined });
    });

    it('should poll finalize task and execute finalizing to job with success but failure on metadata.json generation', async () => {
      const dequeuedFinalizeTask: ITaskResponse<ITaskFinalizeParameters> = {
        id: 'b729f0e0-af64-4c2c-ba4e-e799e2f3df0f',
        jobId: '880a9316-0f10-4874-92e2-a62d587a1169',
        description: 'string',
        parameters: { exporterTaskStatus: OperationStatus.COMPLETED },
        created: '2022-08-29T07:06:05.043Z',
        updated: '2022-08-29T07:06:05.043Z',
        type: 'string',
        status: OperationStatus.IN_PROGRESS,
        reason: 'string',
        attempts: 1,
        resettable: false,
      };

      const expirationDate = new Date();
      const expectedUpdateParams: IUpdateJobBody<IJobExportParameters> = {
        status: OperationStatus.FAILED,
        parameters: {
          ...completedExportJob.parameters,
          callbackParams: {
            roi: completedExportJob.parameters.roi,
            status: OperationStatus.FAILED,
            links: { metadataURI: 'test', dataURI: 'test' },
            expirationTime: expirationDate,
            recordCatalogId: completedExportJob.internalId as string,
            fileSize: 1000,
            jobId: completedExportJob.id,
            fileNames: { metadataName: 'test', dataName: 'test' }
          },
        },
      };

      dequeueMock.mockReturnValue(dequeuedFinalizeTask);
      getFinalizeJobByIdMock.mockReturnValue(completedExportJob);
      finalizeGPKGSuccessMock.mockReturnValue(expectedUpdateParams);

      await finalizationManager.jobFinalizePoll();

      expect(dequeueMock).toHaveBeenCalledTimes(1);
      expect(getFinalizeJobByIdMock).toHaveBeenCalledTimes(1);
      expect(finalizeGPKGSuccessMock).toHaveBeenCalledTimes(1);
      expect(finalizeGPKGFailureMock).toHaveBeenCalledTimes(0);
      expect(ackMock).toHaveBeenCalledTimes(0);
      expect(updateJobMock).toHaveBeenCalledTimes(0);
      expect(rejectMock).toHaveBeenCalledTimes(1);
      expect(rejectMock).toHaveBeenCalledWith(dequeuedFinalizeTask.jobId, dequeuedFinalizeTask.id, true);
      expect(deleteTaskByIdMock).toHaveBeenCalledTimes(0);
    });
  });
});
