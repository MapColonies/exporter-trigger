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
  callbackURL: string;
  bbox: BBox2d;
  priority?: number;
  packageName: string;
}

export interface IWorkerInput extends ICreatePackage {
  footprint: Polygon | MultiPolygon;
  bbox: BBox2d;
  version: string;
  cswProductId: string;
  tilesPath: string;
  priority: number;
  crs: string;
}

export interface IJobCreationResponse {
  jobId: string;
  taskId: string;
}

export interface IBasicResponse {
  message: string;
}

export enum OperationStatus {
  PENDING = 'Pending',
  IN_PROGRESS = 'In-Progress',
  COMPLETED = 'Completed',
  FAILED = 'Failed',
}

export interface ICreateTaskBody {
  description?: string;
  parameters: Record<string, unknown>;
  reason?: string;
  type?: string;
  status?: OperationStatus;
  attempts?: number;
}

export interface ICreateJobBody {
  resourceId: string;
  version: string;
  parameters: Record<string, unknown>;
  type: string;
  description?: string;
  status?: OperationStatus;
  reason?: string;
  tasks?: ICreateTaskBody[];
}

export interface ICreateJobResponse {
  id: string;
  taskIds: string[];
}
