import config from 'config';
import { inject, singleton } from 'tsyringe';
import { Logger } from '@map-colonies/js-logger';
import { SERVICES } from './common/constants';
import { TasksManager } from './tasks/models/tasksManager';
import { JobResponse } from './common/interfaces';

export const POLLING_MANGER_SYMBOL = Symbol('tasksFactory');

@singleton()
export class PollingManager {
  private readonly expirationDays: number;

  public constructor(@inject(SERVICES.LOGGER) private readonly logger: Logger, @inject(TasksManager) private readonly taskManager: TasksManager) {
    this.expirationDays = config.get<number>('jobManager.expirationDays');
  }

  public async jobStatusPoll(): Promise<boolean> {
    let existsJobs = false;
    const jobs = await this.taskManager.getJobsByTaskStatus();
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + this.expirationDays);
    if ((jobs.completedJobs?.length ?? 0) > 0) {
      existsJobs = true;
      this.logger.info(`completed jobs detected, running finalize job`);
      for (const job of jobs.completedJobs as JobResponse[]) {
        await this.taskManager.finalizeJob(job, expirationDate);
      }
    } else if ((jobs.failedJobs?.length ?? 0) > 0) {
      existsJobs = true;
      this.logger.info(`failed jobs detected, updating job status`);
      for (const job of jobs.failedJobs as JobResponse[]) {
        const gpkgFailedErr = `failed to create gpkg, job: ${job.id}`;
        await this.taskManager.finalizeJob(job, expirationDate, false, gpkgFailedErr);
      }
    }
    return existsJobs;
  }
}