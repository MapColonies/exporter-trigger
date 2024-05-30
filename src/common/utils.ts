import { promises as fsPromise, existsSync, createReadStream } from 'node:fs';
import { parse as parsePath, sep } from 'node:path';
import { createHash } from 'node:crypto';
import checkDiskSpace from 'check-disk-space';
import { degreesPerPixelToZoomLevel, ITileRange, zoomLevelToResolutionMeter } from '@map-colonies/mc-utils';
import { FeatureCollection, Geometry } from '@turf/helpers';
import md5 from 'md5';
import { INFRA_CONVENTIONS } from '@map-colonies/telemetry/conventions';
import { Link, SpanOptions } from '@opentelemetry/api';
import { ITaskResponse } from '@map-colonies/mc-priority-queue';
import { Logger } from '@map-colonies/js-logger';
import { IGeometryRecord, IStorageStatusResponse, ITaskFinalizeParameters, ITraceParentContext } from './interfaces';
import { ZOOM_ZERO_RESOLUTION } from './constants';

const getSpanLinkOption = (context: ITraceParentContext): Link[] => {
  if (context.traceparent === undefined) {
    throw Error(`TraceParentContext is undefined`);
  }
  const parts = context.traceparent.split('-');
  // eslint-disable-next-line @typescript-eslint/no-magic-numbers
  if (parts.length !== 4) {
    const invalidParts = `${parts.join('|')}`;
    throw Error(`TraceParentContext include not valid traceparent object: ${invalidParts}`);
  }
  const spanLinks: Link[] = [{ context: { spanId: parts[2], traceFlags: parseInt(parts[3]), traceId: parts[1] } }];
  return spanLinks;
};

export const getFileSize = async (filePath: string): Promise<number> => {
  const fileSizeInBytes = (await fsPromise.stat(filePath)).size;
  return Math.trunc(fileSizeInBytes); // Make sure we return an Integer
};

export const getFilesha256Hash = async (filePath: string): Promise<string> => {
  const hash = await getFileHash(filePath, 'sha256');
  return hash;
};

export async function getFileHash(filename: string, algorithm = 'sha256'): Promise<string> {
  if (!existsSync(filename)) {
    throw new Error('File does not exist');
  }
  const hash = createHash(algorithm);

  const input = createReadStream(filename);

  const stream = input.pipe(hash).setEncoding('hex');

  return new Promise((resolve, reject) => {
    input.on('error', reject);
    stream.on('data', resolve);
    stream.on('error', reject);
  });
}

export const getGpkgNameWithoutExt = (packageName: string): string => {
  return parsePath(packageName).name;
};

export const getGpkgRelativePath = (packageName: string, separator: string = sep): string => {
  const packageDirectoryName = getGpkgNameWithoutExt(packageName);
  const packageRelativePath = `${packageDirectoryName}${separator}${packageName}`;
  return packageRelativePath;
};

export const getGpkgFullPath = (gpkgsLocation: string, packageName: string, separator: string = sep): string => {
  const packageDirectoryName = getGpkgNameWithoutExt(packageName);
  const packageFullPath = `${gpkgsLocation}${separator}${packageDirectoryName}${separator}${packageName}`;
  return packageFullPath;
};

export const concatFsPaths = (..._dirs: string[]): string => {
  const fullPath: string = _dirs.join(sep);
  return fullPath;
};

export const getStorageStatus = async (gpkgsLocation: string): Promise<IStorageStatusResponse> => {
  return checkDiskSpace(gpkgsLocation);
};

export const calculateEstimateGpkgSize = (batches: ITileRange[], tileEstimatedSize: number): number => {
  let totalTilesCount = 0;
  batches.forEach((batch) => {
    const width = batch.maxX - batch.minX;
    const height = batch.maxY - batch.minY;
    const area = width * height;
    totalTilesCount += area;
  });
  const gpkgEstimatedSize = totalTilesCount * tileEstimatedSize;
  return gpkgEstimatedSize;
};

/**
 * generated unique hashed string value for FeatureCollection geography - notice! features order influence on hashing
 * @param geo FeatureCollection object
 * @returns md5 hashed string
 */
export const generateGeoIdentifier = (geo: FeatureCollection): string => {
  const stringifiedGeo = JSON.stringify(geo);
  const additionalIdentifiers = md5(stringifiedGeo);
  return additionalIdentifiers;
};

/**
 * This function parse Task and generate SpanOption object to be passed, attach Link object to Span parent if exists, and metadata attributes
 * @param tilesTask export task to be executed
 * @returns SpanOption object with attributes and optional links array
 */
export const getInitialSpanOption = (tilesTask: ITaskResponse<ITaskFinalizeParameters>, logger: Logger): SpanOptions => {
  const spanOptions: SpanOptions = {
    attributes: {
      [INFRA_CONVENTIONS.infra.jobManagement.jobId]: tilesTask.jobId,
      [INFRA_CONVENTIONS.infra.jobManagement.taskId]: tilesTask.id,
    },
  };
  try {
    if (tilesTask.parameters.traceParentContext) {
      const spanLinks = getSpanLinkOption(tilesTask.parameters.traceParentContext); // add link to trigging parent trace (overseer)
      spanOptions.links = spanLinks;
    }
  } catch (err) {
    const logWarnMsg = `No trace parent link data exists`;
    const logObj = { jobId: tilesTask.jobId, taskId: tilesTask.id, err };
    logger.warn({ ...logObj, msg: logWarnMsg });
  }
  return spanOptions;
};

export const parseFeatureCollection = (featuresCollection: FeatureCollection): IGeometryRecord[] => {
  const parsedGeoRecord: IGeometryRecord[] = [];
  featuresCollection.features.forEach((feature) => {
    if (feature.properties && (feature.properties.maxResolutionDeg as number)) {
      const targetResolutionDeg = feature.properties.maxResolutionDeg as number;
      const zoomLevel = degreesPerPixelToZoomLevel(targetResolutionDeg);
      const targetResolutionMeter = zoomLevelToResolutionMeter(zoomLevel) as number;
      const minResolutionDeg =
        feature.properties.minResolutionDeg !== undefined ? (feature.properties.minResolutionDeg as number) : ZOOM_ZERO_RESOLUTION;
      const minZoomLevel = degreesPerPixelToZoomLevel(minResolutionDeg);
      parsedGeoRecord.push({
        geometry: feature.geometry as Geometry,
        targetResolutionDeg,
        targetResolutionMeter,
        minResolutionDeg,
        minZoomLevel,
        zoomLevel,
      });
    }
  });
  return parsedGeoRecord;
};
