import config from 'config';
import { inject, singleton } from 'tsyringe';
import { Logger } from '@map-colonies/js-logger';
import { OperationStatus } from '@map-colonies/mc-priority-queue';
import { getUTCDate } from '@map-colonies/mc-utils';
import { SERVICES } from './common/constants';
import { TasksManager } from './tasks/models/tasksManager';
import { QueueClient } from './clients/queueClient';
import { ICallbackDataExportBase, ICallbackExportData, ICallbackExportResponse, ITaskFinalizeParameters, JobExportResponse, JobFinalizeResponse } from './common/interfaces';
import { JobManagerWrapper } from './clients/jobManagerWrapper';
import { CallbackClient } from './clients/callbackClient';

export const FINALIZATION_MANGER_SYMBOL = Symbol('tasksFactory');

@singleton()
export class FinalizationManager {
  private readonly expirationDays: number;
  private readonly finalizeTaskType: string;
  private readonly finalizeAttempts: number;
  public constructor(
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(TasksManager) private readonly taskManager: TasksManager,
    @inject(QueueClient) private readonly queueClient: QueueClient,
    @inject(CallbackClient) private readonly callbackClient: CallbackClient,
    @inject(JobManagerWrapper) private readonly jobManagerClient: JobManagerWrapper
  ) {
    this.expirationDays = config.get<number>('cleanupExpirationDays');
    this.finalizeTaskType = config.get<string>('externalClientsConfig.exportJobAndTaskTypes.taskFinalizeType');
    this.finalizeAttempts = config.get<number>('externalClientsConfig.clientsUrls.jobManager.finalizeTasksAttempts');
  }

