import { Polygon, MultiPolygon } from '@turf/helpers';
import { BBox2d } from '@turf/helpers/dist/js/lib/geojson';
import { ICreateJobBody, IJobResponse, OperationStatus } from '@map-colonies/mc-priority-queue';
import { ITileRange } from '@map-colonies/mc-utils';

export interface IConfig {
  get: <T>(setting: string) => T;
  has: (setting: string) => boolean;
}

export interface OpenApiConfig {
  filePath: string;
  basePath: string;
  jsonPath: string;
  uiPath: string;
}

export interface ICreatePackage {
  dbId: string;
  targetResolution: number;
  crs?: string;
  callbackURLs: string[];
  bbox: BBox2d;
  priority?: number;
  callbackParams?: ICallbackParams;
}

export interface IWorkerInput extends ICreatePackage {
  //footprint: Polygon | MultiPolygon;
  version: string;
  cswProductId: string;
  tilesPath: string;
  //crs: string;
  //productType: string;
  //zoomLevel: number;
}

export interface IBasicResponse {
  message: string;
}

export interface ICreateJobResponse {
  id: string;
  taskIds: string[];
  status: OperationStatus.IN_PROGRESS | OperationStatus.COMPLETED;
}
export interface IFindJob {
  resourceId: string;
  version: string;
  status: string;
  isCleaned: string;
  type: string;
  shouldReturnTasks: string;
}
export interface ICallbackParams {
  fileUri: string;
  expirationTime: Date;
  fileSize: number;
  dbId: string;
  packageName: string;
  bbox: BBox2d | true;
  targetResolution: number;
  requestId: string;
  success: boolean;
  errorReason?: string;
}

export interface ICallbackResposne extends ICallbackParams {
  status: OperationStatus.IN_PROGRESS | OperationStatus.COMPLETED;
}

export interface JobDuplicationParams {
  resourceId: string;
  version: string;
  dbId: string;
  zoomLevel: number;
  crs: string;
  sanitizedBbox: BBox2d;
}

export interface IJobParameters {
  dbId: string;
  targetResolution: number;
  crs: string;
  callbackURLs: string[];
  bbox: BBox2d;
  sanitizedBbox: BBox2d;
  footprint: Polygon | MultiPolygon;
  version: string;
  cswProductId: string;
  tilesPath: string;
  productType: string;
  zoomLevel: number;
  callbackParams?: ICallbackParams;
}

export declare type MergerSourceType = 'S3' | 'GPKG' | 'FS';
export interface ITaskParameters {
  batches: ITileRange[];
  sources: {
    path: string;
    type: MergerSourceType;
    extent?: {
      minX: number;
      minY: number;
      maxX: number;
      maxY: number;
    };
  }[];
}

export type JobResponse = IJobResponse<IJobParameters, ITaskParameters>;
export type CreateJobBody = ICreateJobBody<IJobParameters, ITaskParameters>;
