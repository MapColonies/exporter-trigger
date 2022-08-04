import { sep } from 'path';
import config from 'config';
import { Logger } from '@map-colonies/js-logger';
import { Polygon, MultiPolygon, BBox, bbox as PolygonBbox, intersect, bboxPolygon } from '@turf/turf';
import { inject, injectable } from 'tsyringe';
import { degreesPerPixelToZoomLevel, ITileRange, snapBBoxToTileGrid } from '@map-colonies/mc-utils';
import { OperationStatus } from '@map-colonies/mc-priority-queue';
import { bboxToTileRange} from '@map-colonies/mc-utils';
import { BadRequestError } from '@map-colonies/error-types';
import { BBox2d } from '@turf/helpers/dist/js/lib/geojson';
import { RasterCatalogManagerClient } from '../../clients/rasterCatalogManagerClient';
import { DEFAULT_CRS, DEFAULT_PRIORITY, DEFAULT_PRODUCT_TYPE, SERVICES } from '../../common/constants';
import {
  ICreatePackage,
  ICreateJobResponse,
  IWorkerInput,
  JobDuplicationParams,
  IJobParameters,
  ICallbackResposne,
  JobResponse,
} from '../../common/interfaces';
import { JobManagerWrapper } from '../../clients/jobManagerWrapper';

@injectable()
export class CreatePackageManager {
  private readonly tilesProvider: string;
  public constructor(
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(JobManagerWrapper) private readonly jobManagerClient: JobManagerWrapper,
    @inject(RasterCatalogManagerClient) private readonly rasterCatalogManager: RasterCatalogManagerClient
  ) {
    this.tilesProvider = config.get("tilesProvider");
    this.tilesProvider = this.tilesProvider.toUpperCase();
  }

  public async createPackage(userInput: ICreatePackage): Promise<ICreateJobResponse | ICallbackResposne> {
    const layer = await this.rasterCatalogManager.findLayer(userInput.dbId);
    const layerMetadata = layer.metadata;
    const { productId: resourceId, productVersion: version, footprint, productType } = layerMetadata;
    const { bbox, dbId, targetResolution, crs, priority, callbackURLs } = userInput;
    const zoomLevel = degreesPerPixelToZoomLevel(targetResolution);
    const sanitizedBbox = this.sanitizeBbox(bbox,footprint as Polygon | MultiPolygon,zoomLevel)

    if(sanitizedBbox === null){
      throw new BadRequestError(`requested bbox has no intersection with requested layer`);
    }

    const dupParams: JobDuplicationParams = {
      resourceId: resourceId as string,
      version: version as string,
      dbId,
      zoomLevel,
      bbox:sanitizedBbox,
      crs: crs ?? DEFAULT_CRS,
    };

    const duplicationExist = await this.checkForDuplicate(dupParams, userInput.callbackURLs);
    if (!duplicationExist) {
      const batches: ITileRange[] = [];
      for(let i = 0; i<= zoomLevel; i++ ){
        batches.push(bboxToTileRange(sanitizedBbox,i));
      }
      const separator = this.getSeparator();
      const task = {
        batches: batches,
        sources: [
          {
            path: this.generatePackageName(dbId,zoomLevel,sanitizedBbox), //gpkg path
            type: "GPKG",
            extent: {
              minX: bbox[0],
              minY: bbox[1],
              maxX: bbox[2],
              maxY: bbox[3]
            }
          },
          {
            path: (resourceId as string) + separator + (layerMetadata.productType as string), //tiles path
            type: this.tilesProvider
          }
        ]
      }


      const jobCreated = await this.jobManagerClient.create(workerInput);
      return jobCreated;
    }

    return duplicationExist;
  }

  private getSeparator(): string {
      return this.tilesProvider === 'S3' ? '/' : sep;
  }

  private sanitizeBbox(bbox: BBox, footprint:  Polygon | MultiPolygon, zoom: number): BBox2d | null {
    const intersaction = intersect(bboxPolygon(bbox),footprint);
    if(intersaction === null){
      return null;
    }
    bbox = snapBBoxToTileGrid(PolygonBbox(intersaction) as BBox2d,zoom);
    return bbox;
  }

  private generatePackageName(cswId: string, zoomLevel: number, bbox: BBox): string {
    const numberOfDecimals = 5;
    const bboxToString = bbox.map((val) => String(val.toFixed(numberOfDecimals)).replace('.', '_').replace(/-/g, 'm')).join('');
    return `gm_${cswId.replace(/-/g, '_')}_${zoomLevel}_${bboxToString}.gpkg`;
  }

  private async checkForDuplicate(
    dupParams: JobDuplicationParams,
    callbackUrls: string[]
  ): Promise<ICallbackResposne | ICreateJobResponse | undefined> {
    let completedExists = await this.checkForCompleted(dupParams);
    if (completedExists) {
      return completedExists;
    }

    const processingExists = await this.checkForProcessing(dupParams, callbackUrls);
    if (processingExists) {
      // For race condition
      completedExists = await this.checkForCompleted(dupParams);
      if (completedExists) {
        return completedExists;
      }
      return processingExists;
    }

    return undefined;
  }

  private async checkForCompleted(dupParams: JobDuplicationParams): Promise<ICallbackResposne | undefined> {
    this.logger.info(`Checking for COMPLETED duplications with parameters: ${JSON.stringify(dupParams)}`);
    const responseJob = await this.jobManagerClient.findCompletedJob(dupParams);
    if (responseJob) {
      return {
        ...responseJob.parameters.callbackParams,
        status: OperationStatus.COMPLETED,
      } as ICallbackResposne;
    }
  }

  private async checkForProcessing(dupParams: JobDuplicationParams, addedCallbackUrls: string[]): Promise<ICreateJobResponse | undefined> {
    this.logger.info(`Checking for PROCESSING duplications with parameters: ${JSON.stringify(dupParams)}`);
    const processingJob = (await this.jobManagerClient.findInProgressJob(dupParams)) ?? (await this.jobManagerClient.findPendingJob(dupParams));

    if (processingJob) {
      await this.updateCallbackURLs(processingJob, addedCallbackUrls);

      return {
        id: processingJob.id,
        taskIds: processingJob.tasks.map((t) => t.id),
        status: OperationStatus.IN_PROGRESS,
      };
    }
  }

  private async updateCallbackURLs(processingJob: JobResponse, newCalbackURLs: string[]): Promise<void> {
    const newCallbackURLs = [...new Set([...processingJob.parameters.callbackURLs, ...newCalbackURLs])];
    await this.jobManagerClient.updateJob<IJobParameters>(processingJob.id, {
      parameters: { ...processingJob.parameters, callbackURLs: newCallbackURLs },
    });
  }
}
