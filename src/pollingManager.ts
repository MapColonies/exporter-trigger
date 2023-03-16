import config from 'config';
import { inject, singleton } from 'tsyringe';
import { Logger } from '@map-colonies/js-logger';
import { OperationStatus } from '@map-colonies/mc-priority-queue';
import { SERVICES } from './common/constants';
import { TasksManager } from './tasks/models/tasksManager';
import { QueueClient } from './clients/queueClient';
import { ITaskFinalizeParameters, JobFinalizeResponse } from './common/interfaces';

export const POLLING_MANGER_SYMBOL = Symbol('tasksFactory');

@singleton()
export class PollingManager {
  private readonly expirationDays: number;
  private readonly finalizeTaskType: string;
  private readonly finalizeAttempts: number;
  public constructor(
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(TasksManager) private readonly taskManager: TasksManager,
    private readonly queueClient: QueueClient
  ) {
    this.expirationDays = config.get<number>('jobManager.expirationDays');
    this.finalizeTaskType = config.get<string>('workerTypes.finalize.taskType');
    this.finalizeAttempts = config.get<number>('httpRetry.attempts');
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
        this.logger.info({ jobId: job.id, msg: `Execute completed job finalizing task creation on ROI exporting for job: ${job.id}` });
        await this.taskManager.createFinalizeTask(job, this.finalizeTaskType);
      }
    } else if (roiJobs.failedJobs && roiJobs.failedJobs.length > 0) {
      existsJobs = true;
      this.logger.debug({ msg: `ROI Failed jobs detected, running finalize job` });
      for (const job of roiJobs.failedJobs) {
        this.logger.info({ jobId: job.id, msg: `Execute failed job finalizing task creation on ROI exporting for job: ${job.id}` });
        const gpkgFailedErr = `failed to create gpkg, job: ${job.id}`;
        await this.taskManager.createFinalizeTask(job, this.finalizeTaskType, false, gpkgFailedErr);
      }
    }

    return existsJobs;
  }

  public async jobFinalizePoll(): Promise<boolean> {
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + this.expirationDays);

    const finalizeTask = await this.queueClient.queueHandlerForFinalizeTasks.dequeue<ITaskFinalizeParameters>(this.finalizeTaskType);
    if (finalizeTask) {
      const attempts = finalizeTask.attempts;
      const jobId = finalizeTask.jobId;
      const taskId = finalizeTask.id;
      try {
        this.logger.info({ jobId: finalizeTask.jobId, taskId: finalizeTask.id, msg: `Found new finalize task` });
        const job = (await this.taskManager.getFinalizeJobById(finalizeTask.jobId)) as JobFinalizeResponse;

        if (attempts <= this.finalizeAttempts) {
          const isSuccess = finalizeTask.parameters.exporterTaskStatus === OperationStatus.COMPLETED ? true : false;
          const errReason = finalizeTask.parameters.reason;
          await this.taskManager.finalizeExportJob(job, expirationDate, isSuccess, errReason);
          if (isSuccess) {
            this.logger.info({ jobId, taskId, msg: `success finalization. close task as completed` });
            await this.queueClient.queueHandlerForFinalizeTasks.ack(jobId, taskId);
          } else {
            this.logger.warn({ jobId, taskId, exportingErr: errReason, msg: `Failure exporting finalization, will execute finalize task deletion` });
            await this.queueClient.queueHandlerForFinalizeTasks.reject(jobId, taskId, false);
            await this.taskManager.deleteTaskById(jobId, taskId);
          }
          this.logger.info({ jobId, taskId, finalizingParams: { expirationDate, isSuccess, errReason }, msg: `Finish successfully finalizing job` });
        } else {
          this.logger.warn({ jobId, taskId, msg: `Failed finalizing job, reached to max attempts of ${attempts}\\${this.finalizeAttempts}` });
          await this.queueClient.queueHandlerForFinalizeTasks.reject(jobId, taskId, false);
        }
      } catch (error) {
        this.logger.error({ jobId, taskId, err: error, msg: `Failed finalizing job - [${(error as Error).message}]` });
        await this.queueClient.queueHandlerForFinalizeTasks.reject(jobId, taskId, false);
      }
    }
    return Boolean(finalizeTask);
  }
}
