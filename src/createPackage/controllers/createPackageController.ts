import { Logger } from '@map-colonies/js-logger';
import { Meter } from '@map-colonies/telemetry';
import { BoundCounter } from '@opentelemetry/api-metrics';
import { RequestHandler } from 'express';
import httpStatus from 'http-status-codes';
import { injectable, inject } from 'tsyringe';
import { SERVICES } from '../../common/constants';
import { CreatePackageManager } from '../models/createPackageManager';
import { IBasicResponse, ICreatePackage, IJobCreationResponse } from '../../common/interfaces';

type CreatePackageHandler = RequestHandler<undefined, IBasicResponse | IJobCreationResponse, ICreatePackage>;

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
      this.logger.info(`Creating package "${userInput.packageName}"`);
      this.logger.debug(`User input: ${JSON.stringify(userInput)}`);
      const jobCreated = await this.manager.createPackage(userInput);
      return res.status(httpStatus.OK).json(jobCreated);
    } catch (err) {
      next(err);
    }
  };
}
