import { BBox2d } from '@turf/helpers/dist/js/lib/geojson';
import { ICreateJobBody, IJobResponse, ITaskResponse, OperationStatus } from '@map-colonies/mc-priority-queue';
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
}

export interface ICallbackTarget {
  url: string;
  bbox: BBox2d;
}

export interface IWorkerInput {
  dbId: string;
  targetResolution: number;
  priority?: number;
  callbacks: ICallbackTarget[];
  crs: string;
  sanitizedBbox: BBox2d;
  zoomLevel: number;
  version: string;
  cswProductId: string;
  productType: string;
  batches: ITileRange[];
  sources: IMapSource[];
}

export interface IBasicResponse {
  message: string;
}

export interface ICreateJobResponse {
  id: string;
  taskIds: string[];
  status: OperationStatus.IN_PROGRESS | OperationStatus.COMPLETED;
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
  targetResolution: number;
  crs: string;
  callbacks: ICallbackTarget[];
  sanitizedBbox: BBox2d;
  zoomLevel: number;
  callbackParams?: ICallbackParams;
}

export declare type MergerSourceType = 'S3' | 'GPKG' | 'FS';

export interface IMapSource {
  path: string;
  type: MergerSourceType;
  extent?: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
}
export interface ITaskParameters {
  batches: ITileRange[];
  sources: IMapSource[];
}

export type JobResponse = IJobResponse<IJobParameters, ITaskParameters>;
export type TaskResponse = ITaskResponse<ITaskParameters>;
export type CreateJobBody = ICreateJobBody<IJobParameters, ITaskParameters>;
