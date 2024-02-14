import { promises as fsPromise } from 'fs';
import { sep, parse as parsePath } from 'path';
import { Logger } from '@map-colonies/js-logger';
import {
  Polygon,
  MultiPolygon,
  BBox,
  bbox as PolygonBbox,
  intersect,
  combine as featureCombine,
  bboxPolygon,
  FeatureCollection,
  Feature,
  Geometry,
} from '@turf/turf';
import { inject, injectable } from 'tsyringe';
import {
  degreesPerPixelToZoomLevel,
  featureCollectionBooleanEqual,
  ITileRange,
  snapBBoxToTileGrid,
  TileRanger,
  bboxToTileRange,
} from '@map-colonies/mc-utils';
import { IJobResponse, OperationStatus } from '@map-colonies/mc-priority-queue';
import { BadRequestError, InsufficientStorage } from '@map-colonies/error-types';
import { isArray, isEmpty } from 'lodash';
import booleanEqual from '@turf/boolean-equal';
import { BBox2d } from '@turf/helpers/dist/js/lib/geojson';
import { ProductType, TileOutputFormat } from '@map-colonies/mc-model-types';
import { feature, featureCollection } from '@turf/helpers';
import {
  ExportVersion,
  ICallbackExportResponse,
  ICallbackTargetExport,
  IConfig,
  ICreateExportJobResponse,
  ICreatePackageRoi,
  IGeometryRecord,
  IJobExportParameters,
  ILinkDefinition,
  IStorageEstimation,
  IWorkerExportInput,
  JobExportDuplicationParams,
  JobExportResponse,
  JobFinalizeResponse,
} from '../../common/interfaces';
import {
  calculateEstimateGpkgSize,
  getGpkgRelativePath,
  getStorageStatus,
  getGpkgNameWithoutExt,
  concatFsPaths,
  parseFeatureCollection,
  generateGeoIdentifier,
  getFilesha256Hash,
} from '../../common/utils';
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
  private readonly storageEstimation: IStorageEstimation;

  public constructor(
    @inject(SERVICES.CONFIG) private readonly config: IConfig,
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(JobManagerWrapper) private readonly jobManagerClient: JobManagerWrapper,
    @inject(RasterCatalogManagerClient) private readonly rasterCatalogManager: RasterCatalogManagerClient
  ) {
    this.tilesProvider = config.get<MergerSourceType>('tilesProvider');
    this.gpkgsLocation = config.get<string>('gpkgsLocation');
    this.storageEstimation = config.get<IStorageEstimation>('storageEstimation');

    this.tilesProvider = this.tilesProvider.toUpperCase() as MergerSourceType;
  }

  /**
   * @deprecated GetMap API - will be deprecated on future
   */
  public async createPackage(userInput: ICreatePackage): Promise<ICreateJobResponse | ICallbackResponse> {
    const layer = await this.rasterCatalogManager.findLayer(userInput.dbId);
    const layerMetadata = layer.metadata;
    let { productId: resourceId, productVersion: version, productType } = layerMetadata;
    const { dbId, crs, priority, bbox: bboxFromUser, callbackURLs } = userInput;
    const normalizedPolygon = this.normalize2Polygon(bboxFromUser);
    const polygon = normalizedPolygon ?? layerMetadata.footprint;
    const targetResolution = (userInput.targetResolution ?? layerMetadata.maxResolutionDeg) as number;
    const zoomLevel = degreesPerPixelToZoomLevel(targetResolution);
    const tileEstimatedSize = this.getTileEstimatedSize(layerMetadata.tileOutputFormat as TileOutputFormat);

    resourceId = resourceId as string;
    version = version as string;
    productType = productType as ProductType;

    const srcRes = layerMetadata.maxResolutionDeg as number;
    const maxZoom = degreesPerPixelToZoomLevel(srcRes);
    if (zoomLevel > maxZoom) {
      throw new BadRequestError(`The requested resolution ${targetResolution} is larger than product resolution ${srcRes}`);
    }

    const sanitizedBbox = this.sanitizeBbox(polygon as Polygon, layerMetadata.footprint as Polygon | MultiPolygon, zoomLevel);
    if (sanitizedBbox === null) {
      throw new BadRequestError(
        `Requested ${JSON.stringify(polygon as Polygon)} has no intersection with requested layer ${layer.metadata.id as string}`
      );
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

    // TODO: remove and replace with `generateTileGroups` that is commented, when multiple tasks for GPKG target is possible
    const batches: ITileRange[] = [];
    for (let i = 0; i <= zoomLevel; i++) {
      batches.push(bboxToTileRange(sanitizedBbox as BBox2d, i));
    }
    // const batches = this.generateTileGroups(polygon as Polygon, layerMetadata.footprint as Polygon | MultiPolygon, zoomLevel);
    const estimatesGpkgSize = calculateEstimateGpkgSize(batches, tileEstimatedSize); // size of requested gpkg export
    if (this.storageEstimation.validateStorageSize) {
      const isEnoughStorage = await this.validateFreeSpace(estimatesGpkgSize);
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
      exportVersion: ExportVersion.GETMAP,
      version: version,
      cswProductId: resourceId,
      crs: crs ?? DEFAULT_CRS,
      productType,
      batches,
      sources,
      priority: priority ?? DEFAULT_PRIORITY,
      callbacks: callbacks,
      gpkgEstimatedSize: estimatesGpkgSize,
      targetFormat: layerMetadata.tileOutputFormat,
    };
    const jobCreated = await this.jobManagerClient.create(workerInput);
    return jobCreated;
  }

  public async createPackageRoi(userInput: ICreatePackageRoi): Promise<ICreateExportJobResponse | ICallbackExportResponse> {
    const { dbId, crs, priority, callbackURLs, description } = userInput;
    let roi = userInput.roi;
    const layer = await this.rasterCatalogManager.findLayer(userInput.dbId);
    const layerMetadata = layer.metadata;
    if (!roi) {
      // convert and wrap layer's footprint to featureCollection
      const layerMaxResolutionDeg = layerMetadata.maxResolutionDeg;
      const layerFeature = feature(layerMetadata.footprint as Geometry, { maxResolutionDeg: layerMaxResolutionDeg });
      roi = featureCollection([layerFeature]);
      this.logger.info({
        catalogId: userInput.dbId,
        productId: layerMetadata.productId,
        productVersion: layerMetadata.productVersion,
        productType: layerMetadata.productType,
        callbackURLs,
        msg: `ROI not provided, will use default layer's geometry`,
      });
    }

    let { productId: resourceId, productVersion: version, productType, maxResolutionDeg: srcRes } = layerMetadata;
    const featuresRecords = parseFeatureCollection(roi);
    const tileEstimatedSize = this.getTileEstimatedSize(layerMetadata.tileOutputFormat as TileOutputFormat);

    resourceId = resourceId as string;
    version = version as string;
    productType = productType as ProductType;
    srcRes = srcRes as number;
    const maxZoom = degreesPerPixelToZoomLevel(srcRes);

    // ROI vs layer validation section - zoom + geo intersection
    featuresRecords.forEach((record) => {
      if (record.zoomLevel > maxZoom) {
        throw new BadRequestError(`The requested resolution ${record.targetResolutionDeg} is larger then product resolution ${srcRes as number}`);
      }

      if (record.zoomLevel < record.minZoomLevel) {
        throw new BadRequestError(
          `The requested minResolutionDeg ${record.minResolutionDeg} is larger then maxResolutionDeg ${record.targetResolutionDeg}`
        );
      }
      // generate sanitized bbox for each original feature
      record.sanitizedBox = this.sanitizeBbox(
        record.geometry as Polygon | MultiPolygon,
        layerMetadata.footprint as Polygon | MultiPolygon,
        record.zoomLevel
      );
      if (!record.sanitizedBox) {
        throw new BadRequestError(
          `Requested ${JSON.stringify(record.geometry as Polygon | MultiPolygon)} has no intersection with requested layer ${
            layer.metadata.id as string
          }`
        );
      }
    });

    const layerBbox = PolygonBbox(roi); // bounding box of entire ROI
    const dupParams: JobExportDuplicationParams = {
      resourceId,
      version,
      dbId,
      roi,
      crs: crs ?? DEFAULT_CRS,
    };

    const callbacks = callbackURLs ? callbackURLs.map((url) => <ICallbackTargetExport>{ url, roi }) : undefined;
    const duplicationExist = await this.checkForExportDuplicate(dupParams, callbacks);
    if (duplicationExist && duplicationExist.status === OperationStatus.COMPLETED) {
      const callbackParam = duplicationExist as ICallbackExportResponse;
      this.logger.info({
        jobStatus: callbackParam.status,
        jobId: callbackParam.jobId,
        catalogId: callbackParam.recordCatalogId,
        msg: `Found relevant cache for export request`,
      });
      return duplicationExist;
    } else if (duplicationExist) {
      const jobResponse = duplicationExist as ICreateExportJobResponse;
      this.logger.info({ jobId: jobResponse.jobId, status: jobResponse.status, msg: `Found exists relevant In-Progress job for export request` });
      return duplicationExist;
    }

    // TODO: remove and replace with `generateTileGroups` that is commented, when multiple tasks for GPKG target is possible
    const batches: ITileRange[] = [];
    featuresRecords.forEach((record) => {
      for (let zoom = record.minZoomLevel; zoom <= record.zoomLevel; zoom++) {
        const recordBatches = bboxToTileRange(record.sanitizedBox as BBox2d, zoom);
        batches.push(recordBatches);
      }
    });
    // featuresRecords.forEach((record) => {
    //   const recordBatches = this.generateTileGroups(
    //     record.geometry as Polygon | MultiPolygon,
    //     layerMetadata.footprint as Polygon | MultiPolygon,
    //     record.zoomLevel
    //   );
    //   batches.push(...recordBatches);
    // });
    const estimatesGpkgSize = calculateEstimateGpkgSize(batches, tileEstimatedSize); // size of requested gpkg export
    if (this.storageEstimation.validateStorageSize) {
      const isEnoughStorage = await this.validateFreeSpace(estimatesGpkgSize);
      if (!isEnoughStorage) {
        const message = `There isn't enough free disk space to executing export`;
        this.logger.error({
          resourceId,
          version,
          dbId,
          estimatesGpkgSize,
          minZoomLevel: Math.min(...batches.map((batch) => batch.zoom)),
          maxZoomLevel: Math.max(...batches.map((batch) => batch.zoom)),
          msg: message,
        });
        throw new InsufficientStorage(message);
      }
    }
    const separator = this.getSeparator();
    const prefixPackageName = this.generateExportFileNames(productType, resourceId, version, featuresRecords);
    const packageName = `${prefixPackageName}.gpkg`;
    const metadataFileName = `${prefixPackageName}.json`;
    const fileNamesTemplates: ILinkDefinition = {
      dataURI: packageName,
      metadataURI: metadataFileName,
    };
    const additionalIdentifiers = generateGeoIdentifier(roi);
    const packageRelativePath = `${additionalIdentifiers}${separator}${packageName}`;
    const sources: IMapSource[] = [
      {
        path: packageRelativePath,
        type: 'GPKG',
        extent: {
          minX: layerBbox[0],
          minY: layerBbox[1],
          maxX: layerBbox[2],
          maxY: layerBbox[3],
        },
      },
      {
        path: `${layerMetadata.id as string}${separator}${layerMetadata.displayPath as string}`, //tiles path
        type: this.tilesProvider,
      },
    ];
    const workerInput: IWorkerExportInput = {
      roi,
      fileNamesTemplates: fileNamesTemplates,
      relativeDirectoryPath: additionalIdentifiers,
      dbId,
      exportVersion: ExportVersion.ROI,
      version: version,
      cswProductId: resourceId,
      crs: crs ?? DEFAULT_CRS,
      productType,
      batches,
      sources,
      priority: priority ?? DEFAULT_PRIORITY,
      callbacks: callbacks,
      gpkgEstimatedSize: estimatesGpkgSize,
      description,
      targetFormat: layerMetadata.tileOutputFormat,
    };
    const jobCreated = await this.jobManagerClient.createExport(workerInput);
    return jobCreated;
  }

  /**
   * @deprecated GetMap API - will be deprecated on future
   */
  public async createJsonMetadata(fullGpkgPath: string, job: JobResponse): Promise<void> {
    this.logger.info({
      jobId: job.id,
      msg: `Creating metadata.json file for gpkg in path "${this.gpkgsLocation}/${fullGpkgPath}" for jobId ${job.id}`,
    });
    const record = await this.rasterCatalogManager.findLayer(job.internalId as string);

    const parsedPath = parsePath(fullGpkgPath);
    const directoryName = parsedPath.dir;
    const metadataFileName = parsedPath.name.concat(METADATA_JSON_FILE_EXTENSION);
    const metadataFilePath = `${directoryName}${sep}${metadataFileName}`;
    const sanitizedBboxToPolygon = bboxPolygon(job.parameters.sanitizedBbox);

    record.metadata.footprint = sanitizedBboxToPolygon;
    record.metadata.maxResolutionDeg = job.parameters.targetResolution;

    const recordMetadata = JSON.stringify(record.metadata);
    await fsPromise.writeFile(metadataFilePath, recordMetadata);
  }

  public async createExportJsonMetadata(job: JobExportResponse | JobFinalizeResponse): Promise<boolean> {
    this.logger.info({
      jobId: job.id,
      metadataRelativeDirectory: job.parameters.relativeDirectoryPath,
      fileName: job.parameters.fileNamesTemplates.metadataURI,
      msg: `Creating metadata file`,
    });
    try {
      const record = await this.rasterCatalogManager.findLayer(job.internalId as string);
      const featuresRecords = parseFeatureCollection(job.parameters.roi);

      const metadataFileName = job.parameters.fileNamesTemplates.metadataURI;
      const directoryName = job.parameters.relativeDirectoryPath;
      const metadataFullPath = concatFsPaths(this.gpkgsLocation, directoryName, metadataFileName);
      const combinedFootprint = this.getExportedPackageFootprint(
        job.parameters.roi.features as Feature<Polygon | MultiPolygon>[],
        record.metadata.footprint as Polygon | MultiPolygon,
        job.id
      );
      record.metadata.footprint = combinedFootprint ? combinedFootprint : record.metadata.footprint;
      const maxResolutionDeg = Math.max(
        record.metadata.maxResolutionDeg as number,
        Math.min(...featuresRecords.map((records) => records.targetResolutionDeg))
      );
      record.metadata.maxResolutionDeg = maxResolutionDeg;
      const maxResolutionMeter = Math.max(
        record.metadata.maxResolutionMeter as number,
        Math.min(...featuresRecords.map((records) => records.targetResolutionMeter))
      );
      record.metadata.maxResolutionMeter = maxResolutionMeter;

      const roiBbox = PolygonBbox(job.parameters.roi);
      record.metadata.productBoundingBox = roiBbox.join(',');

      const packageName = job.parameters.fileNamesTemplates.dataURI;
      const relativeFilesDirectory = job.parameters.relativeDirectoryPath;
      const packageFullPath = concatFsPaths(this.gpkgsLocation, relativeFilesDirectory, packageName);
      const sha256 = await getFilesha256Hash(packageFullPath);
      (record.metadata as unknown as { sha256: string }).sha256 = sha256;
      this.logger.debug({ ...record.metadata, metadataFullPath, jobId: job.id, msg: 'Metadata json file will be written to file' });
      const recordMetadata = JSON.stringify(record.metadata);

      await fsPromise.writeFile(metadataFullPath, recordMetadata);
      return true;
    } catch (error) {
      this.logger.error({ err: error, jobId: job.id, errReason: (error as Error).message, msg: `Failed on creating metadata json file` });
      return false;
    }
  }

  private featuresFootprintIntersects(
    features: Feature<Polygon | MultiPolygon>[],
    footprint: Polygon | MultiPolygon
  ): Feature<Polygon | MultiPolygon>[] {
    const intersectedFeatures: Feature<Polygon | MultiPolygon>[] = [];
    features.forEach((feature) => {
      const intersected = intersect(feature, footprint);
      if (intersected !== null) {
        intersectedFeatures.push(intersected);
      }
    });
    return intersectedFeatures;
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
    const actualFreeSpace = storageStatus.free - otherRunningJobsSize * this.storageEstimation.storageFactorBuffer;
    this.logger.debug({ freeSpace: actualFreeSpace, totalSpace: storageStatus.size }, `Current storage free space for gpkgs location`);
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

  private normalize2Polygon(bboxFromUser: Polygon | MultiPolygon | BBox | undefined): Polygon | undefined {
    try {
      if (isArray(bboxFromUser) && bboxFromUser.length === CreatePackageManager.bboxLength2d) {
        this.logger.debug({ ...bboxFromUser, msg: `Export will be executed by provided BBox from request input` });
        const resultPolygon = bboxPolygon(bboxFromUser as BBox);
        return resultPolygon.geometry;
      } else if (this.isAPolygon(bboxFromUser)) {
        this.logger.debug({ ...bboxFromUser, msg: `Export will be executed by provided Footprint from request input` });
        return bboxFromUser;
      } else if (!bboxFromUser) {
        this.logger.debug(`Export will be executed on entire layer's footprint`);
        return undefined;
      } else {
        this.logger.warn({ ...bboxFromUser, msg: `Input bbox param illegal - should be bbox | polygon | null types` });
        throw new BadRequestError('Input bbox param illegal - should be bbox | polygon | null types');
      }
    } catch (error) {
      this.logger.error({ bboxFromUser, msg: `Failed with error ${(error as Error).message}` });
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
        this.logger.warn({ bboxFromUser: obj, errors }, `Not a polygon`);
        return false;
      }
    }
    return isPolygon;
  }

  private sanitizeBbox(polygon: Polygon | MultiPolygon, footprint: Polygon | MultiPolygon, zoom: number): BBox | null {
    try {
      const intersaction = intersect(polygon, footprint);
      if (intersaction === null) {
        return null;
      }
      const sanitized = snapBBoxToTileGrid(PolygonBbox(intersaction) as BBox2d, zoom);
      return sanitized;
    } catch (error) {
      throw new Error(`Error occurred while trying to sanitized bbox: ${JSON.stringify(error)}`);
    }
  }

  private generateTileGroups(polygon: Polygon | MultiPolygon, footprint: Polygon | MultiPolygon, zoom: number): ITileRange[] {
    let intersaction: Feature<Polygon | MultiPolygon> | null;

    try {
      intersaction = intersect(polygon, footprint);
      if (intersaction === null) {
        throw new BadRequestError(
          `Requested ${JSON.stringify(polygon)} has no intersection with requested layer footprint: ${JSON.stringify(footprint)}`
        );
      }
    } catch (error) {
      const message = `Error occurred while trying to generate tiles batches - intersaction error: ${JSON.stringify(error)}`;
      this.logger.error({
        firstPolygon: polygon,
        secondPolygon: footprint,
        zoom: zoom,
        message: message,
      });
      throw new Error(message);
    }

    try {
      const tileRanger = new TileRanger();
      const tilesGroups: ITileRange[] = [];

      for (let i = 0; i <= zoom; i++) {
        const zoomTilesGroups = tileRanger.encodeFootprint(intersaction, i);
        for (const group of zoomTilesGroups) {
          tilesGroups.push(group);
        }
      }
      return tilesGroups;
    } catch (error) {
      const message = `Error occurred while trying to generate tiles batches - encodeFootprint error: ${JSON.stringify(error)}`;
      this.logger.error({
        firstPolygon: polygon,
        secondPolygon: footprint,
        zoom: zoom,
        message: message,
      });
      throw new Error(message);
    }
  }

  /**
   * @deprecated GetMap API - will be deprecated on future
   */
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

  private async checkForExportDuplicate(
    dupParams: JobExportDuplicationParams,
    callbackUrls?: ICallbackTargetExport[]
  ): Promise<ICallbackExportResponse | ICreateExportJobResponse | undefined> {
    let completedExists = await this.checkForExportCompleted(dupParams);
    if (completedExists) {
      return completedExists;
    }

    const processingExists = await this.checkForExportProcessing(dupParams, callbackUrls);
    if (processingExists) {
      // For race condition
      completedExists = await this.checkForExportCompleted(dupParams);
      if (completedExists) {
        return completedExists;
      }
      return { ...processingExists, isDuplicated: true };
    }

    return undefined;
  }

  /**
   * @deprecated GetMap API - will be deprecated on future
   */
  private async checkForCompleted(dupParams: JobDuplicationParams): Promise<ICallbackResponse | undefined> {
    this.logger.info(dupParams, `Checking for COMPLETED duplications with parameters`);
    const responseJob = await this.jobManagerClient.findCompletedJob(dupParams);
    if (responseJob) {
      await this.jobManagerClient.validateAndUpdateExpiration(responseJob.id);
      return {
        ...responseJob.parameters.callbackParams,
        status: OperationStatus.COMPLETED,
      } as ICallbackResponse;
    }
  }

  private async checkForExportCompleted(dupParams: JobExportDuplicationParams): Promise<ICallbackExportResponse | undefined> {
    this.logger.info({ ...dupParams, roi: undefined, msg: `Checking for COMPLETED duplications with parameters` });
    const responseJob = await this.jobManagerClient.findExportJob(OperationStatus.COMPLETED, dupParams);
    if (responseJob) {
      await this.jobManagerClient.validateAndUpdateExpiration(responseJob.id);
      return {
        ...responseJob.parameters.callbackParams,
        status: OperationStatus.COMPLETED,
      } as ICallbackExportResponse;
    }
  }

  /**
   * @deprecated GetMap API - will be deprecated on future
   */
  private async checkForProcessing(dupParams: JobDuplicationParams, newCallbacks: ICallbackTarget[]): Promise<ICreateJobResponse | undefined> {
    this.logger.info(dupParams, `Checking for PROCESSING duplications with parameters`);
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

  private async checkForExportProcessing(
    dupParams: JobExportDuplicationParams,
    newCallbacks?: ICallbackTargetExport[]
  ): Promise<ICreateExportJobResponse | undefined> {
    this.logger.info({ ...dupParams, roi: undefined, msg: `Checking for PROCESSING duplications with parameters` });
    const processingJob =
      (await this.jobManagerClient.findExportJob(OperationStatus.IN_PROGRESS, dupParams, true)) ??
      (await this.jobManagerClient.findExportJob(OperationStatus.PENDING, dupParams, true));
    if (processingJob) {
      await this.updateExportCallbackURLs(processingJob, newCallbacks);
      return {
        jobId: processingJob.id,
        taskIds: (processingJob.tasks as unknown as IJobResponse<IJobExportParameters, ITaskParameters>[]).map((t) => t.id),
        status: OperationStatus.IN_PROGRESS,
      };
    }
  }

  /**
   * @deprecated GetMap API - will be deprecated on future
   */
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

  private async updateExportCallbackURLs(processingJob: JobExportResponse, newCallbacks?: ICallbackTargetExport[]): Promise<void> {
    if (!newCallbacks) {
      return;
    }

    if (!processingJob.parameters.callbacks) {
      processingJob.parameters.callbacks = newCallbacks;
    } else {
      const callbacks = processingJob.parameters.callbacks;
      for (const newCallback of newCallbacks) {
        const hasCallback = callbacks.findIndex((callback) => {
          const exist = callback.url === newCallback.url;
          if (!exist) {
            return false;
          }

          const sameROI = featureCollectionBooleanEqual(callback.roi, newCallback.roi);
          return sameROI;
        });
        // eslint-disable-next-line @typescript-eslint/no-magic-numbers
        if (hasCallback === -1) {
          callbacks.push(newCallback);
        }
      }
    }
    await this.jobManagerClient.updateJob<IJobExportParameters>(processingJob.id, {
      parameters: processingJob.parameters,
    });
  }

  /**
   * @deprecated GetMap API - will be deprecated on future
   */
  private generatePackageName(productType: string, productId: string, productVersion: string, zoomLevel: number, bbox: BBox): string {
    const numberOfDecimals = 5;
    const bboxToString = bbox.map((val) => String(val.toFixed(numberOfDecimals)).replace('.', '_').replace(/-/g, 'm')).join('');
    const productVersionConvention = productVersion.replace('.', '_');
    return `${productType}_${productId}_${productVersionConvention}_${zoomLevel}_${bboxToString}.gpkg`;
  }

  private generateExportFileNames(productType: string, productId: string, productVersion: string, featuresRecords: IGeometryRecord[]): string {
    const maxZoom = Math.max(...featuresRecords.map((feature) => feature.zoomLevel));
    let currentDateStr = new Date().toJSON();
    currentDateStr = `${currentDateStr}`.replaceAll('-', '_').replaceAll('.', '_').replaceAll(':', '_');
    return `${productType}_${productId}_${productVersion.replaceAll('.', '_')}_${maxZoom}_${currentDateStr}`;
  }

  private getTileEstimatedSize(tileOutputFormat: TileOutputFormat): number {
    let tileEstimatedSize;
    if (tileOutputFormat === TileOutputFormat.JPEG) {
      tileEstimatedSize = this.storageEstimation.jpegTileEstimatedSizeInBytes;
    } else {
      tileEstimatedSize = this.storageEstimation.pngTileEstimatedSizeInBytes;
    }
    this.logger.debug(`single tile size defined as ${tileOutputFormat} from configuration: ${tileEstimatedSize} bytes`);

    return tileEstimatedSize;
  }

  private getExportedPackageFootprint(
    features: Feature<Polygon | MultiPolygon>[],
    footprint: Polygon | MultiPolygon,
    jobId: string
  ): MultiPolygon | undefined {
    let combinedFootprint = undefined;
    try {
      const intersectedFeatures = this.featuresFootprintIntersects(features, footprint);
      const fc: FeatureCollection<Polygon | MultiPolygon> = featureCollection(intersectedFeatures);
      combinedFootprint = featureCombine(fc).features[0].geometry as unknown as MultiPolygon;
    } catch (error) {
      this.logger.error({ jobId, msg: `Failed to match features intersection with footprint with error: ${(error as Error).message}` });
    }
    return combinedFootprint;
  }
}
