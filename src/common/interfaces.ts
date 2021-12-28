import { Polygon, MultiPolygon } from '@turf/helpers';
import { BBox2d } from '@turf/helpers/dist/js/lib/geojson';
import { JobStatus } from './enums';

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
  callbackURL: string[];
  bbox: BBox2d;
  priority?: number;
  callbackParams?: ICallbackResponse;
}

export interface IWorkerInput extends ICreatePackage {
  footprint: Polygon | MultiPolygon;
  version: string;
  cswProductId: string;
  tilesPath: string;
  priority: number;
  crs: string;
  packageName: string;
  productType: string;
}

export interface IBasicResponse {
  message: string;
}

export interface ICreateTaskBody {
  description?: string;
  parameters: Record<string, unknown>;
  reason?: string;
  type?: string;
  status?: JobStatus;
  attempts?: number;
}

export interface ICreateJobBody<T> {
  resourceId: string;
  version: string;
  parameters: ICreatePackage;
  type: string;
  description?: string;
  status?: JobStatus;
  reason?: string;
  tasks?: T[];
  expirationDate: Date;
  internalId: string;
  productName: string;
  productType: string;
}

export interface ICreateJobResponse {
  jobId: string;
  taskIds: string[];
}

export interface IJob {
  id: string;
  resourceId: string;
  version: string;
  description?: string;
  parameters: ICreatePackage;
  reason?: string;
  created: Date;
  updated: Date;
  status: JobStatus;
  percentage?: number;
  isCleaned: boolean;
  priority: number;
  tasks?: unknown[];
}

export interface IUpdateJob {
  status?: JobStatus;
  percentage?: number;
  reason?: string;
  isCleaned?: boolean;
  priority?: number;
  expirationDate?: Date;
  parameters?: ICreatePackage;
}

export interface IFindJob {
  resourceId: string;
  version: string;
  status: string;
  isCleaned: string;
  type: string;
  shouldReturnTasks: string;
}
export interface ICallbackResponse {
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

export interface JobDuplicationParams {
  resourceId: string;
  version: string;
  dbId: string;
  targetResolution: number;
  crs: string;
  bbox: BBox2d;
}
