import { Logger } from '@map-colonies/js-logger';
import { inject, injectable } from 'tsyringe';
import config from 'config';
import { IUpdateJobBody, OperationStatus } from '@map-colonies/mc-priority-queue';
import { NotFoundError } from '@map-colonies/error-types';
import { concatFsPaths, getGpkgFullPath, getGpkgRelativePath } from '../../common/utils';
import { SERVICES } from '../../common/constants';
import { JobManagerWrapper } from '../../clients/jobManagerWrapper';
import {
  ICallbackData,
  ICallbackDataBase,
  ICallbackDataExportBase,
  ICallbackExportData,
  ICallbackExportResponse,
  IExportJobStatusResponse,
  IJobExportParameters,
  IJobParameters,
  IJobStatusResponse,
  ILinkDefinition,
  JobExportResponse,
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
  public constructor(
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(JobManagerWrapper) private readonly jobManagerClient: JobManagerWrapper,
    @inject(CallbackClient) private readonly callbackClient: CallbackClient,
    @inject(CreatePackageManager) private readonly packageManager: CreatePackageManager
  ) {
    this.gpkgsLocation = config.get<string>('gpkgsLocation');
    this.downloadServerUrl = config.get<string>('downloadServerUrl');
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

  public async getExportJobsByTaskStatus(): Promise<IExportJobStatusResponse> {
    const jobs = await this.jobManagerClient.getInProgressExportJobs();
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
          this.logger.error({ reason: response.reason, url: targetCallbacks[index].url }, `Failed to send callback to url`);
        }
      });

      return callbackParams;
    } catch (error) {
      this.logger.error(error, `Sending callback has failed`);
    }
  }

  public async sendExportCallbacks(job: JobExportResponse, callbackParams: ICallbackDataExportBase): Promise<void> {
    try {
      this.logger.info({ ...job, msg: `Sending callback for job: ${job.id}` });
      const targetCallbacks = job.parameters.callbacks;
      const callbackPromises: Promise<void>[] = [];
      for (const target of targetCallbacks) {
        const params: ICallbackExportData = { ...callbackParams, roi: job.parameters.roi };
        callbackPromises.push(this.callbackClient.send(target.url, params));
      }

      const promisesResponse = await Promise.allSettled(callbackPromises);
      promisesResponse.forEach((response, index) => {
        if (response.status === 'rejected') {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          this.logger.error({ reason: response.reason, url: targetCallbacks[index].url }, `Failed to send callback to url`);
        }
      });
    } catch (error) {
      this.logger.error(error, `Sending callback has failed for job: ${job.id}`);
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
      expirationDate: expirationDate,
    };
    try {
      this.logger.info(`Finalize Job: ${job.id}`);
      const packageName = job.parameters.fileName;
      if (isSuccess) {
        const packageFullPath = getGpkgFullPath(this.gpkgsLocation, packageName);
        await this.packageManager.createJsonMetadata(packageFullPath, job);
      }
      const callbackParams = await this.sendCallbacks(job, expirationDate, reason);
      updateJobParams = { ...updateJobParams, parameters: { ...job.parameters, callbackParams } };

      this.logger.info(`Update Job status to success=${String(isSuccess)} jobId=${job.id}`);
      await this.jobManagerClient.updateJob(job.id, updateJobParams);
    } catch (error) {
      this.logger.error(`Could not finalize job: ${job.id} updating failed job status, error: ${(error as Error).message}`);
      const callbackParams = await this.sendCallbacks(job, expirationDate, reason);
      updateJobParams = { ...updateJobParams, status: OperationStatus.FAILED, parameters: { ...job.parameters, callbackParams } };
      await this.jobManagerClient.updateJob(job.id, updateJobParams);
    }
  }

  public async finalizeExportJob(job: JobExportResponse, expirationDate: Date, isSuccess = true, reason?: string): Promise<void> {
    let updateJobParams: IUpdateJobBody<IJobExportParameters> = {
      reason,
      /* eslint-disable-next-line @typescript-eslint/no-magic-numbers */
      percentage: isSuccess ? 100 : undefined,
      status: isSuccess ? OperationStatus.COMPLETED : OperationStatus.FAILED,
      expirationDate: expirationDate,
    };
    try {
      this.logger.info({ jobId: job.id, isSuccess, msg: `Finalize Job` });
      if (isSuccess) {
        await this.packageManager.createExportJsonMetadata(job); // todo - should we make job to be failed if gpkg exists but not metadata?
      }

      // create and sending response to callbacks
      const callbackSendParams = await this.generateCallbackParam(job, expirationDate, reason);
      await this.sendExportCallbacks(job, callbackSendParams);

      // generate job finally completion with webhook (callback param) data
      let finalizeStatus = OperationStatus.COMPLETED;

      if (reason !== undefined) {
        finalizeStatus = OperationStatus.FAILED;
      }

      const callbackParams: ICallbackExportResponse = {
        ...callbackSendParams,
        roi: job.parameters.roi,
        status: finalizeStatus,
        errorReason: reason,
      };

      updateJobParams = { ...updateJobParams, parameters: { ...job.parameters, callbackParams } };
      this.logger.info(`Update Job status to ${finalizeStatus} jobId=${job.id}`);
      // if (reason == null) {
      //   // todo - don't forget to define cases when failed \ completed

      //   const callbackParams: ICallbackExportResponse = {
      //     ...callbackSendParams,
      //     roi: job.parameters.roi,
      //     status: OperationStatus.COMPLETED,
      //     errorReason: reason,
      //   };
      // updateJobParams = { ...updateJobParams, parameters: { ...job.parameters, callbackParams } };
      // this.logger.info(`Update Job status to ${OperationStatus.COMPLETED} jobId=${job.id}`);
      // } else {
      // updateJobParams = { ...updateJobParams, status: OperationStatus.FAILED };
      // this.logger.info(`Update Job status to ${OperationStatus.FAILED} jobId=${job.id}`);
      // }

      // await this.jobManagerClient.updateJob(job.id, updateJobParams);
    } catch (error) {
      this.logger.error(`Could not finalize job: ${job.id} updating failed job status, error: ${(error as Error).message}`);
      updateJobParams = { ...updateJobParams, status: OperationStatus.FAILED };
    } finally {
      await this.jobManagerClient.updateJob(job.id, updateJobParams);
    }
  }

  private async generateCallbackParam(job: JobExportResponse, expirationDate: Date, errorReason?: string): Promise<ICallbackDataExportBase> {
    let links: ILinkDefinition = { ...job.parameters.fileNamesTemplates }; // default file names in case of failure
    this.logger.info({ ...job, msg: `generate callback body for job: ${job.id}` });

    const packageName = job.parameters.fileNamesTemplates.dataURI;
    const relativeFilesDirectory = job.parameters.relativeDirectoryPath;
    const success = errorReason === undefined;
    let fileSize = 0;
    if (success) {
      const packageFullPath = concatFsPaths(this.gpkgsLocation, relativeFilesDirectory, packageName);
      // const packageFullPath = getGpkgFullPath(this.gpkgsLocation, packageName);
      // Todo - link shouldn't be hard-coded for each of his parts! temporary before webhooks implementation
      links = {
        dataURI: `${this.downloadServerUrl}/downloads/${relativeFilesDirectory}/${job.parameters.fileNamesTemplates.dataURI}`,
        metadataURI: `${this.downloadServerUrl}/downloads/${relativeFilesDirectory}/${job.parameters.fileNamesTemplates.metadataURI}`,
      };
      try {
        fileSize = await getFileSize(packageFullPath);
      } catch {
        this.logger.error({ msg: `failed getting gpkg file size to ${packageFullPath}` });
      }
    }
    const callbackParams: ICallbackDataExportBase = {
      links,
      expirationTime: expirationDate,
      fileSize,
      recordCatalogId: job.internalId as string,
      requestJobId: job.id,
      errorReason,
    };
    this.logger.info({ ...callbackParams, msg: `Finish generating callbackParams for job: ${job.id}` });
    return callbackParams;
  }
}
