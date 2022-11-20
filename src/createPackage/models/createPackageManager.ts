import { promises as fsPromise } from 'fs';
import { sep, join, dirname } from 'path';
import config from 'config';
import { Logger } from '@map-colonies/js-logger';
import { Polygon, MultiPolygon, BBox, bbox as PolygonBbox, intersect, bboxPolygon } from '@turf/turf';
import { inject, injectable } from 'tsyringe';
import { degreesPerPixelToZoomLevel, ITileRange, snapBBoxToTileGrid } from '@map-colonies/mc-utils';
import { IJobResponse, OperationStatus } from '@map-colonies/mc-priority-queue';
import { bboxToTileRange } from '@map-colonies/mc-utils';
import { BadRequestError, InsufficientStorage } from '@map-colonies/error-types';
import { BBox2d } from '@turf/helpers/dist/js/lib/geojson';
import { calculateEstimateGpkgSize, generatePackageName, getGpkgRelativePath, getStorageStatus } from '../../common/utils';
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
  ITaskParameters,
  IStorageStatusResponse,
} from '../../common/interfaces';
import { JobManagerWrapper } from '../../clients/jobManagerWrapper';

@injectable()
export class CreatePackageManager {
  private readonly tilesProvider: MergerSourceType;
  private readonly gpkgsLocation: string;
  private readonly tileEstimatedSize: number;
  private readonly storageFactorBuffer: number;
  private readonly metadataFileName: string;
  public constructor(
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(JobManagerWrapper) private readonly jobManagerClient: JobManagerWrapper,
    @inject(RasterCatalogManagerClient) private readonly rasterCatalogManager: RasterCatalogManagerClient
  ) {
    this.tilesProvider = config.get('tilesProvider');
    this.tileEstimatedSize = config.get('jpegTileEstimatedSizeInBytes'); // todo - should be calculated on future param from request
    this.storageFactorBuffer = config.get('storageFactorBuffer');
    this.gpkgsLocation = config.get('gpkgsLocation');

    this.tilesProvider = this.tilesProvider.toUpperCase() as MergerSourceType;
    this.metadataFileName = 'metadata.json';
  }

