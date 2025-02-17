import jsLogger from '@map-colonies/js-logger';
import { trace } from '@opentelemetry/api';
import httpStatusCodes from 'http-status-codes';
import { container } from 'tsyringe';
import { OperationStatus } from '@map-colonies/mc-priority-queue';
import { getApp } from '../../../src/app';
import { SERVICES } from '../../../src/common/constants';
import { ITaskParameters, TaskResponse } from '../../../src/common/interfaces';
import { JobManagerWrapper } from '../../../src/clients/jobManagerWrapper';
import { TasksSender } from './helpers/tasksSender';

describe('tasks', function () {
  let requestSender: TasksSender;
  let getTasksByJobIdSpy: jest.SpyInstance;

  beforeEach(function () {
    const app = getApp({
      override: [
        { token: SERVICES.LOGGER, provider: { useValue: jsLogger({ enabled: false }) } },
        { token: SERVICES.TRACER, provider: { useValue: trace.getTracer('testTracer') } },
      ],
      useChild: true,
    });
    requestSender = new TasksSender(app);
    getTasksByJobIdSpy = jest.spyOn(JobManagerWrapper.prototype, 'getTasksByJobId');
  });

  afterEach(function () {
    container.clearInstances();
    jest.resetAllMocks();
  });

  describe('Happy Path', function () {
    it('should return 200 status code and the tasks matched the jobId', async function () {
      const tasksResponse: TaskResponse[] = [
        {
          id: '0a5552f7-01eb-40af-a912-eed8fa9e1561',
          jobId: '0a5552f7-01eb-40af-a912-eed8fa9e1568',
          type: 'export',
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
      const jobId = '09e29fa8-7283-4334-b3a4-99f75922de59';
      getTasksByJobIdSpy.mockResolvedValue(tasksResponse);

      const resposne = await requestSender.getTasksByJobId(jobId);

      expect(resposne).toSatisfyApiSpec();
      expect(getTasksByJobIdSpy).toHaveBeenCalledTimes(1);
      expect(resposne.status).toBe(httpStatusCodes.OK);
    });
  });

  describe('Sad Path', function () {
    it('should return 404 status code due to invalid string format (uuid)', async function () {
      const tasksResponse: TaskResponse[] = [];
      const jobId = '09e29fa8-7283-4334-b3a4-99f75922de59';
      getTasksByJobIdSpy.mockResolvedValue(tasksResponse);

      const resposne = await requestSender.getTasksByJobId(jobId);

      expect(resposne).toSatisfyApiSpec();
      expect(getTasksByJobIdSpy).toHaveBeenCalledTimes(1);
      expect(resposne.status).toBe(httpStatusCodes.NOT_FOUND);
    });
  });

  describe('Bad Path', function () {
    it('should return 400 status code when jobId is not exists', async function () {
      const tasksResponse: TaskResponse[] = [];
      const jobId = 'string';
      getTasksByJobIdSpy.mockResolvedValue(tasksResponse);

      const resposne = await requestSender.getTasksByJobId(jobId);

      expect(resposne).toSatisfyApiSpec();
      expect(getTasksByJobIdSpy).toHaveBeenCalledTimes(0);
      expect(resposne.status).toBe(httpStatusCodes.BAD_REQUEST);
    });
  });
});
