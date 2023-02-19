/* eslint-disable @typescript-eslint/naming-convention */

import { promises as fsPromise } from 'fs';
import { parse as parsePath } from 'path';
import { sep } from 'path';
import checkDiskSpace from 'check-disk-space';
import { ITileRange } from '@map-colonies/mc-utils';
import { FeatureCollection } from '@turf/helpers';
import md5 from 'md5';
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

export const zoomLevelToResolution = (zoom: number): number => {
  const zoomLevelMapper: Record<number, number> = {
    0: 0.703125,
    1: 0.3515625,
    2: 0.17578125,
    3: 0.087890625,
    4: 0.0439453125,
    5: 0.02197265625,
    6: 0.010986328125,
    7: 0.0054931640625,
    8: 0.00274658203125,
    9: 0.001373291015625,
    10: 0.0006866455078125,
    11: 0.00034332275390625,
    12: 0.000171661376953125,
    13: 0.0000858306884765625,
    14: 0.0000429153442382812,
    15: 0.0000214576721191406,
    16: 0.0000107288360595703,
    17: 0.00000536441802978516,
    18: 0.00000268220901489258,
    19: 0.00000134110450744629,
    20: 0.000000670552253723145,
    21: 0.000000335276126861572,
    22: 0.000000167638063430786,
  };
  return zoomLevelMapper[zoom];
};

export const generateGeoIdentifier = (geo: FeatureCollection): string => {
  const stringifiedGeo = JSON.stringify(geo);
  const additionalIdentifiers = md5(stringifiedGeo);
  return additionalIdentifiers;
};

export const roiBooleanEqual = (fc1: FeatureCollection, fc2: FeatureCollection): boolean => {
  let equality = false;
  if (fc1.features.length !== fc2.features.length) {
    return equality;
  } else {
    // TODO - consider to optimize and refactor the equality (create interface for comparable)
    let sortedHashedFc1: string[] = [];
    fc1.features.forEach((feature) => {
      const orderedFeature = { type: feature.type, properties: feature.properties, geometry: feature.geometry };
      sortedHashedFc1.push(md5(JSON.stringify(orderedFeature)));
    });
    // eslint-disable-next-line @typescript-eslint/require-array-sort-compare
    sortedHashedFc1 = sortedHashedFc1.sort();

    let sortedHashedFc2: string[] = [];
    fc2.features.forEach((feature) => {
      const orderedFeature = { type: feature.type, properties: feature.properties, geometry: feature.geometry };
      sortedHashedFc2.push(md5(JSON.stringify(orderedFeature)));
    });
    // eslint-disable-next-line @typescript-eslint/require-array-sort-compare
    sortedHashedFc2 = sortedHashedFc2.sort();

    if (sortedHashedFc1.every((value, index) => value === sortedHashedFc2[index])) {
      equality = true;
    }
    return equality;
  }
};
