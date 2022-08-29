import { Logger } from '@map-colonies/js-logger';
import { inject, injectable } from 'tsyringe';
import config from 'config';
import { IUpdateJobBody, OperationStatus } from '@map-colonies/mc-priority-queue';
import { NotFoundError } from '@map-colonies/error-types';
import { getGpkgFullPath, getGpkgRelativePath } from '../../common/utils';
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

  public async getJobsByTaskStatus(): Promise<IJobStatusResponse> {
    const jobs = await this.jobManagerClient.getJobsStatus();
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
          this.logger.error(`Did not send callback to ${targetCallbacks[index].url}, got error: ${JSON.stringify(response.reason)}`);
        }
      });
      return callbackParams;
    } catch (error) {
      this.logger.error(`Sending callback has failed with error: ${JSON.stringify(error, Object.getOwnPropertyNames(error))}`);
    }
  }

  public async finalizeJob(job: JobResponse, expirationDate: Date, isSuccess = true, reason?: string): Promise<void> {
    let updateJobParams: IUpdateJobBody<IJobParameters> = {
      status: isSuccess ? OperationStatus.COMPLETED : OperationStatus.FAILED,
      reason,
      /* eslint-disable-next-line @typescript-eslint/no-magic-numbers */
      percentage: isSuccess ? 100 : undefined,
      expirationDate: expirationDate,
    };
    try {
      this.logger.info(`Finzaling Job: ${job.id}`);
      const packageName = job.parameters.fileName;
      if (isSuccess) {
        const packageFullPath = getGpkgFullPath(this.gpkgsLocation, packageName);
        await this.packageManager.createJsonMetadata(packageFullPath.substr(0, packageFullPath.lastIndexOf('.')), job.internalId as string);
      }
      const callbackParams = await this.sendCallbacks(job, expirationDate, reason);
      updateJobParams = { ...updateJobParams, parameters: { ...job.parameters, callbackParams } };

      this.logger.info(`Update Job status to success=${String(isSuccess)} jobId=${job.id}`);
      await this.jobManagerClient.updateJob(job.id, updateJobParams);
    } catch (error) {
      this.logger.error(`Could not finalize job: ${job.id} updating failed job status, error: ${(error as Error).message}`);
      updateJobParams.status = OperationStatus.FAILED;
      await this.jobManagerClient.updateJob(job.id, updateJobParams);
    }
  }
}
