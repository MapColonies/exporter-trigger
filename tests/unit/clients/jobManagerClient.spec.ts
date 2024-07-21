import jsLogger from '@map-colonies/js-logger';
import { IFindJobsRequest, OperationStatus } from '@map-colonies/mc-priority-queue';
import { getUTCDate } from '@map-colonies/mc-utils';
import { trace } from '@opentelemetry/api';
import { JobManagerWrapper } from '../../../src/clients/jobManagerWrapper';
import { JobExportDuplicationParams, ICreateExportJobResponse } from '../../../src/common/interfaces';
import { configMock, registerDefaultConfig } from '../../mocks/config';
import {
  completedExportJob,
  fc1,
  inProgressExportJob,
  jobPayloadWithMixedForFixedStrategyCheck,
  layerFromCatalog,
  workerExportInput,
} from '../../mocks/data';
import { TileFormatStrategy } from '../../../src/common/enums';

let jobManagerClient: JobManagerWrapper;
let postFun: jest.Mock;
let putFun: jest.Mock;
let get: jest.Mock;
let getExportJobs: jest.Mock;
let deleteFun: jest.Mock;
let createJob: jest.Mock;

describe('JobManagerClient', () => {
  describe('#createJob', () => {
    beforeEach(() => {
      registerDefaultConfig();
      const logger = jsLogger({ enabled: false });
      jobManagerClient = new JobManagerWrapper(logger, trace.getTracer('testTracer'));
    });

    afterEach(() => {
      jest.resetAllMocks();
      jest.restoreAllMocks();
    });

    describe('getMap', () => {
      it('should update job successfully', async () => {
        putFun = jest.fn();
        (jobManagerClient as unknown as { put: unknown }).put = putFun.mockResolvedValue(undefined);
        await jobManagerClient.updateJob('123213', { status: OperationStatus.COMPLETED });

        expect(putFun).toHaveBeenCalledTimes(1);
      });
    });

    describe('RoiExport', () => {
      describe('Export Job Creation', () => {
        it('should create Export job successfully', async () => {
          const inProgressJobIds = { jobId: '123', taskIds: ['123'] };
          const expectedResponse: ICreateExportJobResponse = {
            ...inProgressJobIds,
            status: OperationStatus.IN_PROGRESS,
          };
          postFun = jest.fn();
          (jobManagerClient as unknown as { post: unknown }).post = postFun.mockResolvedValue({ id: '123', taskIds: ['123'] });
          const response = await jobManagerClient.createExport(workerExportInput);
          expect(postFun).toHaveBeenCalledTimes(1);
          expect(response).toStrictEqual(expectedResponse);
        });

        it.each([TileFormatStrategy.MIXED, TileFormatStrategy.FIXED])(
          'should create Export job successfully with %p tiles strategy',
          async (strategy: TileFormatStrategy) => {
            const inProgressJobIds = { jobId: '123', taskIds: ['123'] };
            const expectedResponse: ICreateExportJobResponse = {
              ...inProgressJobIds,
              status: OperationStatus.IN_PROGRESS,
            };

            createJob = jest.fn();
            (jobManagerClient as unknown as { createJob: unknown }).createJob = createJob.mockResolvedValue({ id: '123', taskIds: ['123'] });
            workerExportInput.outputFormatStrategy = strategy;
            const response = await jobManagerClient.createExport(workerExportInput);
            expect(createJob).toHaveBeenCalledTimes(1);
            expect(createJob).toHaveBeenCalledWith({
              ...jobPayloadWithMixedForFixedStrategyCheck,
              tasks: [
                {
                  ...jobPayloadWithMixedForFixedStrategyCheck.tasks[0],
                  parameters: {
                    ...jobPayloadWithMixedForFixedStrategyCheck.tasks[0].parameters,
                    outputFormatStrategy: strategy,
                  },
                },
              ],
              parameters: expect.anything() as unknown,
            });
            expect(response).toStrictEqual(expectedResponse);
          }
        );
      });

      describe('Get Export Jobs', () => {
        it('should getting jobs that match find params Export job successfully', async () => {
          const findJobRequest: IFindJobsRequest = {
            resourceId: layerFromCatalog.metadata.productId,
            version: layerFromCatalog.metadata.productVersion,
            isCleaned: false,
            status: OperationStatus.IN_PROGRESS,
            shouldReturnTasks: false,
          };
          get = jest.fn();
          (jobManagerClient as unknown as { get: unknown }).get = get.mockResolvedValue([inProgressExportJob]);
          const response = await jobManagerClient.getExportJobs(findJobRequest);
          expect(get).toHaveBeenCalledTimes(1);
          expect(response).toBeDefined();
        });
      });

      describe('Find Job by Status', () => {
        it('should findExportCompletedJobs successfully', async () => {
          const tilesJobType = configMock.get<string>('externalClientsConfig.exportJobAndTaskTypes.jobType');
          getExportJobs = jest.fn();
          const jobManager = jobManagerClient as unknown as { getExportJobs: unknown };
          jobManager.getExportJobs = getExportJobs.mockResolvedValue([completedExportJob]);

          const jobParams: JobExportDuplicationParams = {
            resourceId: completedExportJob.resourceId,
            version: completedExportJob.version,
            dbId: completedExportJob.internalId as string,
            crs: 'EPSG:4326',
            roi: fc1,
          };

          const completedJobs = await jobManagerClient.findExportJob(OperationStatus.COMPLETED, jobParams);
          const resultParams = {
            resourceId: completedJobs?.resourceId,
            version: completedJobs?.version,
            dbId: completedJobs?.internalId as string,
            crs: completedJobs?.parameters.crs,
            roi: completedJobs?.parameters.roi,
          };
          expect(getExportJobs).toHaveBeenCalledTimes(1);
          expect(getExportJobs).toHaveBeenCalledWith({
            resourceId: jobParams.resourceId,
            version: jobParams.version,
            isCleaned: false,
            type: tilesJobType,
            shouldReturnTasks: false,
            status: OperationStatus.COMPLETED,
          });
          expect(completedJobs).toBeDefined();
          expect(resultParams).toStrictEqual(jobParams);
        });

        it('should findExportInProgressJobs successfully', async () => {
          const tilesJobType = configMock.get<string>('externalClientsConfig.exportJobAndTaskTypes.jobType');
          getExportJobs = jest.fn();
          const jobManager = jobManagerClient as unknown as { getExportJobs: unknown };
          jobManager.getExportJobs = getExportJobs.mockResolvedValue([inProgressExportJob]);

          const jobParams: JobExportDuplicationParams = {
            resourceId: inProgressExportJob.resourceId,
            version: inProgressExportJob.version,
            dbId: inProgressExportJob.internalId as string,
            crs: 'EPSG:4326',
            roi: fc1,
          };

          const inProgressExportJobJobs = await jobManagerClient.findExportJob(OperationStatus.IN_PROGRESS, jobParams);
          const resultParams = {
            resourceId: inProgressExportJobJobs?.resourceId,
            version: inProgressExportJobJobs?.version,
            dbId: inProgressExportJobJobs?.internalId as string,
            crs: inProgressExportJobJobs?.parameters.crs,
            roi: inProgressExportJobJobs?.parameters.roi,
          };
          expect(getExportJobs).toHaveBeenCalledTimes(1);
          expect(getExportJobs).toHaveBeenCalledWith({
            resourceId: jobParams.resourceId,
            version: jobParams.version,
            isCleaned: false,
            type: tilesJobType,
            shouldReturnTasks: false,
            status: OperationStatus.IN_PROGRESS,
          });
          expect(inProgressExportJobJobs).toBeDefined();
          expect(resultParams).toStrictEqual(jobParams);
        });
      });
      describe('Update Jobs', () => {
        it('should successfully update completed Export job (Naive cache) expirationDate (old expirationDate lower)', async () => {
          const expirationDays: number = configMock.get('cleanupExpirationDays');
          const testExpirationDate = getUTCDate();
          const expectedNewExpirationDate = getUTCDate();
          testExpirationDate.setDate(testExpirationDate.getDate() - expirationDays);
          expectedNewExpirationDate.setDate(expectedNewExpirationDate.getDate() + expirationDays);
          expectedNewExpirationDate.setSeconds(0, 0);

          get = jest.fn();
          putFun = jest.fn();
          (jobManagerClient as unknown as { put: unknown }).put = putFun.mockResolvedValue(undefined);
          const jobManager = jobManagerClient as unknown as { get: unknown };
          jobManager.get = get.mockResolvedValue({ ...completedExportJob });

          await jobManagerClient.validateAndUpdateExpiration(completedExportJob.id);

          expect(get).toHaveBeenCalledTimes(1);
          expect(putFun).toHaveBeenCalledTimes(1);
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          const expirationParamCall: Date = putFun.mock.calls[0][1].parameters.cleanupData.cleanupExpirationTimeUTC;
          expirationParamCall.setSeconds(0, 0);
          expect(JSON.stringify(expirationParamCall)).toBe(JSON.stringify(expectedNewExpirationDate));
        });

        it('should not update completed Export job (naive cache) expirationDate (old expirationDate higher)', async () => {
          const expirationDays: number = configMock.get('cleanupExpirationDays');
          const testExpirationDate = getUTCDate();
          const expectedNewExpirationDate = getUTCDate();
          testExpirationDate.setDate(testExpirationDate.getDate() + 2 * expirationDays);
          expectedNewExpirationDate.setDate(expectedNewExpirationDate.getDate() + expirationDays);
          expectedNewExpirationDate.setSeconds(0, 0);

          get = jest.fn();
          putFun = jest.fn();
          (jobManagerClient as unknown as { put: unknown }).put = putFun.mockResolvedValue(undefined);
          const jobManager = jobManagerClient as unknown as { get: unknown };
          jobManager.get = get.mockResolvedValue({
            ...completedExportJob,
            parameters: {
              ...completedExportJob.parameters,
              cleanupData: { ...completedExportJob.parameters.cleanupData, cleanupExpirationTimeUTC: testExpirationDate },
            },
          });

          await jobManagerClient.validateAndUpdateExpiration(completedExportJob.id);

          expect(get).toHaveBeenCalledTimes(1);
          expect(putFun).toHaveBeenCalledTimes(0);
        });
      });

      describe('Get tasks by job id', () => {
        it('should getting all task that match specific job id provided (uuid-string)', async () => {
          get = jest.fn();
          (jobManagerClient as unknown as { get: unknown }).get = get.mockResolvedValue([]);
          const response = await jobManagerClient.getTasksByJobId(inProgressExportJob.id);
          expect(get).toHaveBeenCalledTimes(1);
          expect(response).toBeDefined();
        });
      });

      describe('delete tasks by job id and task id', () => {
        it('should pass deletion on provided taskId', async () => {
          deleteFun = jest.fn();
          (jobManagerClient as unknown as { delete: unknown }).delete = deleteFun.mockResolvedValue(undefined);
          const jobId = '66100582-f190-4f95-a3f8-1459eb96d4da';
          const taskId = 'e7c0ac78-3e5d-4995-bdfd-8e8b83262949';
          await jobManagerClient.deleteTaskById(jobId, taskId);
          expect(deleteFun).toHaveBeenCalledTimes(1);
        });
      });
    });
  });
});
