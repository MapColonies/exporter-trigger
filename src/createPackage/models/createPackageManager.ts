import { promises as fsPromise } from 'node:fs';
import { sep } from 'node:path';
import { Logger } from '@map-colonies/js-logger';
import { Tracer } from '@opentelemetry/api';
import { withSpanAsyncV4 } from '@map-colonies/telemetry';
import {
  Polygon,
  MultiPolygon,
  BBox,
  bbox as PolygonBbox,
  intersect,
  combine as featureCombine,
  FeatureCollection,
  Feature,
  Geometry,
} from '@turf/turf';
import { inject, injectable } from 'tsyringe';
import { degreesPerPixelToZoomLevel, featureCollectionBooleanEqual, ITileRange, snapBBoxToTileGrid, bboxToTileRange } from '@map-colonies/mc-utils';
import { IJobResponse, OperationStatus } from '@map-colonies/mc-priority-queue';
import { BadRequestError, InsufficientStorage } from '@map-colonies/error-types';
import { BBox2d } from '@turf/helpers/dist/js/lib/geojson';
import { ProductType, TileOutputFormat } from '@map-colonies/mc-model-types';
import { feature, featureCollection } from '@turf/helpers';
import {
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
  getStorageStatus,
  concatFsPaths,
  parseFeatureCollection,
  generateGeoIdentifier,
  getFilesha256Hash,
} from '../../common/utils';
import { RasterCatalogManagerClient } from '../../clients/rasterCatalogManagerClient';
import { DEFAULT_CRS, DEFAULT_PRIORITY, SERVICES } from '../../common/constants';
import { MergerSourceType, IMapSource, ITaskParameters, IStorageStatusResponse } from '../../common/interfaces';
import { JobManagerWrapper } from '../../clients/jobManagerWrapper';

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
    @inject(SERVICES.TRACER) public readonly tracer: Tracer,
    @inject(JobManagerWrapper) private readonly jobManagerClient: JobManagerWrapper,
    @inject(RasterCatalogManagerClient) private readonly rasterCatalogManager: RasterCatalogManagerClient
  ) {
    this.tilesProvider = config.get<MergerSourceType>('tilesProvider');
    this.gpkgsLocation = config.get<string>('gpkgsLocation');
    this.storageEstimation = config.get<IStorageEstimation>('storageEstimation');

    this.tilesProvider = this.tilesProvider.toUpperCase() as MergerSourceType;
  }

  @withSpanAsyncV4
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
        throw new BadRequestError(`The requested resolution ${record.targetResolutionDeg} is larger then product resolution ${srcRes}`);
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

  @withSpanAsyncV4
  private async getFreeStorage(): Promise<number> {
    const storageStatus: IStorageStatusResponse = await getStorageStatus(this.gpkgsLocation);
    let otherRunningJobsSize = 0;

    const inProcessingJobs: JobExportResponse[] | undefined = await this.jobManagerClient.getInProgressJobs();
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

  @withSpanAsyncV4
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

  private async validateFreeSpace(estimatesGpkgSize: number): Promise<boolean> {
    const diskFreeSpace = await this.getFreeStorage(); // calculate free space including other running jobs
    this.logger.debug(`Estimated requested gpkg size: ${estimatesGpkgSize}, Estimated free space: ${diskFreeSpace}`);
    return diskFreeSpace - estimatesGpkgSize >= 0;
  }

  private getSeparator(): string {
    return this.tilesProvider === 'S3' ? '/' : sep;
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

  // TODO: remove and replace with generateTileGroups that is commented, when multiple tasks for GPKG target is possible
  /* private generateTileGroups(polygon: Polygon | MultiPolygon, footprint: Polygon | MultiPolygon, zoom: number): ITileRange[] {
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
  } */
}
