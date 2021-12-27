import { sep } from 'path';
import { Logger } from '@map-colonies/js-logger';
import { LayerMetadata } from '@map-colonies/mc-model-types';
import { Polygon, MultiPolygon } from '@turf/turf';
import { inject, injectable } from 'tsyringe';
import { RasterCatalogManagerClient } from '../../clients/rasterCatalogManagerClient';
import { DEFAULT_CRS, DEFAULT_PRIORITY, DEFAULT_PRODUCT_TYPE, SERVICES } from '../../common/constants';
import { ICreatePackage, ICreateJobResponse, IWorkerInput, JobDuplicationParams, ICallbackResponse } from '../../common/interfaces';
import { JobManagerClient } from '../../clients/jobManagerClient';
import { BBox2d } from '@turf/helpers/dist/js/lib/geojson';
import { degreesPerPixelToZoomLevel } from '@map-colonies/mc-utils';

@injectable()
export class CreatePackageManager {
  public constructor(
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(JobManagerClient) private readonly jobManagerClient: JobManagerClient,
    @inject(RasterCatalogManagerClient) private readonly rasterCatalogManager: RasterCatalogManagerClient
  ) {}

  private generatePackageName(cswId: string, resolution: number, bbox: BBox2d): string {
    const zoomLevel = degreesPerPixelToZoomLevel(resolution);
    const bboxToString = bbox.map((val) => String(val.toFixed(5)).replace('.', '_')).join('');
    return `gm_${cswId.replace(/-/g, '_')}_${zoomLevel}_${bboxToString}`;
  }

  private async checkForDuplicate(dupParams: JobDuplicationParams, callbackUrls: string[]) {
    const completedExists = await this.checkForCompleted(dupParams);
    if (completedExists) return completedExists;

    const processingExists = await this.checkForProcessing(dupParams, callbackUrls);
    if (processingExists) return processingExists;
  }

  private async checkForCompleted(dupParams: JobDuplicationParams): Promise<ICallbackResponse | undefined> {
    this.logger.debug(`Checking for duplications with parameters: ${JSON.stringify(dupParams)}`);
    let responseJob = await this.jobManagerClient.findCompletedJobs(dupParams);
    if (responseJob) return responseJob;
  }

  public async checkForProcessing(jobParams: JobDuplicationParams, addedCallbackUrls: string[]): Promise<ICreateJobResponse | undefined> {
    const processingJob = (await this.jobManagerClient.findPendingJob(jobParams)) || (await this.jobManagerClient.findInProgressJob(jobParams));
    
    if (processingJob) {
      const newCallbackURLs = [...new Set([...processingJob.parameters.callbackURL ,...addedCallbackUrls])];
      await this.jobManagerClient.updateJob(processingJob.id, {
        parameters: { ...processingJob.parameters, callbackURL: newCallbackURLs  },
      });
      return {
        jobId: processingJob.id,
        taskIds: processingJob.tasks?.map(t => (t as unknown as {id: string}).id) as string[],
      };
    }
  }

  public async createPackage(userInput: ICreatePackage): Promise<ICreateJobResponse | ICallbackResponse> {
    const layer = await this.rasterCatalogManager.findLayer(userInput.dbId);
    const layerMetadata = layer.metadata as LayerMetadata;

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
        tilesPath: (resourceId as string) + sep + (version as string),
        priority: priority ?? DEFAULT_PRIORITY,
        crs: crs ?? DEFAULT_CRS,
        productType: productType ?? DEFAULT_PRODUCT_TYPE,
      };

      const jobCreated = await this.jobManagerClient.createJob(workerInput);
      return jobCreated;
    }

    return duplicationExist;
  }
}
