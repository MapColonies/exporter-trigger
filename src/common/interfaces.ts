import { MultiPolygon, Polygon, BBox, FeatureCollection } from '@turf/turf';
import { ICreateJobBody, IJobResponse, ITaskResponse, OperationStatus } from '@map-colonies/mc-priority-queue';
import { ITileRange } from '@map-colonies/mc-utils';
import { Geometry } from '@turf/turf';

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

export interface IBaseCreatePackage {
  dbId: string;
  callbackURLs: string[];
  crs?: string;
  priority?: number;
}

export interface ICreatePackage extends IBaseCreatePackage {
  targetResolution?: number;
  bbox?: BBox | Polygon | MultiPolygon;
}

export interface ICreatePackageMultiRes extends IBaseCreatePackage {
  roi?: FeatureCollection;
}

export interface ICallbackTarget {
  url: string;
  bbox: BBox | Polygon;
}

export interface IWorkerInput {
  dbId: string;
  targetResolution: number;
  fileName: string;
  relativeDirectoryPath: string;
  priority?: number;
  callbacks: ICallbackTarget[];
  crs: string;
  sanitizedBbox: BBox;
  zoomLevel: number;
  version: string;
  cswProductId: string;
  productType: string;
  batches: ITileRange[];
  sources: IMapSource[];
  gpkgEstimatedSize?: number;
}

export interface IBasicResponse {
  message: string;
}

export interface ICreateJobResponse {
  id: string;
  taskIds: string[];
  status: OperationStatus.IN_PROGRESS | OperationStatus.COMPLETED;
}

export interface ICallbackDataBase {
  fileUri: string;
  expirationTime: Date;
  fileSize: number;
  dbId: string;
  packageName: string;
  targetResolution: number;
  requestId: string;
  success: boolean;
  errorReason?: string;
}

export interface ICallbackData extends ICallbackDataBase {
  bbox: BBox | Polygon | MultiPolygon;
}

export interface ICallbackResposne extends ICallbackData {
  status: OperationStatus.IN_PROGRESS | OperationStatus.COMPLETED;
}

export interface JobDuplicationParams {
  resourceId: string;
  version: string;
  dbId: string;
  zoomLevel: number;
  crs: string;
  sanitizedBbox: BBox;
}

export interface IJobParameters {
  targetResolution: number;
  relativeDirectoryPath: string;
  crs: string;
  callbacks: ICallbackTarget[];
  sanitizedBbox: BBox;
  zoomLevel: number;
  callbackParams?: ICallbackDataBase;
  fileName: string;
  gpkgEstimatedSize?: number;
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

export interface IInput {
  jobId: string;
  footprint?: Polygon | MultiPolygon;
  bbox: BBox | true;
  zoomLevel: number;
  packageName: string;
  callbackURLs: string[];
  dbId: string;
}

export interface IJobStatusResponse {
  completedJobs: JobResponse[] | undefined;
  failedJobs: JobResponse[] | undefined;
}

export interface IStorageStatusResponse {
  free: number;
  size: number;
}

export interface IStorageEstimation {
  jpegTileEstimatedSizeInBytes: number;
  pngTileEstimatedSizeInBytes: number;
  storageFactorBuffer: number;
  validateStorageSize: boolean;
}

export interface IGeometryRecord {
  geometry: Geometry;
  zoomLevel: number;
  targetResolution: number;
  sanitizedBox?: BBox | null | undefined;
}

export type JobResponse = IJobResponse<IJobParameters, ITaskParameters>;
export type TaskResponse = ITaskResponse<ITaskParameters>;
export type CreateJobBody = ICreateJobBody<IJobParameters, ITaskParameters>;
