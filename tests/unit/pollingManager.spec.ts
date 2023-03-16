/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/naming-convention */
import jsLogger from '@map-colonies/js-logger';
import { ITaskResponse, OperationStatus } from '@map-colonies/mc-priority-queue';
import { PollingManager } from '../../src/pollingManager';
import { ackMock, dequeueMock, queueClientMock, rejectMock } from '../mocks/clients/queueClient';
import {
  taskManagerMock,
  createFinalizeTaskMock,
  finalizeExportJobMock,
  finalizeJobMock,
  getExportJobsByTaskStatusMock,
  getFinalizeJobByIdMock,
  getJobsByTaskStatusMock,
  deleteTaskByIdMock,
} from '../mocks/clients/taskManager';
import { IExportJobStatusResponse, IJobStatusResponse, ITaskFinalizeParameters } from '../../src/common/interfaces';
import { completedExportJob, inProgressJob, inProgressExportJob } from '../mocks/data';
import { registerDefaultConfig } from '../mocks/config';

let pollingManager: PollingManager;

describe('PollingManager', () => {
  beforeEach(() => {
    const logger = jsLogger({ enabled: false });
    registerDefaultConfig();
    pollingManager = new PollingManager(logger, taskManagerMock, queueClientMock);
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

      await pollingManager.jobStatusPoll();

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

      await pollingManager.jobStatusPoll();

      expect(getJobsByTaskStatusMock).toHaveBeenCalledTimes(1);
      expect(getExportJobsByTaskStatusMock).toHaveBeenCalledTimes(1);
      expect(finalizeJobMock).toHaveBeenCalledTimes(2);
      expect(createFinalizeTaskMock).toHaveBeenCalledTimes(3);
    });
  });
  describe('#jobFinalizePoll', () => {
    it('should poll finalize task and execute finalizing to job with success', async () => {
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

      dequeueMock.mockReturnValue(dequeuedFinalizeTask);
      getFinalizeJobByIdMock.mockReturnValue(completedExportJob);
      finalizeExportJobMock.mockReturnValue(undefined);
      await pollingManager.jobFinalizePoll();

      expect(dequeueMock).toHaveBeenCalledTimes(1);
      expect(getFinalizeJobByIdMock).toHaveBeenCalledTimes(1);
      expect(finalizeExportJobMock).toHaveBeenCalledTimes(1);
      expect(ackMock).toHaveBeenCalledTimes(1);
      expect(rejectMock).toHaveBeenCalledTimes(0);
      expect(deleteTaskByIdMock).toHaveBeenCalledTimes(0);
    });

    it('should poll finalize task and execute finalizing to job with attempts failure', async () => {
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

      dequeueMock.mockResolvedValue(dequeuedFinalizeTask);
      getFinalizeJobByIdMock.mockResolvedValue(completedExportJob);
      finalizeExportJobMock.mockResolvedValue(undefined);
      await pollingManager.jobFinalizePoll();

      expect(dequeueMock).toHaveBeenCalledTimes(1);
      expect(getFinalizeJobByIdMock).toHaveBeenCalledTimes(1);
      expect(finalizeExportJobMock).toHaveBeenCalledTimes(0);
      expect(rejectMock).toHaveBeenCalledTimes(1);
      expect(deleteTaskByIdMock).toHaveBeenCalledTimes(0);
    });

    it('should poll finalize task and execute finalizing to failed on job getting failure (Async function)', async () => {
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
      finalizeExportJobMock.mockResolvedValue(undefined);
      await pollingManager.jobFinalizePoll();

      expect(dequeueMock).toHaveBeenCalledTimes(1);
      expect(getFinalizeJobByIdMock).toHaveBeenCalledTimes(1);
      expect(finalizeExportJobMock).toHaveBeenCalledTimes(0);
      expect(rejectMock).toHaveBeenCalledTimes(1);
      expect(deleteTaskByIdMock).toHaveBeenCalledTimes(0);
    });

    it('should poll finalize task and execute finalizing to job with failure status (exporter failed)', async () => {
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

      dequeueMock.mockReturnValue(dequeuedFinalizeTask);
      getFinalizeJobByIdMock.mockReturnValue(completedExportJob);
      finalizeExportJobMock.mockReturnValue(undefined);
      deleteTaskByIdMock.mockResolvedValue(undefined);
      await pollingManager.jobFinalizePoll();

      expect(dequeueMock).toHaveBeenCalledTimes(1);
      expect(getFinalizeJobByIdMock).toHaveBeenCalledTimes(1);
      expect(finalizeExportJobMock).toHaveBeenCalledTimes(1);
      expect(ackMock).toHaveBeenCalledTimes(0);
      expect(rejectMock).toHaveBeenCalledTimes(1);
      expect(deleteTaskByIdMock).toHaveBeenCalledTimes(1);
    });
  });
});
