import jsLogger from '@map-colonies/js-logger';
import { IFindJobsRequest, OperationStatus } from '@map-colonies/mc-priority-queue';
import { getUTCDate } from '@map-colonies/mc-utils';
import { JobManagerWrapper } from '../../../src/clients/jobManagerWrapper';
import { JobResponse, ICreateJobResponse as JobInProgressResponse, JobExportDuplicationParams } from '../../../src/common/interfaces';
import { configMock, registerDefaultConfig } from '../../mocks/config';
import {
  completedExportJob,
  completedJob,
  fc1,
  inProgressExportJob,
  inProgressJob,
  jobs,
  layerFromCatalog,
  workerExportInput,
  workerInput,
} from '../../mocks/data';

let jobManagerClient: JobManagerWrapper;
let postFun: jest.Mock;
let putFun: jest.Mock;
let getJobs: jest.Mock;
let get: jest.Mock;
let getExportJobs: jest.Mock;

describe('JobManagerClient', () => {
  describe('#createJob', () => {
    beforeEach(() => {
      registerDefaultConfig();
      const logger = jsLogger({ enabled: false });
      jobManagerClient = new JobManagerWrapper(logger);
    });

    afterEach(() => {
      jest.resetAllMocks();
      jest.restoreAllMocks();
    });

    describe('getMap', () => {
      /**
       * @deprecated GetMap API - will be deprecated on future
       */
      it('should create job successfully', async () => {
        postFun = jest.fn();
        (jobManagerClient as unknown as { post: unknown }).post = postFun.mockResolvedValue({ id: '123', taskIds: ['123'] });
        await jobManagerClient.create(workerInput);

        expect(postFun).toHaveBeenCalledTimes(1);
      });

      it('should update job successfully', async () => {
        putFun = jest.fn();
        (jobManagerClient as unknown as { put: unknown }).put = putFun.mockResolvedValue(undefined);
        await jobManagerClient.updateJob('123213', { status: OperationStatus.COMPLETED });

        expect(putFun).toHaveBeenCalledTimes(1);
      });

      /**
       * @deprecated GetMap API - will be deprecated on future
       */
      it('should findCompletedJobs successfully', async () => {
        getJobs = jest.fn();

        const jobManager = jobManagerClient as unknown as { getJobs: unknown };
        jobManager.getJobs = getJobs.mockResolvedValue(jobs);

        const completedJobs = await jobManagerClient.findCompletedJob({
          resourceId: jobs[0].resourceId,
          version: jobs[0].version,
          dbId: jobs[0].internalId as string,
          zoomLevel: jobs[0].parameters.zoomLevel,
          crs: 'EPSG:4326',
          sanitizedBbox: jobs[0].parameters.sanitizedBbox,
        });

        expect(getJobs).toHaveBeenCalledTimes(1);
        expect(completedJobs).toBeDefined();
      });

      /**
       * @deprecated GetMap API - will be deprecated on future
       */
      it('should findInProgressJob successfully', async () => {
        getJobs = jest.fn();

        const jobManager = jobManagerClient as unknown as { getJobs: unknown };
        jobManager.getJobs = getJobs.mockResolvedValue(jobs);

        const completedJobs = await jobManagerClient.findInProgressJob({
          resourceId: jobs[0].resourceId,
          version: jobs[0].version,
          dbId: jobs[0].internalId as string,
          zoomLevel: jobs[0].parameters.zoomLevel,
          crs: 'EPSG:4326',
          sanitizedBbox: jobs[0].parameters.sanitizedBbox,
        });

        expect(getJobs).toHaveBeenCalledTimes(1);
        expect(completedJobs).toBeDefined();
      });

      /**
       * @deprecated GetMap API - will be deprecated on future
       */
      it('should get In-Progress jobs status successfully', async () => {
        getJobs = jest.fn();
        const jobs: JobResponse[] = [];
        jobs.push(inProgressJob);
        const jobManager = jobManagerClient as unknown as { getJobs: unknown };
        jobManager.getJobs = getJobs.mockResolvedValue(jobs);

        const result = await jobManagerClient.getInProgressJobs();

        expect(getJobs).toHaveBeenCalledTimes(1);
        expect(result).toBeDefined();
        expect(result).toEqual(jobs);
      });

      /**
       * @deprecated GetMap API - will be deprecated on future
       */
      it('should successfully update job expirationDate (old expirationDate lower)', async () => {
        const expirationDays: number = configMock.get('jobManager.expirationDays');
        const testExpirationDate = getUTCDate();
        const expectedNewExpirationDate = getUTCDate();
        testExpirationDate.setDate(testExpirationDate.getDate() - expirationDays);
        expectedNewExpirationDate.setDate(expectedNewExpirationDate.getDate() + expirationDays);
        expectedNewExpirationDate.setSeconds(0, 0);

        get = jest.fn();
        putFun = jest.fn();
        (jobManagerClient as unknown as { put: unknown }).put = putFun.mockResolvedValue(undefined);
        const jobManager = jobManagerClient as unknown as { get: unknown };
        jobManager.get = get.mockResolvedValue({
          ...completedJob,
          parameters: {
            ...completedJob.parameters,
            cleanupData: { ...completedJob.parameters.cleanupData, cleanupExpirationTimeUTC: testExpirationDate },
          },
        });

        await jobManagerClient.validateAndUpdateExpiration(completedJob.id);

        expect(get).toHaveBeenCalledTimes(1);
        expect(putFun).toHaveBeenCalledTimes(1);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        const expirationParamCall: Date = putFun.mock.calls[0][1].parameters.cleanupData.cleanupExpirationTimeUTC;
        expirationParamCall.setSeconds(0, 0);
        expect(JSON.stringify(expirationParamCall)).toBe(JSON.stringify(expectedNewExpirationDate));
      });

      /**
       * @deprecated GetMap API - will be deprecated on future
       */
      it('should not update job expirationDate (old expirationDate higher)', async () => {
        const expirationDays: number = configMock.get('jobManager.expirationDays');
        const testExpirationDate = getUTCDate();
        const expectedNewExpirationDate = getUTCDate();
        testExpirationDate.setDate(testExpirationDate.getDate() + 2 * expirationDays);
        expectedNewExpirationDate.setDate(expectedNewExpirationDate.getDate() + expirationDays);
        expectedNewExpirationDate.setSeconds(0, 0);

        get = jest.fn();
        putFun = jest.fn();
        (jobManagerClient as unknown as { put: unknown }).put = putFun.mockResolvedValue(undefined);
        const jobManager = jobManagerClient as unknown as { get: unknown };
        jobManager.get = get.mockResolvedValue({ ...inProgressJob, expirationDate: testExpirationDate });

        await jobManagerClient.validateAndUpdateExpiration(inProgressJob.id);

        expect(get).toHaveBeenCalledTimes(1);
        expect(putFun).toHaveBeenCalledTimes(0);
      });
    });

    describe('RoiExport', () => {
      describe('Export Job Creation', () => {
        it('should create Export job successfully', async () => {
          const inProgressJobIds = { id: '123', taskIds: ['123'] };
          const expectedResponse: JobInProgressResponse = {
            ...inProgressJobIds,
            status: OperationStatus.IN_PROGRESS,
          };
          postFun = jest.fn();
          (jobManagerClient as unknown as { post: unknown }).post = postFun.mockResolvedValue({ id: '123', taskIds: ['123'] });
          const response = await jobManagerClient.createExport(workerExportInput);
          expect(postFun).toHaveBeenCalledTimes(1);
          expect(response).toStrictEqual(expectedResponse);
        });
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
          const tilesJobType = configMock.get<string>('workerTypes.tiles.jobType');
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
            isCleaned: 'false',
            type: tilesJobType,
            shouldReturnTasks: 'false',
            status: OperationStatus.COMPLETED,
          });
          expect(completedJobs).toBeDefined();
          expect(resultParams).toStrictEqual(jobParams);
        });

        it('should findExportInProgressJobs successfully', async () => {
          const tilesJobType = configMock.get<string>('workerTypes.tiles.jobType');
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
            isCleaned: 'false',
            type: tilesJobType,
            shouldReturnTasks: 'false',
            status: OperationStatus.IN_PROGRESS,
          });
          expect(inProgressExportJobJobs).toBeDefined();
          expect(resultParams).toStrictEqual(jobParams);
        });
      });
      describe('Update Jobs', () => {
        it('should successfully update completed Export job (Naive cache) expirationDate (old expirationDate lower)', async () => {
          const expirationDays: number = configMock.get('jobManager.expirationDays');
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
          const expirationDays: number = configMock.get('jobManager.expirationDays');
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
    });
  });
});
