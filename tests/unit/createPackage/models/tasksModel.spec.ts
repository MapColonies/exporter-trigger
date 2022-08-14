import jsLogger from '@map-colonies/js-logger';
import { OperationStatus } from '@map-colonies/mc-priority-queue';
import { NotFoundError } from '@map-colonies/error-types';
import { JobManagerWrapper } from '../../../../src/clients/jobManagerWrapper';
import { ITaskStatusResponse, TasksManager } from '../../../../src/createPackage/models/tasksManager';
import { ITaskParameters, TaskResponse } from '../../../../src/common/interfaces';

let jobManagerWrapper: JobManagerWrapper;
let tasksManager: TasksManager;
let getTasksByJobIdStub: jest.Mock;

describe('TasksManager', () => {
  beforeEach(() => {
    const logger = jsLogger({ enabled: false });
    jobManagerWrapper = new JobManagerWrapper(logger);
    tasksManager = new TasksManager(logger, jobManagerWrapper);
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  describe('#getTaskStatusByJobId', () => {
    it('should throw NotFoundError when jobId is not exists', async () => {
      const emptyTasksResponse: TaskResponse[] = [];

      getTasksByJobIdStub = jest.fn();
      jobManagerWrapper.getTasksByJobId = getTasksByJobIdStub.mockResolvedValue(emptyTasksResponse);

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
      jobManagerWrapper.getTasksByJobId = getTasksByJobIdStub.mockResolvedValue(tasksResponse);

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
});
