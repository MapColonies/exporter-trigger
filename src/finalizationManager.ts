import config from 'config';
import { inject, singleton } from 'tsyringe';
import { Logger } from '@map-colonies/js-logger';
import { OperationStatus } from '@map-colonies/mc-priority-queue';
import { getUTCDate } from '@map-colonies/mc-utils';
import { SERVICES } from './common/constants';
import { TasksManager } from './tasks/models/tasksManager';
import { QueueClient } from './clients/queueClient';
import { ITaskFinalizeParameters, JobFinalizeResponse } from './common/interfaces';
import { JobManagerWrapper } from './clients/jobManagerWrapper';

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
    @inject(JobManagerWrapper) private readonly jobManagerClient: JobManagerWrapper
  ) {
    this.expirationDays = config.get<number>('externalClientsConfig.clientsUrls.jobManager.cleanupExpirationDays');
    this.finalizeTaskType = config.get<string>('externalClientsConfig.workerTypes.finalize.taskType');
    this.finalizeAttempts = config.get<number>('externalClientsConfig.httpRetry.attempts');
  }

  public async jobStatusPoll(): Promise<boolean> {
    let existsJobs = false;

    const getMapJobs = await this.taskManager.getJobsByTaskStatus(); // for old getmap api - will be removed
    const roiJobs = await this.taskManager.getExportJobsByTaskStatus(); // new api by roi,
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + this.expirationDays);
    this.logger.debug({ ...getMapJobs, msg: `Handling GetMap jobs` });
    if (getMapJobs.completedJobs && getMapJobs.completedJobs.length > 0) {
      existsJobs = true;
      this.logger.debug({ msg: `GETMAP Completed GetMap jobs detected, running finalize job` });
      for (const job of getMapJobs.completedJobs) {
        this.logger.info({ jobId: job.id, msg: `GETMAP Execute completed job finalizing on BBOX (GetMap) exporting for job: ${job.id}` });
        await this.taskManager.finalizeJob(job, expirationDate);
      }
    } else if (getMapJobs.failedJobs && getMapJobs.failedJobs.length > 0) {
      existsJobs = true;
      this.logger.debug({ msg: `GETMAP Failed jobs detected, running finalize job` });
      for (const job of getMapJobs.failedJobs) {
        this.logger.info({ jobId: job.id, msg: `GETMAP Execute Failed job finalizing on BBOX (GetMap) exporting for job: ${job.id}` });
        const gpkgFailedErr = `failed to create gpkg, job: ${job.id}`;
        await this.taskManager.finalizeJob(job, expirationDate, false, gpkgFailedErr);
      }
    }

    this.logger.debug({ ...roiJobs, msg: `Handling ROI jobs` });
    if (roiJobs.completedJobs && roiJobs.completedJobs.length > 0) {
      existsJobs = true;
      this.logger.debug({ msg: `ROI Completed jobs detected, running finalize job` });
      for (const job of roiJobs.completedJobs) {
        await this.taskManager.createFinalizeTask(job, this.finalizeTaskType);
      }
    } else if (roiJobs.failedJobs && roiJobs.failedJobs.length > 0) {
      existsJobs = true;
      this.logger.debug({ msg: `ROI Failed jobs detected, running finalize job` });
      for (const job of roiJobs.failedJobs) {
        const gpkgFailedErr = `failed to create gpkg, job: ${job.id}`;
        await this.taskManager.createFinalizeTask(job, this.finalizeTaskType, false, gpkgFailedErr);
      }
    }

    return existsJobs;
  }

  public async jobFinalizePoll(): Promise<boolean> {
    const finalizeTask = await this.queueClient.queueHandlerForFinalizeTasks.dequeue<ITaskFinalizeParameters>(this.finalizeTaskType);
    if (!finalizeTask) {
      return false;
    }
    const attempts = finalizeTask.attempts;
    const jobId = finalizeTask.jobId;
    const taskId = finalizeTask.id;
    try {
      this.logger.info({ jobId: finalizeTask.jobId, taskId: finalizeTask.id, msg: `Found new finalize task` });
      const job = (await this.taskManager.getFinalizeJobById(finalizeTask.jobId)) as JobFinalizeResponse;
      if (attempts <= this.finalizeAttempts) {
        const expirationDateUtc = getUTCDate();
        expirationDateUtc.setDate(expirationDateUtc.getDate() + this.expirationDays);
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
          } else {
            this.logger.info({
              jobId,
              taskId,
              msg: `failed on finalization. reject and increase attempts to task`,
            });
            await this.queueClient.queueHandlerForFinalizeTasks.reject(jobId, taskId, true);
          }
        } else {
          this.logger.warn({ jobId, taskId, exportingErr: errReason, msg: `Failure exporting finalization, will execute finalize task deletion` });
          errReason = errReason ?? 'Failed on GPKG creation';
          const updateJobResults = await this.taskManager.finalizeGPKGFailure(job, expirationDateUtc, errReason);
          await this.queueClient.queueHandlerForFinalizeTasks.ack(jobId, taskId);
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
      }
    } catch (error) {
      // close the task if exception accrued
      this.logger.error({ jobId, taskId, err: error, msg: `Failed finalizing job - [${(error as Error).message}]` });
      await this.queueClient.queueHandlerForFinalizeTasks.reject(jobId, taskId, true);
    }
    return true;
  }
}
