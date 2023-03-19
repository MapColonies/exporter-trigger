import { Logger } from '@map-colonies/js-logger';
import { RequestHandler } from 'express';
import httpStatus from 'http-status-codes';
import { injectable, inject } from 'tsyringe';
import { SERVICES } from '../../common/constants';
import { StorageManager } from '../models/storageManager';
import { IStorageStatusResponse } from '../../common/interfaces'

type GetTaskByJobIdHandler = RequestHandler<{ jobId: string }, IStorageStatusResponse, string>;

@injectable()
export class StorageController {
  public constructor(@inject(SERVICES.LOGGER) private readonly logger: Logger, @inject(StorageManager) private readonly storageManager: StorageManager) {}

  public getStorage: GetTaskByJobIdHandler = async (req, res, next) => {
    try {
      const storageStatus = await this.storageManager.getStorage();
      return res.status(httpStatus.OK).json(storageStatus);
    } catch (err) {
      next(err);
    }
  };
}
