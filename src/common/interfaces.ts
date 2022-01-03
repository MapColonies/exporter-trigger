import { ICreateJobBody, IJobResponse, OperationStatus } from '@map-colonies/mc-priority-queue';
import { Polygon, MultiPolygon } from '@turf/helpers';
import { BBox2d } from '@turf/helpers/dist/js/lib/geojson';

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
  footprint: Polygon | MultiPolygon;
  version: string;
  cswProductId: string;
  tilesPath: string;
  crs: string;
  packageName: string;
  productType: string;
  zoomLevel: number;
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
  bbox: BBox2d;
}

export interface IJobParameters {
  dbId: string;
  targetResolution: number;
  crs: string;
  callbackURLs: string[];
  bbox: BBox2d;
  packageName: string;
  footprint: Polygon | MultiPolygon;
  version: string;
  cswProductId: string;
  tilesPath: string;
  productType: string;
  zoomLevel: number;
  callbackParams?: ICallbackParams;
}

export interface ITaskParameters {
  callbackURLs: string[];
  bbox: BBox2d | true;
  dbId: string;
  footprint: Polygon | MultiPolygon;
  tilesPath: string;
  zoomLevel: number;
  packageName: string;
  productType: string;
  crs: string;
}

export type JobResponse = IJobResponse<IJobParameters, ITaskParameters>;
export type CreateJobBody = ICreateJobBody<IJobParameters, ITaskParameters>;
