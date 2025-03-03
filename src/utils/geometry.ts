/* eslint-disable @typescript-eslint/no-magic-numbers */
import { Logger } from '@map-colonies/js-logger';
import { container } from 'tsyringe';
import config from 'config';
import { area, buffer, feature, featureCollection, intersect } from '@turf/turf';
import PolygonBbox from '@turf/bbox';
import { BBox, Geometry, MultiPolygon, Polygon } from 'geojson';
import booleanContains from '@turf/boolean-contains';
import { featureCollectionBooleanEqual, snapBBoxToTileGrid } from '@map-colonies/mc-utils';
import { RoiFeatureCollection } from '@map-colonies/raster-shared';
import { SERVICES } from '../common/constants';

const roiBufferMeter = config.get<number>('roiBufferMeter');
const minContainedPercentage = config.get<number>('minContainedPercentage');

const isSinglePolygonFeature = (fc: RoiFeatureCollection): boolean => {
  return fc.features.length === 1 && fc.features[0].geometry.type === 'Polygon';
};

export const checkFeaturesResemblance = (jobRoi: RoiFeatureCollection, exportRoi: RoiFeatureCollection): boolean => {
  const logger = container.resolve<Logger>(SERVICES.LOGGER);
  // Check if both feature collections contain only a single polygon feature
  if (!isSinglePolygonFeature(jobRoi) || !isSinglePolygonFeature(exportRoi)) {
    logger.debug({ msg: 'One of the featureCollections is not a single polygon. Checking feature collection equality' });
    return featureCollectionBooleanEqual(jobRoi, exportRoi);
  }

  logger.debug({ msg: 'Both job featureCollection and exportRequest featureCollection are single polygon features' });

  // Create a buffered feature around jobRoi's single polygon
  const bufferedFeature = buffer(jobRoi.features[0], roiBufferMeter, { units: 'meters' });
  const isContained =
    booleanContains(bufferedFeature as unknown as Geometry, exportRoi.features[0]) || booleanContains(jobRoi.features[0], exportRoi.features[0]);

  // If exportRoi is not contained, return false immediately
  if (!isContained) {
    logger.info({ msg: 'Export ROI is not contained within buffered job ROI' });
    return false;
  }

  // Calculate areas and check containment percentage
  const exportArea = area(exportRoi.features[0]);
  const jobArea = area(jobRoi.features[0]);
  const containedPercentage = (exportArea / jobArea) * 100;

  const isSufficientlyContained = containedPercentage >= minContainedPercentage;
  logger.info({
    msg: isSufficientlyContained
      ? `Export ROI is contained within buffered job ROI with sufficient area percentage. ContainedPercentage is: ${containedPercentage}`
      : `Export ROI does not meet minimum contained percentage within buffered job ROI. ContainedPercentage is: ${containedPercentage}, minContainedPercentage is: ${minContainedPercentage}`,
  });

  return isSufficientlyContained;
};

export const sanitizeBbox = ({
  polygon,
  footprint,
  zoom,
}: {
  polygon: Polygon | MultiPolygon;
  footprint: Polygon | MultiPolygon;
  zoom: number;
}): BBox | null => {
  try {
    const polygonFeature = feature(polygon);
    const footprintFeature = feature(footprint);

    const intersection = intersect(featureCollection([polygonFeature, footprintFeature]));
    if (intersection === null) {
      return null;
    }
    const sanitized = snapBBoxToTileGrid(PolygonBbox(intersection), zoom) as BBox;
    return sanitized;
  } catch (error) {
    throw new Error(`Error occurred while trying to sanitized bbox: ${JSON.stringify(error)}`);
  }
};
