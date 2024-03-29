import { MultiPolygon, Polygon, BBox, FeatureCollection, Geometry } from '@turf/turf';
import { ICreateJobBody, ICreateTaskBody, IJobResponse, ITaskResponse, OperationStatus } from '@map-colonies/mc-priority-queue';
import { IHttpRetryConfig, ITileRange } from '@map-colonies/mc-utils';
import { TileOutputFormat } from '@map-colonies/mc-model-types';
import { ArtifactType } from './enums';

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
  crs?: string;
  priority?: number;
}

export interface ICleanupData {
  directoryPath?: string;
  cleanupExpirationTimeUTC?: Date;
}

/**
 * @deprecated GetMap API - will be deprecated on future
 */
export interface ICreatePackage extends IBaseCreatePackage {
  targetResolution?: number;
  bbox?: BBox | Polygon | MultiPolygon;
  callbackURLs: string[];
}

export interface ICreatePackageRoi extends IBaseCreatePackage {
  roi?: FeatureCollection;
  callbackURLs?: string[];
  description?: string;
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
  targetFormat?: TileOutputFormat;
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
  callbacks?: ICallbackTargetExport[];
  roi: FeatureCollection;
  fileNamesTemplates: ILinkDefinition;
  description?: string;
}

export interface IBasicResponse {
  message: string;
}

/**
 * @deprecated GetMap API - will be deprecated on future
 */
export interface ICreateJobResponse {
  id: string;
  taskIds: string[];
  status: OperationStatus.IN_PROGRESS | OperationStatus.COMPLETED;
}

export interface ICreateExportJobResponse {
  jobId: string;
  taskIds: string[];
  status: OperationStatus.IN_PROGRESS | OperationStatus.COMPLETED;
  isDuplicated?: boolean;
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
  links?: ILinkDefinition;
  expirationTime?: Date;
  fileSize?: number;
  recordCatalogId: string;
  jobId: string;
  errorReason?: string;
  description?: string;
  artifacts?: IArtifactDefinition[];
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

//todo - should be replaced and imported from exporter SDK
export interface IArtifactDefinition {
  name: string;
  url?: string;
  size?: number;
  type: ArtifactType;
}

/**
 * @deprecated ROI INTERNAL API - will be deprecated on future by shared exporter
 */
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
  callbacks?: ICallbackTargetExport[];
  callbackParams?: ICallbackExportResponse;
  fileNamesTemplates: ILinkDefinition;
  gpkgEstimatedSize?: number;
  cleanupData?: ICleanupData;
}

export interface ITaskFinalizeParameters {
  reason?: string;
  exporterTaskStatus: OperationStatus;
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
  isNewTarget: boolean;
  targetFormat?: TileOutputFormat;
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
  minResolutionDeg: number;
  minZoomLevel: number;
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
export type CreateFinalizeTaskBody = ICreateTaskBody<ITaskFinalizeParameters>;
export type JobFinalizeResponse = IJobResponse<IJobExportParameters, ITaskFinalizeParameters>;

export interface IQueueConfig {
  jobManagerBaseUrl: string;
  heartbeatManagerBaseUrl: string;
  dequeueFinalizeIntervalMs: number;
  heartbeatIntervalMs: number;
  jobType: string;
  tilesTaskType: string;
}

export interface IClientBase {
  url: string;
}

export interface IJobManager extends IClientBase {
  jobDomain: string;
  dequeueFinalizeIntervalMs: number;
}

export interface IRasterCatalogManager extends IClientBase {}

export interface IHeartbeatManager extends IClientBase {
  heartbeatIntervalMs: number;
}

export interface IExternalClientsConfig {
  clientsUrls: {
    jobManager: IJobManager;
    rasterCatalogManager: IRasterCatalogManager;
    heartbeatManager: IHeartbeatManager;
    finalizeTasksAttempts: number;
  };
  exportJobAndTaskTypes: {
    jobType: string;
    taskTilesType: string;
    taskFinalizeType: string;
  };
  httpRetry: IHttpRetryConfig;
  disableHttpClientLogs: boolean;
}
