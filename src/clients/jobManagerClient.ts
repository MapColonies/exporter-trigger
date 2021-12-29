import { inject, injectable } from 'tsyringe';
import config from 'config';
import { degreesPerPixelToZoomLevel, HttpClient, IHttpRetryConfig } from '@map-colonies/mc-utils';
import { Logger } from '@map-colonies/js-logger';
import booleanEqual from '@turf/boolean-equal';
import bboxPolygon from '@turf/bbox-polygon';
import { ICreateJobBody, IJobResponse, IUpdateJobBody, OperationStatus } from '@map-colonies/mc-priority-queue';
import { SERVICES } from '../common/constants';
import { ICreateJobResponse, IFindJob, IJobParameters, ITaskParameters, IWorkerInput, JobDuplicationParams } from '../common/interfaces';

interface JobManagerCreateJobResponse {
  id: string;
  taskIds: string[];
}

type JobResponse = IJobResponse<IJobParameters, ITaskParameters>;

@injectable()
export class JobManagerClient extends HttpClient {
  private readonly tilesJobType: string;
  private readonly tilesTaskType: string;
  private readonly expirationTime: number;

  public constructor(@inject(SERVICES.LOGGER) protected readonly logger: Logger) {
    super(logger, config.get<string>('jobManager.url'), 'JobManager', config.get<IHttpRetryConfig>('httpRetry'));
    this.expirationTime = config.get<number>('jobManager.expirationTime');
    this.tilesJobType = config.get<string>('workerTypes.tiles.jobType');
    this.tilesTaskType = config.get<string>('workerTypes.tiles.taskType');
  }

  public async updateJob(jobId: string, payload: IUpdateJobBody<IJobParameters>): Promise<void> {
    this.logger.debug(`Updating job ${jobId} with payload ${JSON.stringify(payload)}`);
    const updateJobUrl = `/jobs/${jobId}`;
    await this.put(updateJobUrl, payload);
  }

  public async createJob(data: IWorkerInput): Promise<ICreateJobResponse> {
    const { cswProductId: resourceId, version } = data;
    const zoomLevel = degreesPerPixelToZoomLevel(data.targetResolution);

    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + this.expirationTime);

    const createJobRequest: ICreateJobBody<IJobParameters, ITaskParameters> = {
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
            zoomLevel,
            callbackURL: data.callbackURL,
            bbox: data.bbox,
            tilesPath: data.tilesPath,
            footprint: data.footprint,
            productType: data.productType,
            packageName: data.packageName,
          },
        },
      ],
    };

    this.logger.info(`Creating job and task for ${data.dbId}`);
    this.logger.debug(JSON.stringify(createJobRequest));

    const res = await this.post<JobManagerCreateJobResponse>('/jobs', createJobRequest);
    return {
      jobId: res.id,
      taskIds: res.taskIds,
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
        job.parameters.targetResolution === jobParams.targetResolution &&
        job.parameters.crs === jobParams.crs &&
        booleanEqual(bboxPolygon(job.parameters.bbox), bboxPolygon(jobParams.bbox))
    );
    return matchingJob;
  }
}
