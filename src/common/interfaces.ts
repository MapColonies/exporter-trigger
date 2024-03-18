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

export interface IWorkerExportInput extends IWorkerInputBase {
  callbacks?: ICallbackTargetExport[];
  roi: FeatureCollection;
  fileNamesTemplates: ILinkDefinition;
  description?: string;
}

export interface IBasicResponse {
  message: string;
}

export interface ICreateExportJobResponse {
  jobId: string;
  taskIds: string[];
  status: OperationStatus.IN_PROGRESS | OperationStatus.COMPLETED;
  isDuplicated?: boolean;
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

export interface ICallbackExportData extends ICallbackDataExportBase {
  roi: FeatureCollection;
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

export interface JobExportDuplicationParams {
  resourceId: string;
  version: string;
  dbId: string;
  crs: string;
  roi: FeatureCollection;
}


export interface IJobParameters {
  targetResolution: number;
  relativeDirectoryPath: string;
  crs: string;
  exportVersion: ExportVersion;
  sanitizedBbox: BBox;
  zoomLevel: number;
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

export type TaskResponse = ITaskResponse<ITaskParameters>;

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
