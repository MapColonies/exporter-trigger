import { Logger } from '@map-colonies/js-logger';
import { Tracer } from '@opentelemetry/api';
import { withSpanAsyncV4, withSpanV4 } from '@map-colonies/telemetry';
import type { MultiPolygon, Polygon } from 'geojson';
import { inject, injectable } from 'tsyringe';
import { OperationStatus } from '@map-colonies/mc-priority-queue';
import { BadRequestError, InsufficientStorage } from '@map-colonies/error-types';
import {
  CallbackExportResponse,
  CallbackUrlsTargetArray,
  ExportJobParameters,
  RasterLayerMetadata,
  RoiFeatureCollection,
} from '@map-colonies/raster-shared';
import { getStorageStatus } from '@src/common/utils';
import { SERVICES } from '../../common/constants';
import { JobManagerWrapper } from '../../clients/jobManagerWrapper';
import { RasterCatalogManagerClient } from '../../clients/rasterCatalogManagerClient';
import {
  IConfig,
  ICreateExportJobResponse,
  IGeometryRecord,
  IStorageEstimation,
  IStorageStatusResponse,
  JobExportDuplicationParams,
  JobExportResponse,
} from '../../common/interfaces';
import { checkRoiFeatureCollectionSimilarity, sanitizeBbox } from '../../utils/geometry';

@injectable()
export class ValidationManager {
  private readonly storageEstimation: IStorageEstimation;

  public constructor(
    @inject(SERVICES.CONFIG) private readonly config: IConfig,
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(SERVICES.TRACER) public readonly tracer: Tracer,
    @inject(JobManagerWrapper) private readonly jobManagerClient: JobManagerWrapper,
    @inject(RasterCatalogManagerClient) private readonly rasterCatalogManager: RasterCatalogManagerClient
  ) {
    this.storageEstimation = config.get<IStorageEstimation>('storageEstimation');
  }

  @withSpanAsyncV4
  public async findLayer(requestedLayerId: string): Promise<RasterLayerMetadata> {
    const layer = await this.rasterCatalogManager.findLayer(requestedLayerId);
    return layer.metadata;
  }

