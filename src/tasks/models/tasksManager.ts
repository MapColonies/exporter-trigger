import { Logger } from '@map-colonies/js-logger';
import { inject, injectable } from 'tsyringe';
import config from 'config';
import { IFindJobsRequest, IJobResponse, IUpdateJobBody, OperationStatus } from '@map-colonies/mc-priority-queue';
import { NotFoundError } from '@map-colonies/error-types';
import { withSpanAsyncV4 } from '@map-colonies/telemetry';
import { Tracer } from '@opentelemetry/api';
import { concatFsPaths } from '../../common/utils';
import { SERVICES } from '../../common/constants';
import { JobManagerWrapper } from '../../clients/jobManagerWrapper';
import {
  CreateFinalizeTaskBody,
  IArtifactDefinition,
  ICallbackExportData,
  ICallbackExportResponse,
  ICleanupData,
  IExportJobStatusResponse,
  IJobExportParameters,
  ILinkDefinition,
  ITaskFinalizeParameters,
  JobExportResponse,
  JobFinalizeResponse,
} from '../../common/interfaces';
import { CallbackClient } from '../../clients/callbackClient';
import { getFileSize } from '../../common/utils';
import { CreatePackageManager } from '../../createPackage/models/createPackageManager';
import { ArtifactType } from '../../common/enums';

export interface ITaskStatusResponse {
  percentage: number | undefined;
  status: OperationStatus;
}

@injectable()
export class TasksManager {
  private readonly gpkgsLocation: string;
  private readonly downloadServerUrl: string;
  private readonly tilesJobType: string;
  public constructor(
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(JobManagerWrapper) private readonly jobManagerClient: JobManagerWrapper,
    @inject(CallbackClient) private readonly callbackClient: CallbackClient,
    @inject(CreatePackageManager) private readonly packageManager: CreatePackageManager,
    @inject(SERVICES.TRACER) public readonly tracer: Tracer
  ) {
    this.gpkgsLocation = config.get<string>('gpkgsLocation');
    this.downloadServerUrl = config.get<string>('downloadServerUrl');
    this.tilesJobType = config.get<string>('externalClientsConfig.exportJobAndTaskTypes.jobType');
  }

  @withSpanAsyncV4
  public async getTaskStatusByJobId(jobId: string): Promise<ITaskStatusResponse> {
    const tasks = await this.jobManagerClient.getTasksByJobId(jobId);

    if (tasks.length === 0) {
      throw new NotFoundError(`No tasks were found for jobId: ${jobId}`);
    }
    const task = tasks[0];
    const statusResponse: ITaskStatusResponse = {
      percentage: task.percentage,
      status: task.status,
    };
    return statusResponse;
  }

  @withSpanAsyncV4
  public async createFinalizeTask(job: JobExportResponse, taskType: string, isSuccess = true, reason?: string): Promise<void> {
    const operationStatus = isSuccess ? OperationStatus.COMPLETED : OperationStatus.FAILED;
    this.logger.info({ jobId: job.id, operationStatus, msg: `create finalize task` });
    const taskParameters: ITaskFinalizeParameters = {
      reason,
      exporterTaskStatus: operationStatus,
    };

    const createTaskRequest: CreateFinalizeTaskBody = {
      type: taskType,
      parameters: taskParameters,
      status: OperationStatus.PENDING,
      blockDuplication: true,
    };
    //to protect race condition of multi-triggers, protection on crash while enqueue same task
    try {
      await this.jobManagerClient.enqueueTask(job.id, createTaskRequest);
    } catch (error) {
      this.logger.warn({ jobId: job.id, err: error, msg: `failed to create new finalize task` });
    }
  }

  public async getFinalizeJobById(jobId: string): Promise<IJobResponse<IJobExportParameters, ITaskFinalizeParameters>> {
    const job = await this.jobManagerClient.getJob<IJobExportParameters, ITaskFinalizeParameters>(jobId);
    return job;
  }

