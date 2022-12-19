import { promises as fsPromise } from 'fs';
import { sep, parse as parsePath } from 'path';
import { Logger } from '@map-colonies/js-logger';
import {
  Polygon,
  MultiPolygon,
  BBox,
  bbox as PolygonBbox,
  intersect,
  bboxPolygon,
  FeatureCollection,
  Feature,
  featureCollection as createFeatureCollection,
} from '@turf/turf';
import { inject, injectable } from 'tsyringe';
import { degreesPerPixelToZoomLevel, ITileRange, snapBBoxToTileGrid } from '@map-colonies/mc-utils';
import { IJobResponse, OperationStatus } from '@map-colonies/mc-priority-queue';
import { bboxToTileRange } from '@map-colonies/mc-utils';
import { BadRequestError, InsufficientStorage } from '@map-colonies/error-types';
import { isArray, isEmpty } from 'lodash';
import booleanEqual from '@turf/boolean-equal';
import { BBox2d } from '@turf/helpers/dist/js/lib/geojson';
import { ProductType } from '@map-colonies/mc-model-types';
import { IConfig } from '../../../src/common/interfaces';
import { calculateEstimateGpkgSize, getGpkgRelativePath, getStorageStatus, getGpkgNameWithoutExt } from '../../common/utils';
import { RasterCatalogManagerClient } from '../../clients/rasterCatalogManagerClient';
import { DEFAULT_CRS, DEFAULT_PRIORITY, METADA_JSON_FILE_EXTENSION as METADATA_JSON_FILE_EXTENSION, SERVICES } from '../../common/constants';
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

// eslint-disable-next-line @typescript-eslint/no-var-requires
const geojsonhint: IHinter = require('@mapbox/geojsonhint') as IHinter;

interface IHinter {
  hint: (obj: object) => [];
}

@injectable()
export class CreatePackageManager {
  // eslint-disable-next-line @typescript-eslint/no-magic-numbers
  private static readonly bboxLength2d = 4;

  private readonly tilesProvider: MergerSourceType;
  private readonly gpkgsLocation: string;
  private readonly tileEstimatedSize: number;
  private readonly storageFactorBuffer: number;
  private readonly validateStorage: boolean;
  public constructor(
    @inject(SERVICES.CONFIG) private readonly config: IConfig,
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(JobManagerWrapper) private readonly jobManagerClient: JobManagerWrapper,
    @inject(RasterCatalogManagerClient) private readonly rasterCatalogManager: RasterCatalogManagerClient
  ) {
    this.tilesProvider = config.get<MergerSourceType>('tilesProvider');
    this.gpkgsLocation = config.get<string>('gpkgsLocation');
    this.tileEstimatedSize = config.get<number>('jpegTileEstimatedSizeInBytes'); // todo - should be calculated on future param from request
    this.storageFactorBuffer = config.get<number>('storageFactorBuffer');
    this.validateStorage = config.get<boolean>('validateStorage');

    this.tilesProvider = this.tilesProvider.toUpperCase() as MergerSourceType;
  }

