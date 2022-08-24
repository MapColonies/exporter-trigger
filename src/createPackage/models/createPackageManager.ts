import { promises as fsPromise } from 'fs';
import { sep, join, dirname } from 'path';
import config from 'config';
import { Logger } from '@map-colonies/js-logger';
import { Polygon, MultiPolygon, BBox, bbox as PolygonBbox, intersect, bboxPolygon } from '@turf/turf';
import { inject, injectable } from 'tsyringe';
import { degreesPerPixelToZoomLevel, ITileRange, snapBBoxToTileGrid } from '@map-colonies/mc-utils';
import { OperationStatus } from '@map-colonies/mc-priority-queue';
import { bboxToTileRange } from '@map-colonies/mc-utils';
import { BadRequestError } from '@map-colonies/error-types';
import { BBox2d } from '@turf/helpers/dist/js/lib/geojson';
import { generatePackageName, getGpkgFilePath } from '../../common/utils';
import { RasterCatalogManagerClient } from '../../clients/rasterCatalogManagerClient';
import { DEFAULT_CRS, DEFAULT_PRIORITY, DEFAULT_PRODUCT_TYPE, SERVICES } from '../../common/constants';
import {
  ICreatePackage,
  ICreateJobResponse,
  IWorkerInput,
  JobDuplicationParams,
  IJobParameters,
  ICallbackResposne as ICallbackResponse,
  JobResponse,
  MergerSourceType,
  IMapSource,
  ICallbackTarget,
} from '../../common/interfaces';
import { JobManagerWrapper } from '../../clients/jobManagerWrapper';

@injectable()
export class CreatePackageManager {
  private readonly tilesProvider: MergerSourceType;
  private readonly gpkgsLocation: string;
  public constructor(
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(JobManagerWrapper) private readonly jobManagerClient: JobManagerWrapper,
    @inject(RasterCatalogManagerClient) private readonly rasterCatalogManager: RasterCatalogManagerClient
  ) {
    this.gpkgsLocation = config.get<string>('gpkgsLocation');
    this.tilesProvider = config.get('tilesProvider');
    this.tilesProvider = this.tilesProvider.toUpperCase() as MergerSourceType;
  }

  public async createPackage(userInput: ICreatePackage): Promise<ICreateJobResponse | ICallbackResponse> {
    const layer = await this.rasterCatalogManager.findLayer(userInput.dbId);
    const layerMetadata = layer.metadata;
    const { productId: resourceId, productVersion: version, footprint, productType } = layerMetadata;
    const { bbox, dbId, targetResolution, crs, priority, callbackURLs } = userInput;
    const zoomLevel = degreesPerPixelToZoomLevel(targetResolution);

    const srcRes = layerMetadata.maxResolutionDeg as number;
    const maxZoom = degreesPerPixelToZoomLevel(srcRes);
    if (zoomLevel > maxZoom) {
      throw new BadRequestError(`the requested requested resolution ${targetResolution} is larger then then product resolution ${srcRes}`);
    }

    const sanitizedBbox = this.sanitizeBbox(bbox, footprint as Polygon | MultiPolygon, zoomLevel);
    if (sanitizedBbox === null) {
      throw new BadRequestError(`requested bbox has no intersection with requested layer`);
    }

    const dupParams: JobDuplicationParams = {
      resourceId: resourceId as string,
      version: version as string,
      dbId,
      zoomLevel,
      sanitizedBbox,
      crs: crs ?? DEFAULT_CRS,
    };
    const callbacks = callbackURLs.map((url) => ({ url, bbox }));

    const duplicationExist = await this.checkForDuplicate(dupParams, callbacks);
    if (!duplicationExist) {
      const batches: ITileRange[] = [];
      for (let i = 0; i <= zoomLevel; i++) {
        batches.push(bboxToTileRange(sanitizedBbox, i));
      }
      const separator = this.getSeparator();
      const packageName = generatePackageName(dbId, zoomLevel, sanitizedBbox);
      const packageFullPath = getGpkgFilePath(this.gpkgsLocation, packageName);
      const sources: IMapSource[] = [
        {
          path: packageFullPath,
          type: 'GPKG',
          extent: {
            minX: bbox[0],
            minY: bbox[1],
            maxX: bbox[2],
            maxY: bbox[3],
          },
        },
        {
          path: (resourceId as string) + separator + (layerMetadata.productType as string), //tiles path
          type: this.tilesProvider,
        },
      ];
      const workerInput: IWorkerInput = {
        sanitizedBbox,
        targetResolution,
        fileName: packageName,
        zoomLevel,
        dbId,
        version: version as string,
        cswProductId: resourceId as string,
        crs: crs ?? DEFAULT_CRS,
        productType: productType ?? DEFAULT_PRODUCT_TYPE,
        batches,
        sources,
        priority: priority ?? DEFAULT_PRIORITY,
        callbacks: callbacks,
      };

      const jobCreated = await this.jobManagerClient.create(workerInput);
      return jobCreated;
    }

    return duplicationExist;
  }