  public async sendExportCallbacks(
    job: JobExportResponse | JobFinalizeResponse,
    callbackParams: ICallbackDataExportBase | ICallbackExportResponse
  ): Promise<void> {
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

  public async jobFinalizePoll(): Promise<boolean> {
    const finalizeTask = await this.queueClient.queueHandlerForFinalizeTasks.dequeue<ITaskFinalizeParameters>(this.finalizeTaskType);
    if (!finalizeTask) {
      return false;
    }
    const expirationDateUtc = getUTCDate();
        expirationDateUtc.setDate(expirationDateUtc.getDate() + this.expirationDays);
    try {
      const attempts = finalizeTask.attempts;
      const jobId = finalizeTask.jobId;
      const taskId = finalizeTask.id;
      this.logger.info({ jobId, taskId, msg: `Found new finalize task for jobId: ${jobId}` });
      const job = await this.taskManager.getFinalizeJobById(jobId);
      if (attempts <= this.finalizeAttempts) {
        
        const isSuccess = finalizeTask.parameters.exporterTaskStatus === OperationStatus.COMPLETED ? true : false;
        let errReason = finalizeTask.parameters.reason;

        // finalizing job-task by exporting state [gpkg created or not]
        if (isSuccess) {
          const updateJobResults = await this.taskManager.finalizeGPKGSuccess(job, expirationDateUtc);
          // decide if close job-task as completed and finish, or failure in metadata generation and increase attempts only
          if (updateJobResults.status == OperationStatus.COMPLETED) {
            await this.queueClient.queueHandlerForFinalizeTasks.ack(jobId, taskId);
            await this.jobManagerClient.updateJob(job.id, updateJobResults);
            this.logger.info({
              jobId,
              taskId,
              msg: `success finalization. close task as completed, job closed as ${updateJobResults.status as OperationStatus}`,
            });

          await this.sendExportCallbacks(job, updateJobResults.parameters?.callbackParams as ICallbackExportResponse);
          } else {
            this.logger.info({
              jobId,
              taskId,
              msg: `failed on finalization. reject and increase attempts to task`,
            });
            await this.queueClient.queueHandlerForFinalizeTasks.reject(jobId, taskId, true);
          }
        } else {
          this.logger.info({ jobId, taskId, exportingErr: errReason, msg: `Failure exporting finalization, will execute finalize task deletion` });
          errReason = errReason ?? 'Failed on GPKG creation';
          const updateJobResults = await this.taskManager.finalizeGPKGFailure(job, expirationDateUtc, errReason);
          await this.queueClient.queueHandlerForFinalizeTasks.ack(jobId, taskId);
          await this.sendExportCallbacks(job, updateJobResults.parameters?.callbackParams as ICallbackExportResponse);
          await this.jobManagerClient.updateJob(job.id, updateJobResults);
          await this.jobManagerClient.deleteTaskById(jobId, taskId);
          this.logger.info({
            jobId,
            taskId,
            finalizingParams: { expirationDateUtc, isSuccess, errReason },
            msg: `failure finalization. close task as completed, job closed as ${updateJobResults.status as OperationStatus}`,
          });
        }
        // finalizing only task - reached to max attempts
      } else {
        this.logger.warn({ jobId, taskId, msg: `Failed finalizing job, reached to max attempts of ${attempts}\\${this.finalizeAttempts}` });
        await this.queueClient.queueHandlerForFinalizeTasks.reject(jobId, taskId, false);
        await this.jobManagerClient.updateJob(job.id, { status: OperationStatus.FAILED, percentage: undefined });
        
        const failedCallback:ICallbackExportResponse = {
          expirationTime: expirationDateUtc,
          roi: job.parameters.roi,
          status: OperationStatus.FAILED,
          recordCatalogId: job.internalId as string,
          jobId: job.id,
          errorReason: finalizeTask.reason,
        }
        await this.sendExportCallbacks(job, failedCallback);
      }
    } catch (error) {
      // close the task if exception accrued
      this.logger.error({
        jobId: finalizeTask.jobId,
        taskId: finalizeTask.id,
        err: error,
        msg: `Failed finalizing job - [${(error as Error).message}]`,
      });
      await this.queueClient.queueHandlerForFinalizeTasks.reject(finalizeTask.jobId, finalizeTask.id, true);
    }
    return true;
  }

  public async jobStatusPoll(): Promise<boolean> {
    const getMapExistsJobs = await this.handleGetMapJobs();
    const roiExistsJobs = await this.handleROIJobs();
    return getMapExistsJobs || roiExistsJobs;
  }

  private async handleGetMapJobs(): Promise<boolean> {
    let existsJobs = false;
    const getMapJobs = await this.taskManager.getJobsByTaskStatus(); // for old getmap api - will be removed
    const expirationDateUTC = getUTCDate();
    expirationDateUTC.setDate(expirationDateUTC.getDate() + this.expirationDays);
    this.logger.debug({ ...getMapJobs, msg: `Handling GetMap jobs` });
    if (getMapJobs.completedJobs && getMapJobs.completedJobs.length > 0) {
      existsJobs = true;
      this.logger.info({ msg: `GETMAP Completed GetMap jobs detected, running finalize job` });
      for (const job of getMapJobs.completedJobs) {
        this.logger.info({ jobId: job.id, msg: `GETMAP Execute completed job finalizing on BBOX (GetMap) exporting for job: ${job.id}` });
        await this.taskManager.finalizeJob(job, expirationDateUTC);
      }
    } else if (getMapJobs.failedJobs && getMapJobs.failedJobs.length > 0) {
      existsJobs = true;
      this.logger.info({ msg: `GETMAP Failed jobs detected, running finalize job` });
      for (const job of getMapJobs.failedJobs) {
        this.logger.info({ jobId: job.id, msg: `GETMAP Execute Failed job finalizing on BBOX (GetMap) exporting for job: ${job.id}` });
        const gpkgFailedErr = `failed to create gpkg, job: ${job.id}`;
        await this.taskManager.finalizeJob(job, expirationDateUTC, false, gpkgFailedErr);
      }
    }
    return existsJobs;
  }

  private async handleROIJobs(): Promise<boolean> {
    let existsJobs = false;
    const roiJobs = await this.taskManager.getExportJobsByTaskStatus(); // new api by roi,
    this.logger.debug({ ...roiJobs, msg: `Handling ROI jobs` });
    if (roiJobs.completedJobs && roiJobs.completedJobs.length > 0) {
      existsJobs = true;
      this.logger.info({ msg: `ROI Completed jobs detected, running finalize job` });
      for (const job of roiJobs.completedJobs) {
        await this.taskManager.createFinalizeTask(job, this.finalizeTaskType);
      }
    } else if (roiJobs.failedJobs && roiJobs.failedJobs.length > 0) {
      existsJobs = true;
      this.logger.info({ msg: `ROI Failed jobs detected, running finalize job` });
      for (const job of roiJobs.failedJobs) {
        const gpkgFailedErr = `failed to create gpkg, job: ${job.id}`;
        await this.taskManager.createFinalizeTask(job, this.finalizeTaskType, false, gpkgFailedErr);
      }
    }
    return existsJobs;
  }
}
