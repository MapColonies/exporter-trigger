import { promises as fsPromise } from 'fs';
import { parse as parsePath } from 'path';
import { sep } from 'path';
import { BBox } from '@turf/turf';
import checkDiskSpace from 'check-disk-space';
import { ITileRange } from '@map-colonies/mc-utils';
import { IStorageStatusResponse } from './interfaces';

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

export const getUtcNow = (): Date => {
  const date = new Date();
  const nowUtc = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds()
  );
  const utcDate = new Date(nowUtc);
  return utcDate;
};
