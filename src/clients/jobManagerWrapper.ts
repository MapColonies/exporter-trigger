import { inject, injectable } from 'tsyringe';
import config from 'config';
import { Logger } from '@map-colonies/js-logger';
import { IFindJobsRequest, JobManagerClient, OperationStatus } from '@map-colonies/mc-priority-queue';
import { featureCollectionBooleanEqual, getUTCDate, IHttpRetryConfig } from '@map-colonies/mc-utils';
import { withSpanAsyncV4 } from '@map-colonies/telemetry';
import { Tracer, context, propagation } from '@opentelemetry/api';
import { SERVICES } from '../common/constants';
import { ITraceParentContext } from '../common/interfaces';
import {
  CreateExportJobBody,
  ICreateExportJobResponse,
  IJobExportParameters,
  ITaskParameters,
  IWorkerExportInput,
  JobExportDuplicationParams,
  JobExportResponse,
  TaskResponse,
} from '../common/interfaces';

@injectable()
export class JobManagerWrapper extends JobManagerClient {
  private readonly tilesJobType: string;
  private readonly tilesTaskType: string;
  private readonly expirationDays: number;
  private readonly jobDomain: string;

  public constructor(@inject(SERVICES.LOGGER) protected readonly logger: Logger, @inject(SERVICES.TRACER) public readonly tracer: Tracer) {
    super(
      logger,
      config.get<string>('externalClientsConfig.exportJobAndTaskTypes.jobType'),
      config.get<string>('externalClientsConfig.clientsUrls.jobManager.url'),
      config.get<IHttpRetryConfig>('externalClientsConfig.httpRetry'),
      'jobManagerClient',
      config.get<boolean>('externalClientsConfig.disableHttpClientLogs')
    );
    this.expirationDays = config.get<number>('cleanupExpirationDays');
    this.tilesJobType = config.get<string>('externalClientsConfig.exportJobAndTaskTypes.jobType');
    this.tilesTaskType = config.get<string>('externalClientsConfig.exportJobAndTaskTypes.taskTilesType');
    this.jobDomain = config.get<string>('externalClientsConfig.clientsUrls.jobManager.jobDomain');
  }

  @withSpanAsyncV4
  public async createExport(data: IWorkerExportInput): Promise<ICreateExportJobResponse> {
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + this.expirationDays);

    const traceContext: ITraceParentContext = {};
    propagation.inject(context.active(), traceContext);

    const jobParameters: IJobExportParameters = {
      roi: data.roi,
      callbacks: data.callbacks,
      crs: data.crs,
      fileNamesTemplates: data.fileNamesTemplates,
      relativeDirectoryPath: data.relativeDirectoryPath,
      gpkgEstimatedSize: data.gpkgEstimatedSize,
      traceParentContext: traceContext,
    };

    const createJobRequest: CreateExportJobBody = {
      resourceId: data.cswProductId,
      version: data.version,
      type: this.tilesJobType,
      domain: this.jobDomain,
      parameters: jobParameters,
      internalId: data.dbId,
      productType: data.productType,
      productName: data.cswProductId,
      priority: data.priority,
      description: data.description,
      status: OperationStatus.IN_PROGRESS,
      additionalIdentifiers: data.relativeDirectoryPath,
      tasks: [
        {
          type: this.tilesTaskType,
          parameters: {
            isNewTarget: true,
            targetFormat: data.targetFormat,
            batches: data.batches,
            sources: data.sources,
          },
        },
      ],
    };
    const res = await this.createJob<IJobExportParameters, ITaskParameters>(createJobRequest);
    const createJobResponse: ICreateExportJobResponse = {
      jobId: res.id,
      taskIds: res.taskIds,
      status: OperationStatus.IN_PROGRESS,
    };
    return createJobResponse;
  }

  public async getTasksByJobId(jobId: string): Promise<TaskResponse[]> {
    const tasks = await this.get<TaskResponse[]>(`/jobs/${jobId}/tasks`);
    return tasks;
  }

  public async findExportJob(
    status: OperationStatus,
    jobParams: JobExportDuplicationParams,
    shouldReturnTasks = false
  ): Promise<JobExportResponse | undefined> {
    const queryParams: IFindJobsRequest = {
      resourceId: jobParams.resourceId,
      version: jobParams.version,
      isCleaned: false,
      type: this.tilesJobType,
      shouldReturnTasks,
      status,
    };
    const jobs = await this.getExportJobs(queryParams);
    if (jobs) {
      const matchingJob = this.findExportJobWithMatchingParams(jobs, jobParams);
      return matchingJob;
    }

    return undefined;
  }

  public async getInProgressJobs(shouldReturnTasks = false): Promise<JobExportResponse[] | undefined> {
    const queryParams: IFindJobsRequest = {
      isCleaned: false,
      type: this.tilesJobType,
      shouldReturnTasks,
      status: OperationStatus.IN_PROGRESS,
    };
    const jobs = await this.getExportJobs(queryParams);
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

  public async deleteTaskById(jobId: string, taskId: string): Promise<void> {
    const deleteTaskUrl = `/jobs/${jobId}/tasks/${taskId}`;
    await this.delete(deleteTaskUrl);
  }

  public async validateAndUpdateExpiration(jobId: string): Promise<void> {
    const getOrUpdateURL = `/jobs/${jobId}`;
    const newExpirationDate = getUTCDate();
    newExpirationDate.setDate(newExpirationDate.getDate() + this.expirationDays);
    const job = await this.get<JobExportResponse>(getOrUpdateURL);
    const oldExpirationDate = new Date(job.parameters.cleanupData?.cleanupExpirationTimeUTC as Date);
    if (oldExpirationDate < newExpirationDate) {
      this.logger.info({ jobId, oldExpirationDate, newExpirationDate, msg: 'update expirationDate' });
      await this.put(getOrUpdateURL, {
        parameters: {
          ...job.parameters,
          cleanupData: {
            ...job.parameters.cleanupData,
            cleanupExpirationTimeUTC: newExpirationDate,
            directoryPath: job.parameters.relativeDirectoryPath,
          },
          callbackParams: {
            ...job.parameters.callbackParams,
            expirationTime: newExpirationDate,
          },
        },
      });
    } else {
      const msg = 'Will not update expiration date, as current expiration date is later than current expiration date';
      this.logger.info({ jobId, oldExpirationDate, newExpirationDate, msg });
    }
  }

  //TODO: once will be only one kind of exported jobs, no need to filter by ROI's
  public async getExportJobs(queryParams: IFindJobsRequest): Promise<JobExportResponse[] | undefined> {
    this.logger.debug({ ...queryParams }, `Getting jobs that match these parameters`);
    const jobs = await this.get<JobExportResponse[] | undefined>('/jobs', queryParams as unknown as Record<string, unknown>);
    const exportJobs = jobs?.filter((job) => {
      return job;
    });
    return exportJobs;
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
