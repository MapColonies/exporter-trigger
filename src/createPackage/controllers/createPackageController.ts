import { sep } from 'path';
import { Logger } from '@map-colonies/js-logger';
import { LayerMetadata } from '@map-colonies/mc-model-types';
import { Meter } from '@map-colonies/telemetry';
import { BoundCounter } from '@opentelemetry/api-metrics';
import { MultiPolygon, Polygon } from '@turf/helpers/dist/js/lib/geojson';
import axios from 'axios';
import { RequestHandler } from 'express';
import httpStatus from 'http-status-codes';
import { injectable, inject } from 'tsyringe';
import { DEFAULT_CRS, DEFAULT_PRIORITY, SERVICES } from '../../common/constants';
import { CreatePackageManager } from '../models/createPackageManager';
import { ICreatePackage, IWorkerInput } from '../../common/interfaces';
import { JobManagerClient } from '../../clients/jobManagerClient';
import { RasterCatalogManager } from '../../clients/rasterCatalogManagerClient';

type CreatePackageHandler = RequestHandler<undefined, undefined, ICreatePackage>;

@injectable()
export class CreatePackageController {
  private readonly createdResourceCounter: BoundCounter;

  public constructor(
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(CreatePackageManager) private readonly manager: CreatePackageManager,
    @inject(SERVICES.METER) private readonly meter: Meter,
    @inject(JobManagerClient) private readonly jobManager: JobManagerClient
    @inject(RasterCatalogManager) private readonly rasterCatalogManager: RasterCatalogManager
  ) {
    this.createdResourceCounter = meter.createCounter('created_resource');
  }

  public create: CreatePackageHandler = async (req, res) => {
    const input: ICreatePackage = req.body;
    this.logger.info(`Retrieving record with id ${req.body.dbId}`);

    const layer = await this.rasterCatalogManager.findLayer(req.body.dbId);

    if (layer === undefined) {
      return res.status(httpStatus.NOT_FOUND).json({
        message: `Could not find layer with dbID: ${req.body.dbId}`,
      });
    }

    const layerMetadata = layer.metadata as LayerMetadata;

    const workerInput: IWorkerInput = {
      footprint: layerMetadata.footprint as Polygon | MultiPolygon,
      bbox: input.bbox,
      version: layerMetadata.productVersion as string,
      cswProductId: layerMetadata.productId as string,
      targetResolution: input.targetResolution,
      dbId: input.dbId,
      packageName: input.packageName,
      callbackURL: input.callbackURL,
      tilesPath: (layerMetadata.productId as string) + sep + (layerMetadata.productVersion as string),
      priority: input.priority ?? DEFAULT_PRIORITY,
      crs: input.crs ?? DEFAULT_CRS,
    };

    const jobCreated = await this.jobManager.createJob(workerInput);
    return res.status(httpStatus.OK).json(jobCreated);
  };
}
