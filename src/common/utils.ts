import checkDiskSpace from 'check-disk-space';
import { bboxToTileRange, degreesPerPixelToZoomLevel, ITileRange, zoomLevelToResolutionMeter } from '@map-colonies/mc-utils';
import { RoiFeatureCollection, TileOutputFormat } from '@map-colonies/raster-shared';
import config from 'config';
import { IGeometryRecord, IStorageStatusResponse } from './interfaces';

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

export const calculateEstimateGpkgSize = (featuresRecords: IGeometryRecord[], tileOutputFormat: TileOutputFormat): number => {
  const tileEstimatedSize = getTileEstimatedSize(tileOutputFormat);
  const batches: ITileRange[] = [];
  featuresRecords.forEach((record) => {
    for (let zoom = record.minZoomLevel; zoom <= record.zoomLevel; zoom++) {
      const recordBatches = bboxToTileRange(record.sanitizedBox, zoom);
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

export const getTileEstimatedSize = (tileOutputFormat: TileOutputFormat): number => {
  const jpegTileEstimatedSizeInBytes = config.get<number>('storageEstimation.jpegTileEstimatedSizeInBytes');
  const pngTileEstimatedSizeInBytes = config.get<number>('storageEstimation.pngTileEstimatedSizeInBytes');
  let tileEstimatedSize;

  if (tileOutputFormat === TileOutputFormat.JPEG) {
    tileEstimatedSize = jpegTileEstimatedSizeInBytes;
  } else {
    tileEstimatedSize = pngTileEstimatedSizeInBytes;
  }

  return tileEstimatedSize;
};
