import { sep } from 'path';
import { Logger } from '@map-colonies/js-logger';
import { inject, injectable } from 'tsyringe';
import { JobManagerWrapper } from '../../clients/jobManagerWrapper';
import { SERVICES } from '../../common/constants';
import { TaskResponse } from '../../common/interfaces';
import { NotFoundError } from '@map-colonies/error-types';
import { OperationStatus } from '@map-colonies/mc-priority-queue';

export type TaskStatusResponse = {
  percentage: number | undefined;
  status: OperationStatus;
};

@injectable()
export class TasksManager {
  public constructor(
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(JobManagerWrapper) private readonly jobManagerClient: JobManagerWrapper
  ) {}

  public async getTaskStatusByJobId(jobId: string): Promise<TaskStatusResponse> {
    this.logger.info(`Getting task status by jobId: ${jobId}`);
    const tasks = await this.jobManagerClient.getTasksByJobId(jobId);

    if (!tasks || tasks?.length === 0) {
      throw new NotFoundError(`jobId: ${jobId} is not exists`);
    }
    const task = tasks[0];
    const statusResponse: TaskStatusResponse = {
      percentage: task.percentage,
      status: task.status,
    };
    return statusResponse;
  }
}
