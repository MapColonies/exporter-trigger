import { IRasterCatalogUpsertRequestBody } from '@map-colonies/mc-model-types';
import { ICreateJobBody, IJobResponse, OperationStatus } from '@map-colonies/mc-priority-queue';
import {
  CallbackUrlsTargetArray,
  ExportJobParameters,
  FileNamesTemplates,
  PolygonPartsEntityName,
  RasterProductTypes,
  RoiFeatureCollection,
  TileFormatStrategy,
  TileOutputFormat,
} from '@map-colonies/raster-shared';
import { BBox, Geometry } from 'geojson';

export type BBox2d = [number, number, number, number];

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

export interface ICreateExportJobResponse {
  jobId: string;
  status: OperationStatus.PENDING | OperationStatus.COMPLETED | OperationStatus.IN_PROGRESS;
  isDuplicated?: boolean;
  percentage?: number;
}

export interface IStorageStatusResponse {
  free: number;
  size: number;
}

export interface IJobStatusResponse {
  percentage?: number;
  status: OperationStatus;
}

export type LayerInfo = Required<IRasterCatalogUpsertRequestBody>;

export interface IGeometryRecordBase {
  zoomLevel: number;
  sanitizedBox?: BBox | null;
}

export interface IGeometryRecord extends IGeometryRecordBase {
  geometry?: Geometry;
  targetResolutionDeg: number;
  targetResolutionMeter: number;
  minResolutionDeg: number;
  minZoomLevel: number;
}

export interface JobExportDuplicationParams {
  productId: string;
  version: string;
  catalogId: string;
  crs: string;
  roi: RoiFeatureCollection;
}

export interface ITaskParameters {
  blockDuplication?: boolean;
}

export interface IExportInitRequest {
  crs: string;
  roi: RoiFeatureCollection;
  callbackUrls?: CallbackUrlsTargetArray;
  fileNamesTemplates: FileNamesTemplates;
  relativeDirectoryPath: string;
  catalogId: string;
  priority?: number;
  version: string;
  productId: string;
  productName: string;
  productType: RasterProductTypes;
  packageRelativePath: string;
  gpkgEstimatedSize: number;
  targetFormat: TileOutputFormat;
  outputFormatStrategy: TileFormatStrategy;
  description?: string;
  jobTrackerUrl: string;
  polygonPartsEntityName: PolygonPartsEntityName;
}

export type CreateExportJobBody = ICreateJobBody<ExportJobParameters, ITaskParameters>;

export interface IStorageEstimation {
  jpegTileEstimatedSizeInBytes: number;
  pngTileEstimatedSizeInBytes: number;
  storageFactorBuffer: number;
}

export type JobExportResponse = IJobResponse<ExportJobParameters, unknown>;
