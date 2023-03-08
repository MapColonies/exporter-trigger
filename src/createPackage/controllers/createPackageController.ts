import { Logger } from '@map-colonies/js-logger';
import { Meter } from '@map-colonies/telemetry';
import { RequestHandler } from 'express';
import httpStatus from 'http-status-codes';
import { injectable, inject } from 'tsyringe';
import { SERVICES } from '../../common/constants';
import { CreatePackageManager } from '../models/createPackageManager';
import {
  IBasicResponse,
  ICreatePackage,
  ICreateJobResponse,
  ICallbackResposne,
  ICreatePackageRoi,
  ICallbackExportResponse,
} from '../../common/interfaces';

type CreatePackageHandler = RequestHandler<
  undefined,
  IBasicResponse | ICreateJobResponse | ICallbackResposne | ICallbackExportResponse,
  ICreatePackage | ICreatePackageRoi
>;

@injectable()
export class CreatePackageController {
  public constructor(
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(CreatePackageManager) private readonly manager: CreatePackageManager,
    @inject(SERVICES.METER) private readonly meter: Meter
  ) {}

  public create: CreatePackageHandler = async (req, res, next) => {
    const userInput: ICreatePackage = req.body;
    try {
      this.logger.debug(userInput, `Creating package with user input`);
      const jobCreated = await this.manager.createPackage(userInput);
      return res.status(httpStatus.OK).json(jobCreated);
    } catch (err) {
      next(err);
    }
  };

  public createPackageRoi: CreatePackageHandler = async (req, res, next) => {
    const userInput: ICreatePackageRoi = req.body;
    try {
      this.logger.debug(userInput, `Creating package with user input`);
      const jobCreated = await this.manager.createPackageRoi(userInput);
      return res.status(httpStatus.OK).json(jobCreated);
    } catch (err) {
      next(err);
    }
  };
}
