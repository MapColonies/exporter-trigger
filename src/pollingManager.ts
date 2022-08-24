import config from 'config';
import { inject, singleton } from 'tsyringe';
import { Logger } from '@map-colonies/js-logger';
import { SERVICES } from './common/constants';
import { TasksManager } from './tasks/models/tasksManager';

export const POLLING_MANGER_SYMBOL = Symbol('tasksFactory');

@singleton()
export class PollingManager {
  private readonly expirationDate: number;
  public constructor(@inject(SERVICES.LOGGER) private readonly logger: Logger, @inject(TasksManager) private readonly taskManager: TasksManager) {
    this.expirationDate = config.get<number>('jobManager.expirationTime');
  }

  public async jobStatusPoll(): Promise<void> {
    const jobs = await this.taskManager.getJobsByTaskStatus();
    console.log(jobs);
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + this.expirationDate);
    if (jobs.completed && jobs.completed.length) {
      this.logger.debug(`completed jobs detected, running finalize job`);
      jobs.completed.forEach((job) => {
        this.taskManager.finalizeJob(job, expirationDate);
      });
    } else if (jobs.failed && jobs.failed.length) {
      this.logger.debug(`failed jobs detected, updating job status`);
      jobs.failed.forEach((job) => {
        this.taskManager.finalizeJob(job, expirationDate, false);
      });
    }
  }
}
