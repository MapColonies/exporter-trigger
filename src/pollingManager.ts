import config from 'config';
import { inject, singleton } from 'tsyringe';
import { Logger } from '@map-colonies/js-logger';
import { SERVICES } from './common/constants';
import { TasksManager } from './tasks/models/tasksManager';

export const POLLING_MANGER_SYMBOL = Symbol('tasksFactory');

@singleton()
export class PollingManager {
  private readonly expirationDays: number;

  public constructor(@inject(SERVICES.LOGGER) private readonly logger: Logger, @inject(TasksManager) private readonly taskManager: TasksManager) {
    this.expirationDays = config.get<number>('jobManager.expirationDays');
  }

  public async jobStatusPoll(): Promise<boolean> {
    let existsJobs = false;

    const getMapJobs = await this.taskManager.getJobsByTaskStatus(); // for old getmap api - will be removed
    const roiJobs = await this.taskManager.getExportJobsByTaskStatus(); // new api by roi,
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + this.expirationDays);

    this.logger.debug({ ...getMapJobs, msg: `Handling GetMap jobs` });
    if (getMapJobs.completedJobs?.length != null) {
      existsJobs = true;
      this.logger.debug(`GETMAP Completed GetMap jobs detected, running finalize job`);
      for (const job of getMapJobs.completedJobs) {
        this.logger.info(`GETMAP Execute completed job finalizing on BBOX (GetMap) exporting for job: ${job.id}`);
        await this.taskManager.finalizeJob(job, expirationDate);
      }
    } else if (getMapJobs.failedJobs?.length != null) {
      existsJobs = true;
      this.logger.debug(`GETMAP Failed jobs detected, running finalize job`);
      for (const job of getMapJobs.failedJobs) {
        this.logger.info(`GETMAP Execute Failed job finalizing on BBOX (GetMap) exporting for job: ${job.id}`);
        const gpkgFailedErr = `failed to create gpkg, job: ${job.id}`;
        await this.taskManager.finalizeJob(job, expirationDate, false, gpkgFailedErr);
      }
    }

    this.logger.debug({ ...roiJobs, msg: `Handling ROI jobs` });
    if (roiJobs.completedJobs?.length != null) {
      existsJobs = true;
      this.logger.debug(`ROI Completed jobs detected, running finalize job`);
      for (const job of roiJobs.completedJobs) {
        this.logger.info(`Execute completed job finalizing on ROI exporting for job: ${job.id}`);
        await this.taskManager.finalizeExportJob(job, expirationDate);
      }
    } else if (roiJobs.failedJobs?.length != null) {
      existsJobs = true;
      this.logger.debug(`ROI Failed jobs detected, running finalize job`);
      for (const job of roiJobs.failedJobs) {
        this.logger.info(`Execute failed job finalizing on ROI exporting for job: ${job.id}`);
        const gpkgFailedErr = `failed to create gpkg, job: ${job.id}`;
        await this.taskManager.finalizeExportJob(job, expirationDate, false, gpkgFailedErr);
      }
    }

    return existsJobs;
  }
}
