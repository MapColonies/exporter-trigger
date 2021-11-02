import { inject, injectable } from 'tsyringe';
import { degreesPerPixelToZoomLevel, HttpClient, IHttpRetryConfig } from '@map-colonies/mc-utils';
import config from 'config';
import { Logger } from '@map-colonies/js-logger';
import { ICreateJobBody, ICreateJobResponse, IJobCreationResponse, IWorkerInput } from '../common/interfaces';
import { SERVICES } from '../common/constants';

@injectable()
export class JobManagerClient extends HttpClient {
  private readonly tilesJobType: string;
  private readonly tilesTaskType: string;
  private readonly expirationTime: number;

  public constructor(@inject(SERVICES.LOGGER) protected readonly logger: Logger) {
    super(logger, config.get<string>('jobManager.url'), 'JobManager', config.get<IHttpRetryConfig>('httpRetry'));
    this.expirationTime = config.get<number>('jobManager.expirationTime');
    this.tilesJobType = config.get<string>('workerTypes.tiles.jobType');
    this.tilesTaskType = config.get<string>('workerTypes.tiles.taskType');
  }

  public async createJob(data: IWorkerInput): Promise<IJobCreationResponse> {
    const { cswProductId: resourceId, version } = data;
    const createLayerTasksUrl = `/jobs`;
    const zoomLevel = degreesPerPixelToZoomLevel(data.targetResolution);

    const expirationTime = new Date();
    expirationTime.setDate(expirationTime.getDate() + this.expirationTime);

    const createJobRequest: ICreateJobBody = {
      resourceId: resourceId,
      version: version,
      type: this.tilesJobType,
      parameters: {
        ...data,
        userId: 'tester', // TODO: replace with request value
      },
      tasks: [
        {
          type: this.tilesTaskType,
          parameters: {
            dbId: data.dbId,
            crs: data.crs,
            zoomLevel,
            callbackURL: data.callbackURL,
            bbox: data.bbox,
            expirationTime: expirationTime,
            priority: data.priority,
            tilesPath: data.tilesPath,
            footprint: data.footprint,
            packageName: data.packageName,
          },
        },
      ],
    };

    this.logger.info(`Creating job and task for ${data.dbId}`);
    this.logger.debug(JSON.stringify(createJobRequest));

    const res = await this.post<ICreateJobResponse>(createLayerTasksUrl, createJobRequest);
    return {
      jobId: res.id,
      taskId: res.taskIds[0],
    };
  }
}
