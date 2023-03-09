import { MultiPolygon, Polygon, BBox, FeatureCollection, Geometry } from '@turf/turf';
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

export interface IBaseCreatePackage {
  dbId: string;
  callbackURLs: string[];
  crs?: string;
  priority?: number;
}

export interface ICleanupData {
  directoryPath?: string;
  cleanupExpirationTime?: Date;
}

/**
 * @deprecated GetMap API - will be deprecated on future
 */
export interface ICreatePackage extends IBaseCreatePackage {
  targetResolution?: number;
  bbox?: BBox | Polygon | MultiPolygon;
}

export interface ICreatePackageRoi extends IBaseCreatePackage {
  roi?: FeatureCollection;
}

export interface ICallbackBase {
  url: string;
}

/**
 * @deprecated GetMap API - will be deprecated on future
 */
export interface ICallbackTarget extends ICallbackBase {
  bbox: BBox | Polygon;
}

export interface ICallbackTargetExport extends ICallbackBase {
  roi: FeatureCollection;
}

export interface IWorkerInputBase {
  dbId: string;
  relativeDirectoryPath: string;
  exportVersion: ExportVersion;
  priority?: number;
  crs: string;
  version: string;
  cswProductId: string;
  productType: string;
  batches: ITileRange[];
  sources: IMapSource[];
  gpkgEstimatedSize?: number;
}

/**
 * @deprecated GetMap API - will be deprecated on future
 */
export interface IWorkerInput extends IWorkerInputBase {
  targetResolution: number;
  fileName: string;
  callbacks: ICallbackTarget[];
  sanitizedBbox: BBox;
  zoomLevel: number;
}

export interface IWorkerExportInput extends IWorkerInputBase {
  callbacks: ICallbackTargetExport[];
  roi: FeatureCollection;
  fileNamesTemplates: ILinkDefinition;
}

export interface IBasicResponse {
  message: string;
}

export interface ICreateJobResponse {
  id: string;
  taskIds: string[];
  status: OperationStatus.IN_PROGRESS | OperationStatus.COMPLETED;
}

/**
 * @deprecated GetMap API - will be deprecated on future
 */
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

export interface ICallbackDataExportBase {
  links: ILinkDefinition;
  expirationTime: Date;
  fileSize: number;
  recordCatalogId: string;
  requestJobId: string;
  errorReason?: string;
}

/**
 * @deprecated GetMap API - will be deprecated on future
 */
export interface ICallbackData extends ICallbackDataBase {
  bbox: BBox | Polygon | MultiPolygon;
}

export interface ICallbackExportData extends ICallbackDataExportBase {
  roi: FeatureCollection;
}

/**
 * @deprecated GetMap API - will be deprecated on future
 */
export interface ICallbackResposne extends ICallbackData {
  status: OperationStatus.IN_PROGRESS | OperationStatus.COMPLETED;
}

export interface ILinkDefinition {
  dataURI: string;
  metadataURI: string;
}

export interface ICallbackExportResponse extends ICallbackExportData {
  status: OperationStatus.IN_PROGRESS | OperationStatus.COMPLETED | OperationStatus.FAILED;
}

/**
 * @deprecated GetMap API - will be deprecated on future
 */
export interface JobDuplicationParams {
  resourceId: string;
  version: string;
  dbId: string;
  zoomLevel: number;
  crs: string;
  sanitizedBbox: BBox;
}

export interface JobExportDuplicationParams {
  resourceId: string;
  version: string;
  dbId: string;
  crs: string;
  roi: FeatureCollection;
}

/**
 * @deprecated GetMap API - will be deprecated on future
 */
export interface IJobParameters {
  targetResolution: number;
  relativeDirectoryPath: string;
  crs: string;
  exportVersion: ExportVersion;
  callbacks: ICallbackTarget[];
  sanitizedBbox: BBox;
  zoomLevel: number;
  callbackParams?: ICallbackDataBase;
  fileName: string;
  gpkgEstimatedSize?: number;
  cleanupData?: ICleanupData;
}

export interface IJobExportParameters {
  relativeDirectoryPath: string;
  crs: string;
  exportVersion: ExportVersion;
  roi: FeatureCollection;
  callbacks: ICallbackTargetExport[];
  callbackParams?: ICallbackExportResponse;
  fileNamesTemplates: ILinkDefinition;
  gpkgEstimatedSize?: number;
  cleanupData?: ICleanupData;
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

/**
 * @deprecated GetMap API - will be deprecated on future
 */
export interface IInput {
  jobId: string;
  footprint?: Polygon | MultiPolygon;
  bbox: BBox | true;
  zoomLevel: number;
  packageName: string;
  callbackURLs: string[];
  dbId: string;
}

/**
 * @deprecated GetMap API - will be deprecated on future
 */
export interface IJobStatusResponse {
  completedJobs: JobResponse[] | undefined;
  failedJobs: JobResponse[] | undefined;
}

export interface IExportJobStatusResponse {
  completedJobs: JobExportResponse[] | undefined;
  failedJobs: JobExportResponse[] | undefined;
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

export interface IGeometryRecordBase {
  zoomLevel: number;
  sanitizedBox?: BBox | null | undefined;
}

export interface IGeometryRecord extends IGeometryRecordBase {
  geometry?: Geometry;
  targetResolutionDeg: number;
  targetResolutionMeter: number;
}

// todo - Temporary enum to define old\new api - will be removed after deleting getMap API
export enum ExportVersion {
  GETMAP = 'GETMAP',
  ROI = 'ROI',
}

/**
 * @deprecated GetMap API - will be deprecated on future
 */
export type JobResponse = IJobResponse<IJobParameters, ITaskParameters>;
export type TaskResponse = ITaskResponse<ITaskParameters>;
/**
 * @deprecated GetMap API - will be deprecated on future
 */
export type CreateJobBody = ICreateJobBody<IJobParameters, ITaskParameters>;

// new API based on multi resolution
export type JobExportResponse = IJobResponse<IJobExportParameters, ITaskParameters>;
export type CreateExportJobBody = ICreateJobBody<IJobExportParameters, ITaskParameters>;
