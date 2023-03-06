/* eslint-disable @typescript-eslint/naming-convention */

import { promises as fsPromise } from 'fs';
import { parse as parsePath } from 'path';
import { sep } from 'path';
import checkDiskSpace from 'check-disk-space';
import { degreesPerPixelToZoomLevel, ITileRange, zoomLevelToResolutionMeter } from '@map-colonies/mc-utils';
import { FeatureCollection, Geometry } from '@turf/helpers';
import md5 from 'md5';
import { IGeometryRecord, IStorageStatusResponse } from './interfaces';

export const getFileSize = async (filePath: string): Promise<number> => {
  const fileSizeInBytes = (await fsPromise.stat(filePath)).size;
  return Math.trunc(fileSizeInBytes); // Make sure we return an Integer
};

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

export const parseFeatureCollection = (featuresCollection: FeatureCollection): IGeometryRecord[] => {
  const parsedGeoRecord: IGeometryRecord[] = [];
  featuresCollection.features.forEach((feature) => {
    if (feature.properties && (feature.properties.maxResolutionDeg as number)) {
      const targetResolutionDeg = feature.properties.maxResolutionDeg as number;
      const zoomLevel = degreesPerPixelToZoomLevel(targetResolutionDeg);
      const targetResolutionMeter = zoomLevelToResolutionMeter(zoomLevel) as number;
      parsedGeoRecord.push({
        geometry: feature.geometry as Geometry,
        targetResolutionDeg,
        targetResolutionMeter,
        zoomLevel,
      });
    }
  });
  return parsedGeoRecord;
};