  public async getExportJobsByTaskStatus(): Promise<IExportJobStatusResponse> {
    const queryParams: IFindJobsRequest = {
      isCleaned: false,
      type: this.tilesJobType,
      shouldReturnTasks: false,
      status: OperationStatus.IN_PROGRESS,
    };
    const jobs = await this.jobManagerClient.getExportJobs(queryParams);
    const completedJobs = jobs?.filter((job) => job.completedTasks === job.taskCount);
    const failedJobs = jobs?.filter((job) => job.failedTasks === job.taskCount);
    const jobsStatus = {
      completedJobs: completedJobs,
      failedJobs: failedJobs,
    };
    return jobsStatus;
  }

  public async sendExportCallbacks(job: JobExportResponse | JobFinalizeResponse, callbackParams: ICallbackExportData): Promise<void> {
    try {
      this.logger.info({ jobId: job.id, callbacks: job.parameters.callbacks, msg: `Sending callback for job: ${job.id}` });
      const targetCallbacks = job.parameters.callbacks;
      if (!targetCallbacks) {
        return;
      }
      const callbackPromises: Promise<void>[] = [];
      for (const target of targetCallbacks) {
        const params: ICallbackExportData = { ...callbackParams, roi: job.parameters.roi };
        callbackPromises.push(this.callbackClient.send(target.url, params));
      }

      const promisesResponse = await Promise.allSettled(callbackPromises);
      promisesResponse.forEach((response, index) => {
        if (response.status === 'rejected') {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          this.logger.error({ reason: response.reason, url: targetCallbacks[index].url, jobId: job.id, msg: `Failed to send callback to url` });
        }
      });
    } catch (error) {
      this.logger.error({ err: error, callbacksUrls: job.parameters.callbacks, jobId: job.id, msg: `Sending callback has failed` });
    }
  }

  public async finalizeGPKGSuccess(job: JobFinalizeResponse, expirationDateUTC: Date): Promise<IUpdateJobBody<IJobExportParameters>> {
    // initialization to mutual finalized params
    const cleanupData: ICleanupData = this.generateCleanupEntity(job, expirationDateUTC);
    let reason = undefined;
    let finalizeStatus = OperationStatus.COMPLETED;

    this.logger.info({ jobId: job.id, msg: `Finalizing successful GPKG creation task` });
    const successMetadataCreation = await this.packageManager.createExportJsonMetadata(job);
    if (!successMetadataCreation) {
      reason = 'Failed on metadata.json creation';
      finalizeStatus = OperationStatus.FAILED;
      this.logger.error({ jobId: job.id, err: reason, finalizeStatus, msg: `Failed on metadata.json creation, Could not finalize success job` });
    }

    // create and sending response to callbacks
    const callbackSendParams = await this.generateCallbackParam(job, expirationDateUTC, reason);

    const callbackParams: ICallbackExportResponse = {
      ...callbackSendParams,
      roi: job.parameters.roi,
      status: finalizeStatus,
      errorReason: reason,
    };

    // todo - marked, callback will send only after job completed
    // await this.sendExportCallbacks(job, callbackParams);

    this.logger.info({ finalizeStatus, jobId: job.id, msg: `Updating job finalizing status` });
    const updateJobParams = {
      reason: reason ?? undefined,
      status: finalizeStatus,
      // eslint-disable-next-line @typescript-eslint/no-magic-numbers
      percentage: finalizeStatus === OperationStatus.COMPLETED ? 100 : 0,
      parameters: { ...job.parameters, callbackParams, cleanupData },
    };

    return updateJobParams;
  }