  public async createPackage(userInput: ICreatePackage): Promise<ICreateJobResponse | ICallbackResponse> {
    const layer = await this.rasterCatalogManager.findLayer(userInput.dbId);
    const layerMetadata = layer.metadata;
    let { productId: resourceId, productVersion: version, productType } = layerMetadata;
    const { dbId, crs, priority, bbox: bboxFromUser, callbackURLs } = userInput;
    const normalizedPolygon = this.normalize2Polygon(bboxFromUser);
    const polygon = normalizedPolygon ?? layerMetadata.footprint;
    const targetResolution = (userInput.targetResolution ?? layerMetadata.maxResolutionDeg) as number;
    const zoomLevel = degreesPerPixelToZoomLevel(targetResolution);

    resourceId = resourceId as string;
    version = version as string;
    productType = productType as ProductType;

    const srcRes = layerMetadata.maxResolutionDeg as number;
    const maxZoom = degreesPerPixelToZoomLevel(srcRes);
    if (zoomLevel > maxZoom) {
      throw new BadRequestError(`The requested requested resolution ${targetResolution} is larger then then product resolution ${srcRes}`);
    }

    const sanitizedBbox = this.sanitizeBbox(polygon as Polygon, layerMetadata.footprint as Polygon | MultiPolygon, zoomLevel);
    if (sanitizedBbox === null) {
      throw new BadRequestError(`Requested bbox has no intersection with requested layer`);
    }
    const dupParams: JobDuplicationParams = {
      resourceId,
      version,
      dbId,
      zoomLevel,
      sanitizedBbox,
      crs: crs ?? DEFAULT_CRS,
    };

    const callbacks = callbackURLs.map((url) => <ICallbackTarget>{ url, bbox: bboxFromUser ?? sanitizedBbox });
    const duplicationExist = await this.checkForDuplicate(dupParams, callbacks);
    if (duplicationExist && duplicationExist.status === OperationStatus.COMPLETED) {
      const completeResponseData = duplicationExist as ICallbackResponse;
      completeResponseData.bbox = bboxFromUser ?? sanitizedBbox;
      return duplicationExist;
    } else if (duplicationExist) {
      return duplicationExist;
    }
    const batches: ITileRange[] = [];

    for (let i = 0; i <= zoomLevel; i++) {
      batches.push(bboxToTileRange(sanitizedBbox as BBox2d, i));
    }

    const estimatesGpkgSize = calculateEstimateGpkgSize(batches, this.tileEstimatedSize); // size of requested gpkg export
    if (this.validateStorage) {
      const isEnoughStorage = await this.validateFreeSpace(estimatesGpkgSize); // todo - on current stage, the calculation estimated by jpeg sizes
      if (!isEnoughStorage) {
        throw new InsufficientStorage(`There isn't enough free disk space to executing export`);
      }
    }
    const separator = this.getSeparator();
    const packageName = this.generatePackageName(productType, resourceId, version, zoomLevel, sanitizedBbox);
    const packageRelativePath = getGpkgRelativePath(packageName, separator);
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
        path: `${layerMetadata.id as string}${separator}${layerMetadata.displayPath as string}`, //tiles path
        type: this.tilesProvider,
      },
    ];

    const workerInput: IWorkerInput = {
      sanitizedBbox,
      targetResolution,
      fileName: packageName,
      relativeDirectoryPath: getGpkgNameWithoutExt(packageName),
      zoomLevel,
      dbId,
      version: version,
      cswProductId: resourceId,
      crs: crs ?? DEFAULT_CRS,
      productType,
      batches,
      sources,
      priority: priority ?? DEFAULT_PRIORITY,
      callbacks: callbacks,
      gpkgEstimatedSize: estimatesGpkgSize,
    };
    const jobCreated = await this.jobManagerClient.create(workerInput);
    return jobCreated;
  }

  public async createJsonMetadata(fullGpkgPath: string, job: JobResponse): Promise<void> {
    this.logger.info(`Creating metadata.json file for gpkg in path "${fullGpkgPath}" for jobId ${job.id}`);
    const record = await this.rasterCatalogManager.findLayer(job.internalId as string);

    const parsedPath = parsePath(fullGpkgPath);
    const directoryName = parsedPath.dir;
    const metadataFileName = parsedPath.name.concat(METADATA_JSON_FILE_EXTENSION);
    const metadataFilePath = `${directoryName}${sep}${metadataFileName}`;
    const sanitizedBboxToPolygon = bboxPolygon(job.parameters.sanitizedBbox);

    record.metadata.footprint = sanitizedBboxToPolygon;
    record.metadata.maxResolutionDeg = job.parameters.targetResolution;
    (record.metadata.layerPolygonParts as FeatureCollection) = this.extractPolygonParts(
      record.metadata.layerPolygonParts as FeatureCollection,
      sanitizedBboxToPolygon
    );

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

  private normalize2Polygon(bboxFromUser: Polygon | BBox | undefined): Polygon | undefined {
    try {
      if (isArray(bboxFromUser) && bboxFromUser.length === CreatePackageManager.bboxLength2d) {
        this.logger.debug({ bboxFromUser, msg: `Export will be executed by provided BBox from request input` });
        const resultPolygon = bboxPolygon(bboxFromUser as BBox);
        return resultPolygon.geometry;
      } else if (this.isAPolygon(bboxFromUser)) {
        this.logger.debug({ bboxFromUser, msg: `Export will be executed by provided Footprint from request input` });
        return bboxFromUser;
      } else if (bboxFromUser === undefined) {
        this.logger.debug(`Export will be executed on entire layer's footprint`);
        return undefined;
      } else {
        this.logger.warn({ bboxFromUser, msg: `Input bbox param illegal - should be bbox | polygon | null types` });
        throw new BadRequestError('Input bbox param illegal - should be bbox | polygon | null types');
      }
    } catch (error) {
      this.logger.error({ bboxFromUser, msg: `Failed` });
      throw new BadRequestError('Input bbox param illegal - should be bbox | polygon | null types');
    }
  }

  private isAPolygon(obj?: object): obj is Polygon {
    if (obj === undefined) {
      return false;
    }
    const isPolygon = 'type' in obj && 'coordinates' in obj && (obj as { type: string }).type === 'Polygon';
    if (isPolygon) {
      const errors = geojsonhint.hint(obj);
      if (!isEmpty(errors)) {
        this.logger.warn({ bboxFromUser: obj, msg: `Not a polygon: ${JSON.stringify(errors)}` });
        return false;
      }
    }
    return isPolygon;
  }

  private sanitizeBbox(polygon: Polygon, footprint: Polygon | MultiPolygon, zoom: number): BBox | null {
    const intersaction = intersect(polygon, footprint);
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
      await this.jobManagerClient.validateAndUpdateExpiration(responseJob.id);
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
      await this.jobManagerClient.validateAndUpdateExpiration(processingJob.id);
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

        if (this.isAPolygon(callback.bbox) && this.isAPolygon(newCallback.bbox)) {
          return booleanEqual(newCallback.bbox, callback.bbox);
        } else if (this.isAPolygon(callback.bbox) || this.isAPolygon(newCallback.bbox)) {
          return false;
        }
        // else both BBoxes
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

  private generatePackageName(productType: string, productId: string, productVersion: string, zoomLevel: number, bbox: BBox): string {
    const numberOfDecimals = 5;
    const bboxToString = bbox.map((val) => String(val.toFixed(numberOfDecimals)).replace('.', '_').replace(/-/g, 'm')).join('');
    return `${productType}_${productId}_${productVersion}_${zoomLevel}_${bboxToString}.gpkg`;
  }

  private extractPolygonParts(layerPolygonParts: FeatureCollection, sanitizedBboxPolygonzied: Feature<Polygon>): FeatureCollection {
    this.logger.debug(`Extracting layerPolygonParts from original record that intersects with sanitized bbox`);
    const newFeatures: Feature[] = [];

    layerPolygonParts.features.forEach((feature) => {
      const intersection = intersect(feature.geometry as Polygon, sanitizedBboxPolygonzied);
      if (intersection !== null) {
        intersection.properties = feature.properties;
        newFeatures.push(intersection);
      }
    });

    const newPolygonLarts = createFeatureCollection(newFeatures, { bbox: sanitizedBboxPolygonzied.bbox });

    return newPolygonLarts;
  }
}
