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

export interface ICreateJobBody<T, P> {
  resourceId: string;
  version: string;
  parameters: P;
  type: string;
  description?: string;
  status?: JobStatus;
  reason?: string;
  tasks?: T[];
  expirationDate: Date;
}

export interface ICreateJobResponse {
  jobId: string;
  taskIds: string[];
}

export interface IJob<T> {
  id: string;
  resourceId: string;
  version: string;
  description?: string;
  parameters: T;
  reason?: string;
  created: Date;
  updated: Date;
  status: JobStatus;
  percentage?: number;
  isCleaned: boolean;
  priority: number;
  tasks?: unknown[];
}

export interface IUpdateJob<T> {
  status?: JobStatus;
  percentage?: number;
  reason?: string;
  isCleaned?: boolean;
  priority?: number;
  expirationDate?: Date;
  parameters: T;
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
