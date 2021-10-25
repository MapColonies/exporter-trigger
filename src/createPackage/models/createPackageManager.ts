import { sep } from 'path';
import { Logger } from '@map-colonies/js-logger';
import { LayerMetadata } from '@map-colonies/mc-model-types';
import { Polygon, MultiPolygon } from '@turf/turf';
import { inject, injectable } from 'tsyringe';
import { RasterCatalogManagerClient } from '../../clients/rasterCatalogManagerClient';
import { DEFAULT_CRS, DEFAULT_PRIORITY, SERVICES } from '../../common/constants';
import { ICreatePackage, IJobCreationResponse, IWorkerInput } from '../../common/interfaces';
import { JobManagerClient } from '../../clients/jobManagerClient';

@injectable()
export class CreatePackageManager {
  public constructor(
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(JobManagerClient) private readonly jobManagerClient: JobManagerClient,
    @inject(RasterCatalogManagerClient) private readonly rasterCatalogManager: RasterCatalogManagerClient
  ) {}

  public async createPackage(userInput: ICreatePackage): Promise<IJobCreationResponse> {
    const layer = await this.rasterCatalogManager.findLayer(userInput.dbId);

    const layerMetadata = layer.metadata as LayerMetadata;

    const workerInput: IWorkerInput = {
      footprint: layerMetadata.footprint as Polygon | MultiPolygon,
      bbox: userInput.bbox,
      version: layerMetadata.productVersion as string,
      cswProductId: layerMetadata.productId as string,
      targetResolution: userInput.targetResolution,
      dbId: userInput.dbId,
      packageName: userInput.packageName,
      callbackURL: userInput.callbackURL,
      tilesPath: (layerMetadata.productId as string) + sep + (layerMetadata.productVersion as string),
      priority: userInput.priority ?? DEFAULT_PRIORITY,
      crs: userInput.crs ?? DEFAULT_CRS,
    };

    const jobCreated = await this.jobManagerClient.createJob(workerInput);
    return jobCreated;
  }
}
