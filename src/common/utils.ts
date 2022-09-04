import { promises as fsPromise } from 'fs';
import { join } from 'path';
import { BBox } from '@turf/turf';

export const getFileSize = async (filePath: string): Promise<number> => {
  const fileSizeInBytes = (await fsPromise.stat(filePath)).size;
  return Math.trunc(fileSizeInBytes); // Make sure we return an Integer
};

export const generatePackageName = (dbId: string, zoomLevel: number, bbox: BBox): string => {
  const numberOfDecimals = 5;
  const bboxToString = bbox.map((val) => String(val.toFixed(numberOfDecimals)).replace('.', '_').replace(/-/g, 'm')).join('');
  return `gm_${dbId.replace(/-/g, '_')}_${zoomLevel}_${bboxToString}.gpkg`;
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