  public async createPackage(userInput: ICreatePackage): Promise<ICreateJobResponse | ICallbackResponse> {
    const layer = await this.rasterCatalogManager.findLayer(userInput.dbId);
    const layerMetadata = layer.metadata;
    const { productId: resourceId, productVersion: version, footprint, productType } = layerMetadata;
    const { dbId, crs, priority, bbox: bboxFromUser, callbackURLs } = userInput;
    const bbox = (bboxFromUser ?? PolygonBbox(footprint)) as BBox2d;
    const targetResolution = (userInput.targetResolution ?? layerMetadata.maxResolutionDeg) as number;
    const zoomLevel = degreesPerPixelToZoomLevel(targetResolution);

    const srcRes = layerMetadata.maxResolutionDeg as number;
    const maxZoom = degreesPerPixelToZoomLevel(srcRes);
    if (zoomLevel > maxZoom) {
      throw new BadRequestError(`The requested requested resolution ${targetResolution} is larger then then product resolution ${srcRes}`);
    }

    const sanitizedBbox = this.sanitizeBbox(bbox, footprint as Polygon | MultiPolygon, zoomLevel);
    if (sanitizedBbox === null) {
      throw new BadRequestError(`Requested bbox has no intersection with requested layer`);
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
    if (duplicationExist && duplicationExist.status === OperationStatus.COMPLETED) {
      const completeResponseData = duplicationExist as ICallbackResponse;
      completeResponseData.bbox = bbox;
      return duplicationExist;
    } else if (duplicationExist) {
      return duplicationExist;
    }
    const batches: ITileRange[] = [];

    for (let i = 0; i <= zoomLevel; i++) {
      batches.push(bboxToTileRange(sanitizedBbox, i));
    }
    const estimatesGpkgSize = calculateEstimateGpkgSize(batches, this.tileEstimatedSize); // size of requested gpkg export
    const isEnoughStorage = await this.validateFreeSpace(estimatesGpkgSize); // todo - on current stage, the calculation estimated by jpeg sizes
    if (!isEnoughStorage) {
      throw new InsufficientStorage(`There isn't enough free disk space to executing export`);
    }
    const separator = this.getSeparator();
    const packageName = generatePackageName(dbId, zoomLevel, sanitizedBbox);
    const packageRelativePath = getGpkgRelativePath(packageName);
    const sources: IMapSource[] = [
      {
        path: packageRelativePath,
        type: 'GPKG',
        extent: {
          minX: sanitizedBbox[0],
          minY: sanitizedBbox[1],
          maxX: sanitizedBbox[2],
          maxY: sanitizedBbox[3],
        },
      },
      {
        path: (layerMetadata.id as string) + separator + (layerMetadata.displayPath as string), //tiles path
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
      gpkgEstimatedSize: estimatesGpkgSize,
    };
    const jobCreated = await this.jobManagerClient.create(workerInput);
    return jobCreated;
  }

  public async createJsonMetadata(filePath: string, dbId: string): Promise<void> {
    const metadataFilePath = join(dirname(filePath), this.metadataFileName);
    const record = await this.rasterCatalogManager.findLayer(dbId);
    const recordMetadata = JSON.stringify(record.metadata);
    await fsPromise.writeFile(metadataFilePath, recordMetadata);
  }

  private async getFreeStorage(): Promise<number> {
    const storageStatus: IStorageStatusResponse = await getStorageStatus(this.gpkgsLocation);
    let otherRunningJobsSize = 0;

    const inProcessingJobs: JobResponse[] | undefined = await this.jobManagerClient.getInProgressJobs();
    if (inProcessingJobs !== undefined && inProcessingJobs.length !== 0) {
      inProcessingJobs.forEach((job) => {
        let jobGpkgEstimatedSize = job.parameters.gpkgEstimatedSize as number;
        if (job.percentage) {
          // eslint-disable-next-line @typescript-eslint/no-magic-numbers
          jobGpkgEstimatedSize = (1 - job.percentage / 100) * jobGpkgEstimatedSize; // the needed size that left for this gpkg creation
        }
        otherRunningJobsSize += jobGpkgEstimatedSize;
      });
    }
    const actualFreeSpace = storageStatus.free - otherRunningJobsSize * this.storageFactorBuffer;
    this.logger.debug(`Current storage free space for gpkgs location: ${JSON.stringify({ free: actualFreeSpace, total: storageStatus.size })}`);
    return actualFreeSpace;
  }

  private async validateFreeSpace(estimatesGpkgSize: number): Promise<boolean> {
    const diskFreeSpace = await this.getFreeStorage(); // calculate free space including other running jobs
    this.logger.debug(`Estimated requested gpkg size: ${estimatesGpkgSize}, Estimated free space: ${diskFreeSpace}`);
    return diskFreeSpace - estimatesGpkgSize >= 0;
  }
  private getSeparator(): string {
    return this.tilesProvider === 'S3' ? '/' : sep;
  }

  private sanitizeBbox(bbox: BBox, footprint: Polygon | MultiPolygon, zoom: number): BBox2d | null {
    const intersaction = intersect(bboxPolygon(bbox), footprint);
    if (intersaction === null) {
      return null;
    }
    const sanitized = snapBBoxToTileGrid(PolygonBbox(intersaction) as BBox2d, zoom);
    return sanitized;
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
        taskIds: (processingJob.tasks as unknown as IJobResponse<IJobParameters, ITaskParameters>[]).map((t) => t.id),
        status: OperationStatus.IN_PROGRESS,
      };
    }
  }

  private async updateCallbackURLs(processingJob: JobResponse, newCallbacks: ICallbackTarget[]): Promise<void> {
    const callbacks = processingJob.parameters.callbacks;
    for (const newCallback of newCallbacks) {
      const hasCallback = callbacks.findIndex((callback) => {
        const exist = callback.url === newCallback.url;
        if (!exist) {
          return false;
        }

        let sameBboxCoordinate = false;
        for (let i = 0; i < callback.bbox.length; i++) {
          sameBboxCoordinate = callback.bbox[i] === newCallback.bbox[i];
          if (!sameBboxCoordinate) {
            sameBboxCoordinate = false;
            break;
          }
        }
        return sameBboxCoordinate;
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
