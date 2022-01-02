import { sep } from 'path';
import { Logger } from '@map-colonies/js-logger';
import { Polygon, MultiPolygon } from '@turf/turf';
import { inject, injectable } from 'tsyringe';
import { BBox2d } from '@turf/helpers/dist/js/lib/geojson';
import { degreesPerPixelToZoomLevel } from '@map-colonies/mc-utils';
import { OperationStatus } from '@map-colonies/mc-priority-queue';
import { RasterCatalogManagerClient } from '../../clients/rasterCatalogManagerClient';
import { DEFAULT_CRS, DEFAULT_PRIORITY, DEFAULT_PRODUCT_TYPE, SERVICES } from '../../common/constants';
import { ICreatePackage, ICreateJobResponse, IWorkerInput, JobDuplicationParams, IJobParameters, ICallbackResposne } from '../../common/interfaces';
import { JobManagerWrapper } from '../../clients/jobManagerWrapper';

@injectable()
export class CreatePackageManager {
  public constructor(
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(JobManagerWrapper) private readonly jobManagerClient: JobManagerWrapper,
    @inject(RasterCatalogManagerClient) private readonly rasterCatalogManager: RasterCatalogManagerClient
  ) {}

  public async createPackage(userInput: ICreatePackage): Promise<ICreateJobResponse | ICallbackResposne> {
    const layer = await this.rasterCatalogManager.findLayer(userInput.dbId);
    const layerMetadata = layer.metadata;

    const { productId: resourceId, productVersion: version, footprint, productType } = layerMetadata;
    const { bbox, dbId, targetResolution, crs, priority, callbackURLs } = userInput;
    const zoomLevel = degreesPerPixelToZoomLevel(targetResolution);

    const dupParams: JobDuplicationParams = {
      resourceId: resourceId as string,
      version: version as string,
      dbId,
      zoomLevel,
      bbox,
      crs: crs ?? DEFAULT_CRS,
    };

    const duplicationExist = await this.checkForDuplicate(dupParams, userInput.callbackURLs);
    if (!duplicationExist) {
      const packageName = this.generatePackageName(userInput.dbId, zoomLevel, userInput.bbox);
      const workerInput: IWorkerInput = {
        bbox,
        targetResolution,
        zoomLevel,
        dbId,
        packageName,
        callbackURLs,
        version: version as string,
        cswProductId: resourceId as string,
        footprint: footprint as Polygon | MultiPolygon,
        tilesPath: (resourceId as string) + sep + (version as string) + sep + (layerMetadata.productType as string),
        priority: priority ?? DEFAULT_PRIORITY,
        crs: crs ?? DEFAULT_CRS,
        productType: productType ?? DEFAULT_PRODUCT_TYPE,
      };

      const jobCreated = await this.jobManagerClient.create(workerInput);
      return jobCreated;
    }

    return duplicationExist;
  }

  private generatePackageName(cswId: string, zoomLevel: number, bbox: BBox2d): string {
    const numberOfDecimals = 5;
    const bboxToString = bbox.map((val) => String(val.toFixed(numberOfDecimals)).replace('.', '_')).join('');
    return `gm_${cswId.replace(/-/g, '_')}_${zoomLevel}_${bboxToString}`;
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
      return processingExists;
    }

    // For race condition
    completedExists = await this.checkForCompleted(dupParams);
    if (completedExists) {
      return completedExists;
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
      const newCallbackURLs = [...new Set([...processingJob.parameters.callbackURLs, ...addedCallbackUrls])];
      await this.jobManagerClient.updateJob<IJobParameters>(processingJob.id, {
        parameters: { ...processingJob.parameters, callbackURLs: newCallbackURLs },
      });
      return {
        id: processingJob.id,
        taskIds: processingJob.tasks.map((t) => t.id),
        status: OperationStatus.IN_PROGRESS,
      };
    }
  }
}