  @withSpanAsyncV4
  public async checkForExportDuplicate(
    productId: string,
    version: string,
    catalogId: string,
    roi: RoiFeatureCollection,
    crs: string,
    callbackUrls?: CallbackUrlsTargetArray
  ): Promise<CallbackExportResponse | ICreateExportJobResponse | undefined> {
    const dupParams: JobExportDuplicationParams = {
      productId,
      version,
      catalogId,
      roi,
      crs,
    };
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

  @withSpanV4
  public validateZoom(record: IGeometryRecord, maxZoom: number, sourceResolution: number): void {
    if (record.zoomLevel > maxZoom) {
      throw new BadRequestError(`The requested resolution ${record.targetResolutionDeg} is larger then product's resolution ${sourceResolution}`);
    }

    if (record.zoomLevel < record.minZoomLevel) {
      throw new BadRequestError(`The requested resolution ${record.zoomLevel} is smaller then minResolutionDeg ${record.minZoomLevel}`);
    }
  }

  @withSpanV4
  public validateFeaturesCollection(
    featuresRecords: IGeometryRecord[],
    footprint: Polygon | MultiPolygon,
    maxZoom: number,
    srcRes: number
  ): IGeometryRecord[] {
    // ROI vs layer validation section - zoom + geo intersection
    featuresRecords.forEach((record) => {
      this.validateZoom(record, maxZoom, srcRes);
      // generate sanitized bbox for each original feature
      record.sanitizedBox = sanitizeBbox({
        polygon: record.geometry as Polygon | MultiPolygon,
        footprint: footprint,
        zoom: record.zoomLevel,
      });
      if (!record.sanitizedBox) {
        throw new BadRequestError(`Requested ${JSON.stringify(record.geometry as Polygon | MultiPolygon)} has no intersection with requested layer`);
      }
    });
    return featuresRecords;
  }

  @withSpanAsyncV4
  public async validateFreeSpace(estimatesGpkgSize: number, gpkgsLocation: string): Promise<void> {
    const diskFreeSpace = await this.getFreeStorage(gpkgsLocation); // calculate free space including other running jobs
    this.logger.debug({ msg: `Estimated requested gpkg size: ${estimatesGpkgSize}, Estimated free space: ${diskFreeSpace}` });
    const isEnoughStorage = diskFreeSpace - estimatesGpkgSize >= 0;
    if (!isEnoughStorage) {
      const message = `There isn't enough free disk space to execute export`;
      this.logger.error({
        estimatesGpkgSize,
        diskFreeSpace,
        msg: message,
      });
      throw new InsufficientStorage(message);
    }
  }

  @withSpanAsyncV4
  private async checkForExportCompleted(dupParams: JobExportDuplicationParams): Promise<CallbackExportResponse | undefined> {
    this.logger.info({ ...dupParams, msg: `Checking for COMPLETED duplications with parameters` });
    const exportJobs = await this.jobManagerClient.findExportJobs(OperationStatus.COMPLETED, dupParams);
    const duplicateJob = this.findDuplicatedExportJob(exportJobs, dupParams);
    if (duplicateJob) {
      const expirationDate = await this.jobManagerClient.updateJobExpirationDate(duplicateJob.id);
      return {
        ...duplicateJob.parameters.callbackParams,
        status: OperationStatus.COMPLETED,
        expirationTime: expirationDate,
      } as CallbackExportResponse;
    }
  }

  @withSpanV4
  private findDuplicatedExportJob(jobs: JobExportResponse[] | undefined, jobParams: JobExportDuplicationParams): JobExportResponse | undefined {
    if (jobs && jobs.length > 0) {
      const duplicateJob = jobs.find(
        (job) =>
          job.internalId === jobParams.catalogId &&
          job.version === jobParams.version &&
          job.parameters.exportInputParams.crs === jobParams.crs &&
          checkRoiFeatureCollectionSimilarity(job.parameters.exportInputParams.roi, jobParams.roi, { config: this.config })
      );
      return duplicateJob;
    }
  }

  @withSpanAsyncV4
  private async checkForExportProcessing(
    dupParams: JobExportDuplicationParams,
    newCallbacks?: CallbackUrlsTargetArray
  ): Promise<ICreateExportJobResponse | undefined> {
    this.logger.info({ ...dupParams, msg: `Checking for PROCESSING duplications with parameters` });
    const inProgressJobs = await this.jobManagerClient.findExportJobs(OperationStatus.IN_PROGRESS, dupParams);
    const pendingJobs = await this.jobManagerClient.findExportJobs(OperationStatus.PENDING, dupParams);
    const processingJobs = [...(inProgressJobs ?? []), ...(pendingJobs ?? [])];
    const duplicateProcessingJob = this.findDuplicatedExportJob(processingJobs, dupParams);
    if (duplicateProcessingJob) {
      await this.updateExportCallbackURLs(duplicateProcessingJob, newCallbacks);
      return {
        jobId: duplicateProcessingJob.id,
        percentage: duplicateProcessingJob.percentage,
        status: duplicateProcessingJob.status === OperationStatus.PENDING ? OperationStatus.PENDING : OperationStatus.IN_PROGRESS,
      };
    }
  }

  @withSpanAsyncV4
  private async updateExportCallbackURLs(processingJob: JobExportResponse, newCallbacks?: CallbackUrlsTargetArray): Promise<void> {
    if (!newCallbacks) {
      return;
    }
    const updatedParameters = structuredClone(processingJob.parameters);

    if (!updatedParameters.exportInputParams.callbackUrls) {
      updatedParameters.exportInputParams.callbackUrls = newCallbacks;
    } else {
      const callbacks = updatedParameters.exportInputParams.callbackUrls;
      for (const newCallback of newCallbacks) {
        const hasCallback = callbacks.some((callbackUrls) => callbackUrls.url === newCallback.url);
        if (!hasCallback) {
          callbacks.push(newCallback);
        }
      }
    }

    await this.jobManagerClient.updateJob<ExportJobParameters>(processingJob.id, {
      parameters: updatedParameters,
    });
  }

  @withSpanAsyncV4
  private async getFreeStorage(gpkgsLocation: string): Promise<number> {
    const storageStatus: IStorageStatusResponse = await getStorageStatus(gpkgsLocation);
    let otherRunningJobsSize = 0;

    const processingJobs: JobExportResponse[] | undefined = await this.jobManagerClient.findAllProcessingExportJobs();
    processingJobs.forEach((job) => {
      let jobGpkgEstimatedSize = job.parameters.additionalParams.gpkgEstimatedSize;
      if (job.percentage) {
        // eslint-disable-next-line @typescript-eslint/no-magic-numbers
        jobGpkgEstimatedSize = (1 - job.percentage / 100) * jobGpkgEstimatedSize; // the needed size that left for this gpkg creation
      }
      otherRunningJobsSize += jobGpkgEstimatedSize;
    });
    const actualFreeSpace = storageStatus.free - otherRunningJobsSize * this.storageEstimation.storageFactorBuffer;
    this.logger.debug({ msg: `Current storage space in gpkgs location`, freeSpace: actualFreeSpace, totalSpace: storageStatus.size });
    return actualFreeSpace;
  }
}
