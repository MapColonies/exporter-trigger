import { inject, injectable } from 'tsyringe';
import config from 'config';
import { Logger } from '@map-colonies/js-logger';
import booleanEqual from '@turf/boolean-equal';
import bboxPolygon from '@turf/bbox-polygon';
import { JobManagerClient, OperationStatus } from '@map-colonies/mc-priority-queue';
import { SERVICES } from '../common/constants';
import {
  CreateJobBody,
  ICreateJobResponse,
  IFindJob,
  IJobParameters,
  ITaskParameters,
  IWorkerInput,
  JobDuplicationParams,
  JobResponse,
} from '../common/interfaces';

@injectable()
export class JobManagerWrapper extends JobManagerClient {
  private readonly tilesJobType: string;
  private readonly tilesTaskType: string;
  private readonly expirationTime: number;

  public constructor(@inject(SERVICES.LOGGER) protected readonly logger: Logger) {
    super(
      logger,
      config.get<string>('workerTypes.tiles.jobType'),
      config.get<string>('workerTypes.tiles.taskType'),
      config.get<string>('jobManager.url')
    );
    this.expirationTime = config.get<number>('jobManager.expirationTime');
    this.tilesJobType = config.get<string>('workerTypes.tiles.jobType');
    this.tilesTaskType = config.get<string>('workerTypes.tiles.taskType');
  }

  public async create(data: IWorkerInput): Promise<ICreateJobResponse> {
    const { cswProductId: resourceId, version } = data;

    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + this.expirationTime);

    const createJobRequest: CreateJobBody = {
      resourceId: resourceId,
      version: version,
      type: this.tilesJobType,
      expirationDate,
      parameters: {
        ...data,
      },
      internalId: data.dbId,
      productType: data.productType,
      productName: data.cswProductId,
      priority: data.priority,
      tasks: [
        {
          type: this.tilesTaskType,
          parameters: {
            dbId: data.dbId,
            crs: data.crs,
            zoomLevel: data.zoomLevel,
            callbackURLs: data.callbackURLs,
            bbox: data.bbox,
            tilesPath: data.tilesPath,
            footprint: data.footprint,
            productType: data.productType,
            packageName: data.packageName,
          },
        },
      ],
    };

    const res = await this.createJob<IJobParameters, ITaskParameters>(createJobRequest);
    return {
      id: res.id,
      taskIds: res.taskIds,
      status: OperationStatus.IN_PROGRESS,
    };
  }

  public async findCompletedJob(jobParams: JobDuplicationParams): Promise<JobResponse | undefined> {
    const queryParams: IFindJob = {
      resourceId: jobParams.resourceId,
      version: jobParams.version,
      isCleaned: 'false',
      type: this.tilesJobType,
      shouldReturnTasks: 'false',
      status: OperationStatus.COMPLETED,
    };

    const jobs = await this.getJobs(queryParams);
    if (jobs) {
      const matchingJob = this.findJobWithMatchingParams(jobs, jobParams);
      return matchingJob;
    }

    return undefined;
  }

  public async findInProgressJob(jobParams: JobDuplicationParams): Promise<JobResponse | undefined> {
    const queryParams: IFindJob = {
      resourceId: jobParams.resourceId,
      version: jobParams.version,
      isCleaned: 'false',
      type: this.tilesJobType,
      shouldReturnTasks: 'true',
      status: OperationStatus.IN_PROGRESS,
    };

    const jobs = await this.getJobs(queryParams);
    if (jobs) {
      const matchingJob = this.findJobWithMatchingParams(jobs, jobParams);
      return matchingJob;
    }

    return undefined;
  }

  public async findPendingJob(jobParams: JobDuplicationParams): Promise<JobResponse | undefined> {
    const queryParams: IFindJob = {
      resourceId: jobParams.resourceId,
      version: jobParams.version,
      isCleaned: 'false',
      type: this.tilesJobType,
      shouldReturnTasks: 'true',
      status: OperationStatus.PENDING,
    };

    const jobs = await this.getJobs(queryParams);
    if (jobs) {
      const matchingJob = this.findJobWithMatchingParams(jobs, jobParams);
      return matchingJob;
    }

    return undefined;
  }

  private async getJobs(queryParams: IFindJob): Promise<JobResponse[] | undefined> {
    this.logger.info(`Getting jobs that match these parameters: ${JSON.stringify(queryParams)}`);
    const jobs = await this.get<JobResponse[] | undefined>('/jobs', queryParams as unknown as Record<string, unknown>);
    return jobs;
  }

  private findJobWithMatchingParams(jobs: JobResponse[], jobParams: JobDuplicationParams): JobResponse | undefined {
    const matchingJob = jobs.find(
      (job) =>
        job.parameters.dbId === jobParams.dbId &&
        job.parameters.zoomLevel === jobParams.zoomLevel &&
        job.parameters.crs === jobParams.crs &&
        booleanEqual(bboxPolygon(job.parameters.bbox), bboxPolygon(jobParams.bbox))
    );
    return matchingJob;
  }
}