  public async finalizeGPKGFailure(job: JobFinalizeResponse, expirationDateUTC: Date, reason: string): Promise<IUpdateJobBody<IJobExportParameters>> {
    const cleanupData: ICleanupData = this.generateCleanupEntity(job, expirationDateUTC);

    // generate job finally completion with webhook (callback param) data
    this.logger.info({ jobId: job.id, msg: `Finalizing failure GPKG creation task` });
    // create and sending response to callbacks
    const callbackSendParams = await this.generateCallbackParam(job, expirationDateUTC, reason);

    const callbackParams: ICallbackExportResponse = {
      ...callbackSendParams,
      roi: job.parameters.roi,
      status: OperationStatus.FAILED,
      errorReason: reason,
    };

    // todo - marked, callback will send only after job completed
    // await this.sendExportCallbacks(job, callbackParams);

    this.logger.info({ reason, jobId: job.id, msg: `Updating job finalizing status for failure job` });
    const updateJobParams: IUpdateJobBody<IJobExportParameters> = {
      reason: reason,
      status: OperationStatus.FAILED,
      percentage: 0,
      parameters: { ...job.parameters, callbackParams, cleanupData },
    };

    return updateJobParams;
  }

  private generateCleanupEntity(job: JobExportResponse | JobFinalizeResponse, expirationDate: Date): ICleanupData {
    const cleanupData = { directoryPath: job.parameters.relativeDirectoryPath, cleanupExpirationTimeUTC: expirationDate };
    this.logger.info({ jobId: job.id, cleanupData, msg: `Generated new cleanupData param for job parameters` });
    return cleanupData;
  }

  // todo - refactor after first integration with mutual export - to suite the real webhook interface
  private async generateCallbackParam(
    job: JobExportResponse | JobFinalizeResponse,
    expirationDate: Date,
    errorReason?: string
  ): Promise<ICallbackExportData> {
    let links: ILinkDefinition = { ...job.parameters.fileNamesTemplates }; // default file names in case of failure
    this.logger.info({ jobId: job.id, msg: `generate callback body for job: ${job.id}` });

    const packageName = job.parameters.fileNamesTemplates.dataURI;
    const metadataName = job.parameters.fileNamesTemplates.metadataURI;
    const relativeFilesDirectory = job.parameters.relativeDirectoryPath;
    const success = errorReason === undefined;
    let fileSize = 0;
    let metadataSize = 0;
    if (success) {
      const packageFullPath = concatFsPaths(this.gpkgsLocation, relativeFilesDirectory, packageName);
      const metadataFullPath = concatFsPaths(this.gpkgsLocation, relativeFilesDirectory, metadataName);
      // Todo - link shouldn't be hard-coded for each of his parts! temporary before webhooks implementation
      links = {
        dataURI: `${this.downloadServerUrl}/downloads/${relativeFilesDirectory}/${job.parameters.fileNamesTemplates.dataURI}`,
        metadataURI: `${this.downloadServerUrl}/downloads/${relativeFilesDirectory}/${job.parameters.fileNamesTemplates.metadataURI}`,
      };
      try {
        // todo - remove on future - not in use
        fileSize = await getFileSize(packageFullPath);
        metadataSize = await getFileSize(metadataFullPath);
      } catch (error) {
        this.logger.error({
          jobId: job.id,
          err: error,
          reason: `${(error as Error).message}`,
          msg: `failed to get gpkg file size from: ${packageFullPath}`,
        });
      }
    }

    const artifacts: IArtifactDefinition[] = [
      {
        name: job.parameters.fileNamesTemplates.dataURI,
        url: success ? links.dataURI : undefined,
        size: fileSize,
        type: ArtifactType.GPKG,
      },
      {
        name: job.parameters.fileNamesTemplates.metadataURI,
        url: success ? links.metadataURI : undefined,
        size: metadataSize,
        type: ArtifactType.METADATA,
      },
    ];

    const callbackParams: ICallbackExportData = {
      links,
      expirationTime: expirationDate,
      fileSize,
      recordCatalogId: job.internalId as string,
      jobId: job.id,
      errorReason,
      description: job.description,
      artifacts,
      roi: {
        type: 'FeatureCollection',
        features: [],
      },
    };
    this.logger.info({
      links: callbackParams.links,
      gpkgSize: callbackParams.fileSize,
      catalogId: callbackParams.recordCatalogId,
      jobId: job.id,
      msg: `Finish generating callbackParams for job: ${job.id}`,
    });
    this.logger.debug({ ...callbackParams, msg: `full callbackParam data` });
    return callbackParams;
  }
}
