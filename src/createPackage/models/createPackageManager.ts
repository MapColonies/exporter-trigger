import { sep } from 'path';
import { Logger } from '@map-colonies/js-logger';
import { Polygon, MultiPolygon } from '@turf/turf';
import { inject, injectable } from 'tsyringe';
import { BBox2d } from '@turf/helpers/dist/js/lib/geojson';
import { degreesPerPixelToZoomLevel } from '@map-colonies/mc-utils';
import { RasterCatalogManagerClient } from '../../clients/rasterCatalogManagerClient';
import { DEFAULT_CRS, DEFAULT_PRIORITY, DEFAULT_PRODUCT_TYPE, SERVICES } from '../../common/constants';
import { ICreatePackage, ICreateJobResponse, IWorkerInput, JobDuplicationParams, ICallbackResponse } from '../../common/interfaces';
import { JobManagerClient } from '../../clients/jobManagerClient';

@injectable()
export class CreatePackageManager {
  public constructor(
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(JobManagerClient) private readonly jobManagerClient: JobManagerClient,
    @inject(RasterCatalogManagerClient) private readonly rasterCatalogManager: RasterCatalogManagerClient
  ) {}

  public async createPackage(userInput: ICreatePackage): Promise<ICreateJobResponse | ICallbackResponse> {
    const layer = await this.rasterCatalogManager.findLayer(userInput.dbId);
    const layerMetadata = layer.metadata;

    const { productId: resourceId, productVersion: version, footprint, productType } = layerMetadata;
    const { bbox, dbId, targetResolution, crs, priority, callbackURL } = userInput;

    const dupParams: JobDuplicationParams = {
      resourceId: resourceId as string,
      version: version as string,
      dbId,
      targetResolution,
      bbox,
      crs: crs ?? DEFAULT_CRS,
    };

    const duplicationExist = await this.checkForDuplicate(dupParams, userInput.callbackURL);
    if (!duplicationExist) {
      const packageName = this.generatePackageName(userInput.dbId, userInput.targetResolution, userInput.bbox);
      const workerInput: IWorkerInput = {
        bbox,
        targetResolution,
        dbId,
        packageName,
        callbackURL,
        version: version as string,
        cswProductId: resourceId as string,
        footprint: footprint as Polygon | MultiPolygon,
        tilesPath: (resourceId as string) + sep + (version as string) + sep + (layerMetadata.productType as string),
        priority: priority ?? DEFAULT_PRIORITY,
        crs: crs ?? DEFAULT_CRS,
        productType: productType ?? DEFAULT_PRODUCT_TYPE,
      };

      const jobCreated = await this.jobManagerClient.createJob(workerInput);
      return jobCreated;
    }

    return duplicationExist;
  }

  private generatePackageName(cswId: string, resolution: number, bbox: BBox2d): string {
    const numberOfDecimals = 5;
    const zoomLevel = degreesPerPixelToZoomLevel(resolution);
    const bboxToString = bbox.map((val) => String(val.toFixed(numberOfDecimals)).replace('.', '_')).join('');
    return `gm_${cswId.replace(/-/g, '_')}_${zoomLevel}_${bboxToString}`;
  }

  private async checkForDuplicate(
    dupParams: JobDuplicationParams,
    callbackUrls: string[]
  ): Promise<ICallbackResponse | ICreateJobResponse | undefined> {
    const completedExists = await this.checkForCompleted(dupParams);
    if (completedExists) {
      return completedExists;
    }

    const processingExists = await this.checkForProcessing(dupParams, callbackUrls);
    if (processingExists) {
      return processingExists;
    }

    return undefined;
  }

  private async checkForCompleted(dupParams: JobDuplicationParams): Promise<ICallbackResponse | undefined> {
    this.logger.debug(`Checking for duplications with parameters: ${JSON.stringify(dupParams)}`);
    const responseJob = await this.jobManagerClient.findCompletedJob(dupParams);
    if (responseJob) {
      return responseJob.parameters.callbackParams;
    }
  }

  private async checkForProcessing(jobParams: JobDuplicationParams, addedCallbackUrls: string[]): Promise<ICreateJobResponse | undefined> {
    const processingJob = (await this.jobManagerClient.findInProgressJob(jobParams)) ?? (await this.jobManagerClient.findPendingJob(jobParams));

    if (processingJob) {
      const newCallbackURLs = [...new Set([...processingJob.parameters.callbackURL, ...addedCallbackUrls])];
      await this.jobManagerClient.updateJob(processingJob.id, {
        parameters: { ...processingJob.parameters, callbackURL: newCallbackURLs },
      });
      return {
        jobId: processingJob.id,
        taskIds: processingJob.tasks?.map((t) => (t as { id: string }).id) as string[],
      };
    }

  }
}