  public async createJsonMetadata(filePath: string, dbId: string): Promise<void> {
    const fileName = 'metadata.json';
    const metadataFilePath = join(dirname(filePath), fileName);
    const record = await this.rasterCatalogManager.findLayer(dbId);
    const recordMetadata = JSON.stringify(record.metadata);
    await fsPromise.writeFile(metadataFilePath, recordMetadata);
  }

  private getSeparator(): string {
    return this.tilesProvider === 'S3' ? '/' : sep;
  }

  private sanitizeBbox(bbox: BBox, footprint: Polygon | MultiPolygon, zoom: number): BBox2d | null {
    const intersaction = intersect(bboxPolygon(bbox), footprint);
    if (intersaction === null) {
      return null;
    }
    bbox = snapBBoxToTileGrid(PolygonBbox(intersaction) as BBox2d, zoom);
    return bbox;
  }

  private async checkForDuplicate(
    dupParams: JobDuplicationParams,
    callbackUrls: ICallbackTarget[]
  ): Promise<ICallbackResponse | ICreateJobResponse | undefined> {
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

  private async checkForCompleted(dupParams: JobDuplicationParams): Promise<ICallbackResponse | undefined> {
    this.logger.info(`Checking for COMPLETED duplications with parameters: ${JSON.stringify(dupParams)}`);
    const responseJob = await this.jobManagerClient.findCompletedJob(dupParams);
    if (responseJob) {
      return {
        ...responseJob.parameters.callbackParams,
        status: OperationStatus.COMPLETED,
      } as ICallbackResponse;
    }
  }

  private async checkForProcessing(dupParams: JobDuplicationParams, newCallbacks: ICallbackTarget[]): Promise<ICreateJobResponse | undefined> {
    this.logger.info(`Checking for PROCESSING duplications with parameters: ${JSON.stringify(dupParams)}`);
    const processingJob = (await this.jobManagerClient.findInProgressJob(dupParams)) ?? (await this.jobManagerClient.findPendingJob(dupParams));

    if (processingJob) {
      await this.updateCallbackURLs(processingJob, newCallbacks);

      return {
        id: processingJob.id,
        taskIds: processingJob.tasks.map((t) => t.id),
        status: OperationStatus.IN_PROGRESS,
      };
    }
  }

  private async updateCallbackURLs(processingJob: JobResponse, newCallbacks: ICallbackTarget[]): Promise<void> {
    const callbacks = processingJob.parameters.callbacks;
    for (const newCallback of newCallbacks) {
      const hasCallback = callbacks.findIndex((callback) => {
        let exist = callback.url === newCallback.url;
        for (let i = 0; i < callback.bbox.length; i++) {
          exist &&= callback.bbox[i] === newCallback.bbox[i];
        }
        return exist;
      });
      // eslint-disable-next-line @typescript-eslint/no-magic-numbers
      if (hasCallback === -1) {
        callbacks.push(newCallback);
      }
    }
    await this.jobManagerClient.updateJob<IJobParameters>(processingJob.id, {
      parameters: processingJob.parameters,
    });
  }
}
