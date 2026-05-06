import checkDiskSpace from 'check-disk-space';
import type { ITileRange } from '@map-colonies/mc-utils';
import { bboxToTileRange, degreesPerPixelToZoomLevel, zoomLevelToResolutionMeter } from '@map-colonies/mc-utils';
import type { RoiFeatureCollection } from '@map-colonies/raster-shared';
import { TileOutputFormat } from '@map-colonies/raster-shared';
import type { BBox2d, IGeometryRecord, IStorageEstimation, IStorageStatusResponse } from './interfaces';

export const getStorageStatus = async (gpkgsLocation: string): Promise<IStorageStatusResponse> => {
  return checkDiskSpace(gpkgsLocation);
};

export const parseFeatureCollection = (featuresCollection: RoiFeatureCollection): IGeometryRecord[] => {
  const parsedGeoRecord: IGeometryRecord[] = [];
  featuresCollection.features.forEach((feature) => {
    const targetResolutionDeg = feature.properties.maxResolutionDeg;
    const minResolutionDeg = feature.properties.minResolutionDeg;

    const zoomLevel = degreesPerPixelToZoomLevel(targetResolutionDeg);
    const targetResolutionMeter = zoomLevelToResolutionMeter(zoomLevel) as number;
    const minZoomLevel = degreesPerPixelToZoomLevel(minResolutionDeg);
    parsedGeoRecord.push({
      geometry: feature.geometry,
      targetResolutionDeg,
      targetResolutionMeter,
      minResolutionDeg,
      minZoomLevel,
      zoomLevel,
    });
  });
  return parsedGeoRecord;
};

export const calculateEstimatedGpkgSize = (
  featuresRecords: IGeometryRecord[],
  tileOutputFormat: TileOutputFormat,
  storageEstimation: IStorageEstimation
): number => {
  const tileEstimatedSize = getTileEstimatedSize(tileOutputFormat, storageEstimation);
  const batches: ITileRange[] = [];
  featuresRecords.forEach((record) => {
    for (let zoom = record.minZoomLevel; zoom <= record.zoomLevel; zoom++) {
      const recordBatches = bboxToTileRange(record.sanitizedBox as BBox2d, zoom);
      batches.push(recordBatches);
    }
  });

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

export const getTileEstimatedSize = (tileOutputFormat: TileOutputFormat, storageEstimation: IStorageEstimation): number => {
  const { jpegTileEstimatedSizeInBytes, pngTileEstimatedSizeInBytes } = storageEstimation;

  if (tileOutputFormat === TileOutputFormat.JPEG) {
    return jpegTileEstimatedSizeInBytes;
  }
  return pngTileEstimatedSizeInBytes;
};
