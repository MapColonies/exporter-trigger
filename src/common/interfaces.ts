import { BBox, FeatureCollection, Geometry } from '@turf/helpers';
import { ICreateJobBody, ICreateTaskBody, IJobResponse, ITaskResponse, OperationStatus } from '@map-colonies/mc-priority-queue';
import { IHttpRetryConfig, ITileRange } from '@map-colonies/mc-utils';
import { TileOutputFormat } from '@map-colonies/mc-model-types';
import { SpanContext } from '@opentelemetry/api';
import { ArtifactType, TileFormatStrategy } from './enums';

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

export interface ICleanupData {
  directoryPath?: string;
  cleanupExpirationTimeUTC?: Date;
}

export interface ICreatePackageRoi {
  dbId: string;
  crs?: string;
  priority?: number;
  roi?: FeatureCollection;
  callbackURLs?: string[];
  description?: string;
}

export interface ICallbackTargetExport {
  url: string;
  roi: FeatureCollection;
}

export interface IWorkerExportInput {
  dbId: string;
  relativeDirectoryPath: string;
  priority?: number;
  crs: string;
  version: string;
  cswProductId: string;
  productType: string;
  batches: ITileRange[];
  sources: IMapSource[];
  gpkgEstimatedSize?: number;
  targetFormat?: TileOutputFormat;
  outputFormatStrategy?: TileFormatStrategy;
  callbacks?: ICallbackTargetExport[];
  roi: FeatureCollection;
  fileNamesTemplates: ILinkDefinition;
  description?: string;
  traceContext: SpanContext;
}

export interface IBasicResponse {
  message: string;
}

export interface ICreateExportJobResponse {
  jobId: string;
  taskIds: string[];
  status: OperationStatus.IN_PROGRESS | OperationStatus.COMPLETED;
  isDuplicated?: boolean;
  traceContext?: SpanContext;
}

export interface ICallbackExportData {
  links?: ILinkDefinition;
  expirationTime?: Date;
  fileSize?: number;
  recordCatalogId: string;
  jobId: string;
  errorReason?: string;
  description?: string;
  artifacts?: IArtifactDefinition[];
  roi: FeatureCollection;
}

//todo - should be replaced and imported from exporter SDK
export interface IArtifactDefinition {
  name: string;
  url?: string;
  size?: number;
  type: ArtifactType;
}

//ROI INTERNAL API - will be deprecated on future by shared exporter
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

export interface IJobExportParameters {
  relativeDirectoryPath: string;
  crs: string;
  roi: FeatureCollection;
  callbacks?: ICallbackTargetExport[];
  callbackParams?: ICallbackExportResponse;
  fileNamesTemplates: ILinkDefinition;
  gpkgEstimatedSize?: number;
  cleanupData?: ICleanupData;
  traceContext?: SpanContext;
}

export interface ITaskFinalizeParameters {
  reason?: string;
  exporterTaskStatus: OperationStatus;
  traceParentContext?: SpanContext;
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
  outputFormatStrategy?: TileFormatStrategy;
  batches: ITileRange[];
  sources: IMapSource[];
  traceParentContext?: SpanContext;
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
  httpRetry: IHttpRetryConfig;
  disableHttpClientLogs: boolean;
}

//consider changing from nested interface
export interface IJobDefinitions {
  jobs: {
    export: { type: string };
  };
  tasks: {
    export: { type: string };
  };
}
