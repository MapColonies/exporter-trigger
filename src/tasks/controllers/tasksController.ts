import { Logger } from '@map-colonies/js-logger';
import { RequestHandler } from 'express';
import httpStatus from 'http-status-codes';
import { injectable, inject } from 'tsyringe';
import { SERVICES } from '../../common/constants';
import { IJobStatusResponse, TasksManager } from '../models/tasksManager';

type GetTaskByJobIdHandler = RequestHandler<{ jobId: string }, IJobStatusResponse, string>;

@injectable()
export class TasksController {
  public constructor(@inject(SERVICES.LOGGER) private readonly logger: Logger, @inject(TasksManager) private readonly taskManager: TasksManager) {}

  public getTaskStatusByJobId: GetTaskByJobIdHandler = async (req, res, next) => {
    const jobId: string = req.params.jobId;
    try {
      const taskStatus = await this.taskManager.getJobStatusByJobId(jobId);
      return res.status(httpStatus.OK).json(taskStatus);
    } catch (err) {
      next(err);
    }
  };
}
