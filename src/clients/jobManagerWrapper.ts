import { inject, injectable } from 'tsyringe';
import config from 'config';
import { Logger } from '@map-colonies/js-logger';
import booleanEqual from '@turf/boolean-equal';
import bboxPolygon from '@turf/bbox-polygon';
import { JobManagerClient, OperationStatus } from '@map-colonies/mc-priority-queue';
import { featureCollectionBooleanEqual, getUTCDate } from '@map-colonies/mc-utils';
import { SERVICES } from '../common/constants';
import {
  CreateExportJobBody,
  CreateJobBody,
  ExportVersion,
  ICreateJobResponse,
  IJobExportParameters,
  IJobParameters,
  ITaskParameters,
  IWorkerExportInput,
  IWorkerInput,
  JobDuplicationParams,
  JobExportDuplicationParams,
  JobExportResponse,
  JobResponse,
  TaskResponse,
} from '../common/interfaces';
//this is the job manager api for find job DO NOT MODIFY
export interface IFindJob {
  resourceId?: string;
  version?: string;
  isCleaned?: string;
  status?: string;
  type?: string;
  shouldReturnTasks?: string;
  fromDate?: Date;
  tillData?: Date;
  productType?: string;
}

@injectable()
export class JobManagerWrapper extends JobManagerClient {
  private readonly tilesJobType: string;
  private readonly tilesTaskType: string;
  private readonly expirationDays: number;
  private readonly jobDomain: string;

  public constructor(@inject(SERVICES.LOGGER) protected readonly logger: Logger) {
    super(
      logger,
      config.get<string>('workerTypes.tiles.jobType'),
      config.get<string>('workerTypes.tiles.taskType'),
      config.get<string>('jobManager.url')
    );
    this.expirationDays = config.get<number>('jobManager.expirationDays');
    this.tilesJobType = config.get<string>('workerTypes.tiles.jobType');
    this.tilesTaskType = config.get<string>('workerTypes.tiles.taskType');
    this.jobDomain = config.get<string>('jobManager.jobDomain');
  }

  /**
   * @deprecated The method should not be used
   */
  public async create(data: IWorkerInput): Promise<ICreateJobResponse> {
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + this.expirationDays);

