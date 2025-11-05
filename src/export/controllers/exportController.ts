import { Logger } from '@map-colonies/js-logger';
import { RequestHandler } from 'express';
import httpStatus from 'http-status-codes';
import { HttpError } from '@map-colonies/error-types';
import { injectable, inject } from 'tsyringe';
import { CallbackExportResponse } from '@map-colonies/raster-shared';
import { createExportRequestSchema } from '@src/utils/zod/schemas';
import { SERVICES } from '../../common/constants';
import { ExportManager } from '../models/exportManager';
import { ICreateExportJobResponse, IJobStatusResponse } from '../../common/interfaces';

type CreateExportHandler = RequestHandler<undefined, ICreateExportJobResponse | CallbackExportResponse, unknown>;
type GetStatusByJobIdHandler = RequestHandler<{ jobId: string }, IJobStatusResponse, string>;

@injectable()
export class ExportController {
  public constructor(
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(ExportManager) private readonly manager: ExportManager
  ) {}

  public createExport: CreateExportHandler = async (req, res, next) => {
    try {
      const exportRequest = createExportRequestSchema.safeParse(req.body);
      if (!exportRequest.success) {
        throw new HttpError(exportRequest.error.message, httpStatus.BAD_REQUEST);
      }
      this.logger.debug({ msg: `Creating export request:`, exportRequest });
      const jobCreated = await this.manager.createExport(exportRequest.data);
      return res.status(httpStatus.OK).json(jobCreated);
    } catch (err) {
      next(err);
    }
  };

  public getStatusByJobId: GetStatusByJobIdHandler = async (req, res, next) => {
    const jobId: string = req.params.jobId;
    try {
      this.logger.debug({ msg: `Getting job status for jobId:`, jobId });
      const jobStatus = await this.manager.getJobStatusByJobId(jobId);
      return res.status(httpStatus.OK).json(jobStatus);
    } catch (err) {
      next(err);
    }
  };
}
