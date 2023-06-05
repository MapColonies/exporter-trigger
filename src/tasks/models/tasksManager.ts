import { Logger } from '@map-colonies/js-logger';
import { inject, injectable } from 'tsyringe';
import config from 'config';
import { IFindJobsRequest, IJobResponse, IUpdateJobBody, OperationStatus } from '@map-colonies/mc-priority-queue';
import { NotFoundError } from '@map-colonies/error-types';
import { concatFsPaths, getGpkgFullPath, getGpkgRelativePath } from '../../common/utils';
import { SERVICES } from '../../common/constants';
import { JobManagerWrapper } from '../../clients/jobManagerWrapper';
import {
  CreateFinalizeTaskBody,
  ICallbackData,
  ICallbackDataBase,
  ICallbackDataExportBase,
  ICallbackExportData,
  ICallbackExportResponse,
  ICleanupData,
  IExportJobStatusResponse,
  IJobExportParameters,
  IJobParameters,
  IJobStatusResponse,
  ILinkDefinition,
  ITaskFinalizeParameters,
  JobExportResponse,
  JobFinalizeResponse,
  JobResponse,
} from '../../common/interfaces';
import { CallbackClient } from '../../clients/callbackClient';
import { getFileSize } from '../../common/utils';
import { CreatePackageManager } from '../../createPackage/models/createPackageManager';

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
    @inject(CreatePackageManager) private readonly packageManager: CreatePackageManager
  ) {
    this.gpkgsLocation = config.get<string>('gpkgsLocation');
    this.downloadServerUrl = config.get<string>('downloadServerUrl');
    this.tilesJobType = config.get<string>('externalClientsConfig.exportJobAndTaskTypes.jobType');
  }

  /**
   * @deprecated GetMap API - will be deprecated on future
   */
  public async getJobsByTaskStatus(): Promise<IJobStatusResponse> {
    const jobs = await this.jobManagerClient.getInProgressJobs();
    const completedJobs = jobs?.filter((job) => job.completedTasks === job.taskCount);
    const failedJobs = jobs?.filter((job) => job.failedTasks === job.taskCount);
    const jobsStatus = {
      completedJobs: completedJobs,
      failedJobs: failedJobs,
    };
    return jobsStatus;
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

  /**
   * @deprecated GetMap API - will be deprecated on future
   */
  public async sendCallbacks(job: JobResponse, expirationDate: Date, errorReason?: string): Promise<ICallbackDataBase | undefined> {
    let fileUri = '';
    let fileRelativePath = '';
    try {
      this.logger.info(`Sending callback for job: ${job.id}`);
      const packageName = job.parameters.fileName;
      const success = errorReason === undefined;
      let fileSize = 0;
      if (success) {
        fileRelativePath = getGpkgRelativePath(packageName);
        const packageFullPath = getGpkgFullPath(this.gpkgsLocation, packageName);
        fileUri = `${this.downloadServerUrl}/downloads/${fileRelativePath}`;
        fileSize = await getFileSize(packageFullPath);
      }
      const callbackParams: ICallbackDataBase = {
        fileUri,
        expirationTime: expirationDate,
        fileSize,
        dbId: job.internalId as string,
        packageName: packageName,
        requestId: job.id,
        targetResolution: job.parameters.targetResolution,
        success,
        errorReason,
      };

      const targetCallbacks = job.parameters.callbacks;
      const callbackPromises: Promise<void>[] = [];
      for (const target of targetCallbacks) {
        const params: ICallbackData = { ...callbackParams, bbox: target.bbox };
        callbackPromises.push(this.callbackClient.send(target.url, params));
      }

      const promisesResponse = await Promise.allSettled(callbackPromises);
      promisesResponse.forEach((response, index) => {
        if (response.status === 'rejected') {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          this.logger.error({ reason: response.reason, url: targetCallbacks[index].url, jobId: job.id, msg: `Failed to send callback to url` });
        }
      });

      return callbackParams;
    } catch (error) {
      this.logger.error({ jobId: job.id, err: error, reason: (error as Error).message, msg: `Sending callback has failed` });
    }
  }

  public async sendExportCallbacks(job: JobExportResponse | JobFinalizeResponse, callbackParams: ICallbackDataExportBase | ICallbackExportResponse): Promise<void> {
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

  /**
   * @deprecated GetMap API - will be deprecated on future
   */
  public async finalizeJob(job: JobResponse, expirationDate: Date, isSuccess = true, reason?: string): Promise<void> {
    let updateJobParams: IUpdateJobBody<IJobParameters> = {
      status: isSuccess ? OperationStatus.COMPLETED : OperationStatus.FAILED,
      reason,
      /* eslint-disable-next-line @typescript-eslint/no-magic-numbers */
      percentage: isSuccess ? 100 : undefined,
    };

    const cleanupData: ICleanupData = this.generateCleanupEntity(job, expirationDate);

    try {
      this.logger.info({ jobId: job.id, msg: `GetMap Finalize Job` });
      const packageName = job.parameters.fileName;
      if (isSuccess) {
        const packageFullPath = getGpkgFullPath(this.gpkgsLocation, packageName);
        await this.packageManager.createJsonMetadata(packageFullPath, job);
      }
      const callbackParams = await this.sendCallbacks(job, expirationDate, reason);
      updateJobParams = { ...updateJobParams, parameters: { ...job.parameters, callbackParams, cleanupData } };

      this.logger.info({ jobId: job.id, status: isSuccess, msg: `GetMap Update Job status` });
      await this.jobManagerClient.updateJob(job.id, updateJobParams);
    } catch (error) {
      this.logger.error({
        jobId: job.id,
        err: error,
        errorReason: (error as Error).message,
        msg: `GetMap Could not finalize job, will updating to status failed`,
      });
      const callbackParams = await this.sendCallbacks(job, expirationDate, reason);
      updateJobParams = { ...updateJobParams, status: OperationStatus.FAILED, parameters: { ...job.parameters, callbackParams, cleanupData } };
      await this.jobManagerClient.updateJob(job.id, updateJobParams);
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

    await this.sendExportCallbacks(job, callbackParams);
    
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
    
    await this.sendExportCallbacks(job, callbackParams);

    this.logger.info({ reason, jobId: job.id, msg: `Updating job finalizing status for failure job` });
    const updateJobParams: IUpdateJobBody<IJobExportParameters> = {
      reason: reason,
      status: OperationStatus.FAILED,
      percentage: 0,
      parameters: { ...job.parameters, callbackParams, cleanupData },
    };

    return updateJobParams;
  }

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

  private generateCleanupEntity(job: JobResponse | JobExportResponse | JobFinalizeResponse, expirationDate: Date): ICleanupData {
    const cleanupData = { directoryPath: job.parameters.relativeDirectoryPath, cleanupExpirationTimeUTC: expirationDate };
    this.logger.info({ jobId: job.id, cleanupData, msg: `Generated new cleanupData param for job parameters` });
    return cleanupData;
  }

  private async generateCallbackParam(
    job: JobExportResponse | JobFinalizeResponse,
    expirationDate: Date,
    errorReason?: string
  ): Promise<ICallbackDataExportBase> {
    let links: ILinkDefinition = { ...job.parameters.fileNamesTemplates }; // default file names in case of failure
    this.logger.info({ jobId: job.id, msg: `generate callback body for job: ${job.id}` });

    const packageName = job.parameters.fileNamesTemplates.dataURI;
    const relativeFilesDirectory = job.parameters.relativeDirectoryPath;
    const success = errorReason === undefined;
    let fileSize = 0;
    if (success) {
      const packageFullPath = concatFsPaths(this.gpkgsLocation, relativeFilesDirectory, packageName);
      // Todo - link shouldn't be hard-coded for each of his parts! temporary before webhooks implementation
      links = {
        dataURI: `${this.downloadServerUrl}/downloads/${relativeFilesDirectory}/${job.parameters.fileNamesTemplates.dataURI}`,
        metadataURI: `${this.downloadServerUrl}/downloads/${relativeFilesDirectory}/${job.parameters.fileNamesTemplates.metadataURI}`,
      };
      try {
        fileSize = await getFileSize(packageFullPath);
      } catch (error) {
        this.logger.error({
          jobId: job.id,
          err: error,
          reason: `${(error as Error).message}`,
          msg: `failed to get gpkg file size from: ${packageFullPath}`,
        });
      }
    }
    const callbackParams: ICallbackDataExportBase = {
      links,
      expirationTime: expirationDate,
      fileSize,
      recordCatalogId: job.internalId as string,
      jobId: job.id,
      errorReason,
      description: job.description,
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
