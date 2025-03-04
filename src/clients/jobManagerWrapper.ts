import { inject, injectable } from 'tsyringe';
import config from 'config';
import { Logger } from '@map-colonies/js-logger';
import { IFindJobsByCriteriaBody, IFindJobsRequest, JobManagerClient, OperationStatus } from '@map-colonies/mc-priority-queue';
import { getUTCDate, IHttpRetryConfig } from '@map-colonies/mc-utils';
import { Tracer } from '@opentelemetry/api';
import { withSpanAsyncV4 } from '@map-colonies/telemetry';
import { ExportJobParameters } from '@map-colonies/raster-shared';
import {
  CreateExportJobBody,
  ICreateExportJobResponse,
  IExportInitRequest,
  ITaskParameters,
  JobExportDuplicationParams,
  JobExportResponse,
} from '../common/interfaces';
import { SERVICES } from '../common/constants';

@injectable()
export class JobManagerWrapper extends JobManagerClient {
  private readonly exportJobType: string;
  private readonly exportInitTaskType: string;
  private readonly expirationDays: number;
  private readonly jobDomain: string;
  public constructor(
    @inject(SERVICES.LOGGER) protected readonly logger: Logger,
    @inject(SERVICES.TRACER) public readonly tracer: Tracer
  ) {
    super(
      logger,
      config.get<string>('externalClientsConfig.clientsUrls.jobManager.url'),
      config.get<IHttpRetryConfig>('externalClientsConfig.httpRetry'),
      'jobManagerClient',
      config.get<boolean>('externalClientsConfig.disableHttpClientLogs')
    );
    this.expirationDays = config.get<number>('cleanupExpirationDays');
    this.exportJobType = config.get<string>('jobDefinitions.jobs.export.type');
    this.exportInitTaskType = config.get<string>('jobDefinitions.tasks.init.type');
    this.jobDomain = config.get<string>('domain');
  }

  @withSpanAsyncV4
  public async getJobByJobId(jobId: string): Promise<JobExportResponse> {
    this.logger.debug({ msg: `Getting export job by id`, jobId });
    const job = await this.getJob<ExportJobParameters, unknown>(jobId);
    return job;
  }

  @withSpanAsyncV4
  public async findExportJobs(
    status: OperationStatus,
    jobParams: JobExportDuplicationParams,
    shouldReturnTasks = false
  ): Promise<JobExportResponse[] | undefined> {
    const queryParams: IFindJobsRequest = {
      resourceId: jobParams.productId,
      version: jobParams.version,
      isCleaned: false,
      type: this.exportJobType,
      shouldReturnTasks,
      status,
    };
    const jobs = await this.getExportJobs(queryParams);
    return jobs;
  }

  @withSpanAsyncV4
  public async updateJobExpirationDate(jobId: string): Promise<void> {
    const newExpirationDate = getUTCDate();
    newExpirationDate.setDate(newExpirationDate.getDate() + this.expirationDays);
    const job = await this.getJob<ExportJobParameters, unknown>(jobId);
    const oldExpirationDate = new Date(job.parameters.cleanupDataParams?.cleanupExpirationTimeUTC as Date);
    if (oldExpirationDate < newExpirationDate) {
      this.logger.info({ msg: `updated expirationDate`, jobId, oldExpirationDate, newExpirationDate });
      await this.updateJob<ExportJobParameters>(jobId, {
        parameters: {
          ...job.parameters,
          cleanupDataParams: {
            ...job.parameters.cleanupDataParams,
            cleanupExpirationTimeUTC: newExpirationDate,
            directoryPath: job.parameters.cleanupDataParams?.directoryPath,
          },
        },
      });
    } else {
      const msg = `didn't update expiration date, as current expiration date is later than current expiration date`;
      this.logger.info({ msg, jobId, oldExpirationDate, newExpirationDate });
    }
  }

  @withSpanAsyncV4
  public async createExportJob(data: IExportInitRequest): Promise<ICreateExportJobResponse> {
    const expirationDate = getUTCDate();
    expirationDate.setDate(expirationDate.getDate() + this.expirationDays);
    const taskParams: ITaskParameters[] = [{ blockDuplication: true }];

    const jobParameters: ExportJobParameters = {
      exportInputParams: {
        roi: data.roi,
        callbackUrls: data.callbackUrls,
        crs: data.crs,
      },
      additionalParams: {
        fileNamesTemplates: data.fileNamesTemplates,
        relativeDirectoryPath: data.relativeDirectoryPath,
        packageRelativePath: data.packageRelativePath,
        gpkgEstimatedSize: data.gpkgEstimatedSize,
        targetFormat: data.targetFormat,
        outputFormatStrategy: data.outputFormatStrategy,
        jobTrackerServiceURL: data.jobTrackerUrl,
      },
      cleanupDataParams: {
        directoryPath: data.relativeDirectoryPath,
        cleanupExpirationTimeUTC: expirationDate,
      },
    };

    const createJobRequest: CreateExportJobBody = {
      resourceId: data.productId,
      version: data.version,
      type: this.exportJobType,
      domain: this.jobDomain,
      parameters: jobParameters,
      internalId: data.catalogId,
      productType: data.productType,
      priority: data.priority,
      description: data.description,
      status: OperationStatus.PENDING,
      percentage: 0,
      additionalIdentifiers: data.relativeDirectoryPath,
      tasks: taskParams.map((params) => {
        return {
          type: this.exportInitTaskType,
          parameters: params,
        };
      }),
    };
    const res = await this.createJob<ExportJobParameters, ITaskParameters>(createJobRequest);
    const createJobResponse: ICreateExportJobResponse = {
      jobId: res.id,
      status: OperationStatus.PENDING,
    };
    return createJobResponse;
  }

  @withSpanAsyncV4
  public async findAllProcessingExportJobs(shouldReturnTasks = false): Promise<JobExportResponse[]> {
    const criteria: IFindJobsByCriteriaBody = {
      isCleaned: false,
      types: [this.exportJobType],
      shouldReturnTasks,
      statuses: [OperationStatus.IN_PROGRESS, OperationStatus.PENDING],
      domain: this.jobDomain,
    };

    this.logger.debug({ msg: `Getting processing export jobs `, ...criteria });
    const jobs = await this.post<JobExportResponse[]>('/jobs/find', criteria);
    return jobs;
  }

  @withSpanAsyncV4
  private async getExportJobs(queryParams: IFindJobsRequest): Promise<JobExportResponse[] | undefined> {
    this.logger.debug({ msg: `Getting jobs that match these parameters`, ...queryParams });
    const jobs = await this.get<JobExportResponse[] | undefined>('/jobs', queryParams as unknown as Record<string, unknown>);
    if (jobs && jobs.length > 0) {
      const jobsWithParams = await Promise.all(jobs.map(async (job) => this.getJobByJobId(job.id)));
      return jobsWithParams;
    }
    return jobs;
  }
}
