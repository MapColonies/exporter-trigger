/* eslint-disable @typescript-eslint/no-magic-numbers */
import { Logger } from '@map-colonies/js-logger';
import { container } from 'tsyringe';
import config from 'config';
import { area, buffer } from '@turf/turf';
import { FeatureCollection } from '@turf/helpers';
import { Geometry, Polygon } from 'geojson';
import booleanContains from '@turf/boolean-contains';
import { featureCollectionBooleanEqual } from '@map-colonies/mc-utils';
import { SERVICES } from '../common/constants';

const roiBufferMeter = config.get<number>('roiBufferMeter');
const minContainedPercentage = config.get<number>('minContainedPercentage');

const isSinglePolygonFeature = (fc: FeatureCollection): fc is FeatureCollection<Polygon> => {
  return fc.features.length === 1 && fc.features[0].geometry.type === 'Polygon';
};

export const checkFeatures = (jobRoi: FeatureCollection, exportRoi: FeatureCollection): boolean => {
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
      ? 'Export ROI is contained within buffered job ROI with sufficient area percentage'
      : 'Export ROI does not meet minimum contained percentage within buffered job ROI',
  });

  return isSufficientlyContained;
};
