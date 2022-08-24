import { Logger } from '@map-colonies/js-logger';
import { inject, injectable } from 'tsyringe';
import config from 'config';
import { IUpdateJobBody, OperationStatus } from '@map-colonies/mc-priority-queue';
import { NotFoundError } from '@map-colonies/error-types';
import { getGpkgFilePath } from '../../common/utils';
import { SERVICES } from '../../common/constants';
import { JobManagerWrapper } from '../../clients/jobManagerWrapper';
import { ICallbackData, ICallbackDataBase, IJobParameters, IJobStatusResponse, JobResponse } from '../../common/interfaces';
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
  private readonly expirationDate: number;
  public constructor(
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(JobManagerWrapper) private readonly jobManagerClient: JobManagerWrapper,
    @inject(CallbackClient) private readonly callbackClient: CallbackClient,
    @inject(CreatePackageManager) private readonly packageManager: CreatePackageManager
  ) {
    this.gpkgsLocation = config.get<string>('gpkgsLocation');
    this.expirationDate = config.get<number>('jobManager.expirationTime');
  }

  public async getJobsByTaskStatus(): Promise<IJobStatusResponse> {
    const jobs = await this.jobManagerClient.getJobsStatus();
    const completedJobs = jobs?.filter((job) => job.completedTasks === job.taskCount);
    const failedJobs = jobs?.filter((job) => job.failedTasks === job.taskCount);
    const jobsStatus = {
      completed: completedJobs,
      failed: failedJobs,
    };
    return jobsStatus;
  }

  // public async getJobsByCompletedTasks(): Promise<JobResponse[]> {
  //   const jobs = await this.jobManagerClient.getJobsStatus();
  //   const completedJobs = jobs?.filter((job) => (job.completedTasks === job.taskCount) || (job.failedTasks === job.taskCount));
  //   return completedJobs!;
  // }

  public async getTaskStatusByJobId(jobId: string): Promise<ITaskStatusResponse> {
    this.logger.info(`Getting task status by jobId: ${jobId}`);
    const tasks = await this.jobManagerClient.getTasksByJobId(jobId);

    if (tasks.length === 0) {
      throw new NotFoundError(`jobId: ${jobId} is not exists`);
    }
    const task = tasks[0];
    const statusResponse: ITaskStatusResponse = {
      percentage: task.percentage,
      status: task.status,
    };
    return statusResponse;
  }

  public async sendCallbacks(job: JobResponse, expirationDate: Date, errorReason?: string): Promise<ICallbackDataBase | undefined> {
    try {
      const downloadServerUrl = config.get('downloadServerUrl');
      const packageName = job.parameters.fileName as string;
      const fileUri = `${downloadServerUrl}/downloads/${packageName}`;
      const packageFullPath = getGpkgFilePath(this.gpkgsLocation, packageName);
      const success = errorReason === undefined;
      let fileSize = 0;
      if (success) {
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
          this.logger.error(`Did not send callback to ${targetCallbacks[index].url}, got error: ${JSON.stringify(response.reason)}`);
        }
      });
      return callbackParams;
    } catch (error) {
      this.logger.error(`Sending callbacks has failed with error: ${JSON.stringify(error, Object.getOwnPropertyNames(error))}`);
    }
  }

  public async finalizeJob(job: JobResponse, expirationDate: Date, isSuccess = true, reason?: string): Promise<void> {
    let updateJobParams: IUpdateJobBody<IJobParameters> = {
      status: isSuccess ? OperationStatus.COMPLETED : OperationStatus.FAILED,
      reason,
      percentage: isSuccess ? 100 : undefined,
      expirationDate: expirationDate,
    };
    try {
      if (isSuccess) {
        const packageName = job.parameters.fileName as string;
        const packageFullPath = getGpkgFilePath(this.gpkgsLocation, packageName);
        await this.packageManager.createJsonMetadata(packageFullPath.substr(0, packageFullPath.lastIndexOf('.')), job.internalId as string);
        const callbackParams = await this.sendCallbacks(job, expirationDate);
        updateJobParams = { ...updateJobParams, parameters: { ...job.parameters, callbackParams } };
      }
      this.logger.info(`Update Job status to success=${String(isSuccess)} jobId=${job.id}`);
      await this.jobManagerClient.updateJob(job.id, updateJobParams);
    } catch (error) {
      this.logger.error(`Could not finalize job: ${job.id} updating failed job status, error: ${error}`);
      updateJobParams.status = OperationStatus.FAILED;
      await this.jobManagerClient.updateJob(job.id, updateJobParams);
    }
  }
}
