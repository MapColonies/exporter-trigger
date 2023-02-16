import config from 'config';
import { inject, singleton } from 'tsyringe';
import { Logger } from '@map-colonies/js-logger';
import { SERVICES } from './common/constants';
import { TasksManager } from './tasks/models/tasksManager';
import { ExportVersion } from './common/interfaces';

export const POLLING_MANGER_SYMBOL = Symbol('tasksFactory');

@singleton()
export class PollingManager {
  private readonly expirationDays: number;

  public constructor(@inject(SERVICES.LOGGER) private readonly logger: Logger, @inject(TasksManager) private readonly taskManager: TasksManager) {
    this.expirationDays = config.get<number>('jobManager.expirationDays');
  }

  public async jobStatusPoll(): Promise<boolean> {
    let existsJobs = false;
    const jobs = await this.taskManager.getJobsByTaskStatus(); // for old getmap api - work with new and will be replaced
    // todo - uncomment when will be replaced the API.
    // const jobs = await this.taskManager.getExportJobsByTaskStatus(); // new api by roi, 
    
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + this.expirationDays);
    if (jobs.completedJobs?.length != null) {
      existsJobs = true;
      this.logger.info(`Completed jobs detected, running finalize job`);
      for (const job of jobs.completedJobs) {
        if (job.parameters.exportVersion === ExportVersion.GETMAP) {
          this.logger.info('Execute completed job finalizing on BBOX (GetMap) exporting')
          await this.taskManager.finalizeJob(job, expirationDate);
        } else {
          // TODO - implement finalizer for new API
          this.logger.info('Execute completed job finalizing on ROI exporting')
        }
      }
    } else if (jobs.failedJobs?.length != null) {
      existsJobs = true;
      this.logger.info(`Failed jobs detected, running finalize job`);
      for (const job of jobs.failedJobs) {
        const gpkgFailedErr = `failed to create gpkg, job: ${job.id}`;
        if (job.parameters.exportVersion === ExportVersion.GETMAP) {
          this.logger.info('Execute completed job finalizing on BBOX (GetMap) exporting')
          await this.taskManager.finalizeJob(job, expirationDate, false, gpkgFailedErr)
        } else {
          // TODO - implement finalizer for new API
          this.logger.info('Execute completed job finalizing on ROI exporting')
        }
      }
    }
    return existsJobs;
  }
}