    const createJobRequest: CreateJobBody = {
      resourceId: data.cswProductId,
      version: data.version,
      type: this.tilesJobType,
      expirationDate,
      domain: this.jobDomain,
      parameters: {
        sanitizedBbox: data.sanitizedBbox,
        targetResolution: data.targetResolution,
        exportVersion: ExportVersion.GETMAP,
        zoomLevel: data.zoomLevel,
        callbacks: data.callbacks,
        crs: data.crs,
        fileName: data.fileName,
        relativeDirectoryPath: data.relativeDirectoryPath,
        gpkgEstimatedSize: data.gpkgEstimatedSize,
      },
      internalId: data.dbId,
      productType: data.productType,
      productName: data.cswProductId,
      priority: data.priority,
      status: OperationStatus.IN_PROGRESS,
      additionalIdentifiers: data.sanitizedBbox.toString() + String(data.zoomLevel),
      tasks: [
        {
          type: this.tilesTaskType,
          parameters: {
            batches: data.batches,
            sources: data.sources,
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

  public async createExport(data: IWorkerExportInput): Promise<ICreateJobResponse> {
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + this.expirationDays);

    const jobParameters: IJobExportParameters = {
      roi: data.roi,
      callbacks: data.callbacks,
      crs: data.crs,
      exportVersion: ExportVersion.ROI,
      fileNamesTemplates: data.fileNamesTemplates,
      relativeDirectoryPath: data.relativeDirectoryPath,
      gpkgEstimatedSize: data.gpkgEstimatedSize,
    };

    const createJobRequest: CreateExportJobBody = {
      resourceId: data.cswProductId,
      version: data.version,
      type: this.tilesJobType,
      expirationDate,
      domain: this.jobDomain,
      parameters: jobParameters,
      internalId: data.dbId,
      productType: data.productType,
      productName: data.cswProductId,
      priority: data.priority,
      status: OperationStatus.IN_PROGRESS,
      additionalIdentifiers: data.relativeDirectoryPath,
      tasks: [
        {
          type: this.tilesTaskType,
          parameters: {
            batches: data.batches,
            sources: data.sources,
          },
        },
      ],
    };
    const res = await this.createJob<IJobExportParameters, ITaskParameters>(createJobRequest);
    const createJobResponse: ICreateJobResponse = {
      id: res.id,
      taskIds: res.taskIds,
      status: OperationStatus.IN_PROGRESS,
    };
    return createJobResponse;
  }

  /**
   * @deprecated The method should not be used
   */
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

  public async findExportJob(
    status: OperationStatus,
    jobParams: JobExportDuplicationParams,
    shouldReturnTasks = false
  ): Promise<JobExportResponse | undefined> {
    const queryParams: IFindJob = {
      resourceId: jobParams.resourceId,
      version: jobParams.version,
      isCleaned: 'false',
      type: this.tilesJobType,
      shouldReturnTasks: shouldReturnTasks ? 'true' : 'false',
      status,
    };
    const jobs = await this.getExportJobs(queryParams);
    if (jobs) {
      const matchingJob = this.findExportJobWithMatchingParams(jobs, jobParams);
      return matchingJob;
    }

    return undefined;
  }

  /**
   * @deprecated The method should not be used
   */
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

  /**
   * @deprecated The method should not be used
   */
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

  public async getTasksByJobId(jobId: string): Promise<TaskResponse[]> {
    const tasks = await this.get<TaskResponse[]>(`/jobs/${jobId}/tasks`);
    return tasks;
  }

  /**
   * @deprecated GetMap API - will be deprecated on future
   */
  public async getInProgressJobs(shouldReturnTasks = false): Promise<JobResponse[] | undefined> {
    const queryParams: IFindJob = {
      isCleaned: 'false',
      type: this.tilesJobType,
      shouldReturnTasks: shouldReturnTasks ? 'true' : 'false',
      status: OperationStatus.IN_PROGRESS,
    };
    const jobs = await this.getJobs(queryParams);
    return jobs;
  }

  public async updateJobStatus(jobId: string, status: OperationStatus, reason?: string, catalogId?: string): Promise<void> {
    const updateJobUrl = `/jobs/${jobId}`;
    await this.put(updateJobUrl, {
      status: status,
      reason: reason,
      internalId: catalogId,
    });
  }

  public async validateAndUpdateExpiration(jobId: string): Promise<void> {
    const getOrUpdateURL = `/jobs/${jobId}`;
    const newExpirationDate = getUTCDate();
    newExpirationDate.setDate(newExpirationDate.getDate() + this.expirationDays);

    const job = await this.get<JobResponse | JobExportResponse | undefined>(getOrUpdateURL);
    if (job) {
      const oldExpirationDate = new Date(job.expirationDate as Date);
      if (oldExpirationDate < newExpirationDate) {
        this.logger.info({ jobId, oldExpirationDate, newExpirationDate }, 'Will execute update for expirationDate');
        await this.put(getOrUpdateURL, {
          expirationDate: newExpirationDate,
        });
      } else {
        const msg = 'Will not update expiration date, as current expiration date is later than current expiration date';
        this.logger.info({ jobId, oldExpirationDate, newExpirationDate, msg });
      }
    }
  }

  public async getExportJobs(queryParams: IFindJob): Promise<JobExportResponse[] | undefined> {
    this.logger.debug({ ...queryParams }, `Getting jobs that match these parameters`);
    const jobs = await this.get<JobExportResponse[] | undefined>('/jobs', queryParams as unknown as Record<string, unknown>);
    const exportJobs = jobs?.filter((job) => {
      if (job.parameters.exportVersion === ExportVersion.ROI) {
        return job;
      }
    });
    return exportJobs;
  }

  /**
   * @deprecated GetMap API - will be deprecated on future
   */
  private async getJobs(queryParams: IFindJob): Promise<JobResponse[] | undefined> {
    this.logger.debug({ ...queryParams }, `Getting jobs that match these parameters`);
    const jobs = await this.get<JobResponse[] | undefined>('/jobs', queryParams as unknown as Record<string, unknown>);
    const exportJobs = jobs?.filter((job) => {
      if (job.parameters.exportVersion === ExportVersion.GETMAP) {
        return job;
      }
    });
    return exportJobs;
  }

  /**
   * @deprecated GetMap API - will be deprecated on future
   */
  private findJobWithMatchingParams(jobs: JobResponse[], jobParams: JobDuplicationParams): JobResponse | undefined {
    const matchingJob = jobs.find(
      (job) =>
        job.internalId === jobParams.dbId &&
        job.version === jobParams.version &&
        job.parameters.zoomLevel === jobParams.zoomLevel &&
        job.parameters.crs === jobParams.crs &&
        booleanEqual(bboxPolygon(job.parameters.sanitizedBbox), bboxPolygon(jobParams.sanitizedBbox))
    );
    return matchingJob;
  }

  private findExportJobWithMatchingParams(jobs: JobExportResponse[], jobParams: JobExportDuplicationParams): JobExportResponse | undefined {
    const matchingJob = jobs.find(
      (job) =>
        job.internalId === jobParams.dbId &&
        job.version === jobParams.version &&
        job.parameters.crs === jobParams.crs &&
        featureCollectionBooleanEqual(job.parameters.roi, jobParams.roi)
    );
    return matchingJob;
  }
}
