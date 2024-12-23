import jsLogger from '@map-colonies/js-logger';
import { trace } from '@opentelemetry/api';
import httpStatusCodes from 'http-status-codes';
import { container } from 'tsyringe';
import { NotFoundError } from '@map-colonies/error-types';
import { getApp } from '../../../src/app';
import { SERVICES } from '../../../src/common/constants';
import { JobExportResponse, TaskResponse } from '../../../src/common/interfaces';
import { JobManagerWrapper } from '../../../src/clients/jobManagerWrapper';
import { mockCompletedJob } from '../../mocks/data/mockJob';
import { TasksSender } from './helpers/tasksSender';

describe('tasks', function () {
  let requestSender: TasksSender;
  let getJobByJobIdSpy: jest.SpyInstance;

  beforeEach(function () {
    const [app] = getApp({
      override: [
        { token: SERVICES.LOGGER, provider: { useValue: jsLogger({ enabled: false }) } },
        { token: SERVICES.TRACER, provider: { useValue: trace.getTracer('testTracer') } },
      ],
      useChild: true,
    });
    requestSender = new TasksSender(app);
    getJobByJobIdSpy = jest.spyOn(JobManagerWrapper.prototype, 'getJobByJobId');
  });

  afterEach(function () {
    container.clearInstances();
    jest.resetAllMocks();
  });

  describe('Happy Path', function () {
    it('should return 200 status code and the tasks matched the jobId', async function () {
      const jobResponse = JSON.parse(JSON.stringify(mockCompletedJob)) as JobExportResponse;
      getJobByJobIdSpy.mockResolvedValue(jobResponse);

      const resposne = await requestSender.getTasksByJobId(mockCompletedJob.id);

      expect(resposne).toSatisfyApiSpec();
      expect(getJobByJobIdSpy).toHaveBeenCalledTimes(1);
      expect(resposne.status).toBe(httpStatusCodes.OK);
    });
  });

  describe('Sad Path', function () {
    it('should return 404 status code when no job was found', async function () {
      const jobId = '09e29fa8-7283-4334-b3a4-99f75922de59';
      getJobByJobIdSpy.mockRejectedValue(new NotFoundError('job not found'));

      const resposne = await requestSender.getTasksByJobId(jobId);

      expect(resposne).toSatisfyApiSpec();
      expect(getJobByJobIdSpy).toHaveBeenCalledTimes(1);
      expect(resposne.status).toBe(httpStatusCodes.NOT_FOUND);
    });
  });

  describe('Bad Path', function () {
    it('should return 400 status code when jobId is not exists', async function () {
      const tasksResponse: TaskResponse[] = [];
      const jobId = 'string';
      getJobByJobIdSpy.mockResolvedValue(tasksResponse);

      const resposne = await requestSender.getTasksByJobId(jobId);

      expect(resposne).toSatisfyApiSpec();
      expect(getJobByJobIdSpy).toHaveBeenCalledTimes(0);
      expect(resposne.status).toBe(httpStatusCodes.BAD_REQUEST);
    });
  });
});
