import { Logger } from '@map-colonies/js-logger';
import { RequestHandler } from 'express';
import { InvalidPathError, NoMatchError } from 'check-disk-space';
import httpStatus from 'http-status-codes';
import { injectable, inject } from 'tsyringe';
import { HttpError } from '@map-colonies/error-types';
import httpStatusCodes from 'http-status-codes';
import { SERVICES } from '../../common/constants';
import { StorageManager } from '../models/storageManager';
import { IStorageStatusResponse } from '../../common/interfaces';

type GetStorageHandler = RequestHandler<{ jobId: string }, IStorageStatusResponse, string>;

@injectable()
export class StorageController {
  public constructor(
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(StorageManager) private readonly storageManager: StorageManager
  ) {}

  public getStorage: GetStorageHandler = async (req, res, next) => {
    try {
      const storageStatus = await this.storageManager.getStorage();
      return res.status(httpStatus.OK).json(storageStatus);
    } catch (err) {
      let error = err;
      if (err instanceof InvalidPathError || err instanceof NoMatchError) {
        error = new HttpError(err, httpStatusCodes.INTERNAL_SERVER_ERROR, 'Bad path configuration for GPKG location');
      }
      next(error);
    }
  };
}
