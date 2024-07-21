import { promises as fsPromise, existsSync, createReadStream } from 'node:fs';
import { parse as parsePath, sep } from 'node:path';
import { createHash } from 'node:crypto';
import checkDiskSpace from 'check-disk-space';
import { degreesPerPixelToZoomLevel, ITileRange, zoomLevelToResolutionMeter } from '@map-colonies/mc-utils';
import { FeatureCollection, Geometry } from '@turf/helpers';
import md5 from 'md5';
import { SpanContext, SpanKind, SpanOptions } from '@opentelemetry/api';
import { IGeometryRecord, IStorageStatusResponse } from './interfaces';
import { ZOOM_ZERO_RESOLUTION } from './constants';

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

export function createSpanMetadata(
  functioName?: string,
  spanKind?: SpanKind,
  context?: { traceId: string; spanId: string }
): { traceContext: SpanContext | undefined; spanOptions: SpanOptions | undefined } {
  const FLAG_SAMPLED = 1;
  if (!context) {
    return { spanOptions: undefined, traceContext: undefined };
  }
  const traceContext: SpanContext = {
    ...context,
    traceFlags: FLAG_SAMPLED,
  };
  const spanOptions: SpanOptions = {
    kind: spanKind,
    links: [
      {
        context: traceContext,
      },
    ],
    attributes: {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      'code.function': functioName,
    },
  };
  return { traceContext, spanOptions };
}

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
