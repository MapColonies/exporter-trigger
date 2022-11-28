import { promises as fsPromise } from 'fs';
import { join } from 'path';
import checkDiskSpace from 'check-disk-space';
import { ITileRange } from '@map-colonies/mc-utils';
import { IStorageStatusResponse } from './interfaces';

export const getFileSize = async (filePath: string): Promise<number> => {
  const fileSizeInBytes = (await fsPromise.stat(filePath)).size;
  return Math.trunc(fileSizeInBytes); // Make sure we return an Integer
};

export const getGpkgRelativePath = (packageName: string): string => {
  const packageDirectoryName = packageName.substr(0, packageName.lastIndexOf('.'));
  const packageRelativePath = join(packageDirectoryName, packageName);
  return packageRelativePath;
};

export const getGpkgFullPath = (gpkgsLocation: string, packageName: string): string => {
  const packageDirectoryName = packageName.substr(0, packageName.lastIndexOf('.'));
  const packageFullPath = join(gpkgsLocation, packageDirectoryName, packageName);
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
