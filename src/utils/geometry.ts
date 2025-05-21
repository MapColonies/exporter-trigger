/* eslint-disable @typescript-eslint/no-magic-numbers */
import { Logger } from '@map-colonies/js-logger';
import { container } from 'tsyringe';
import { area, buffer, feature, featureCollection, intersect } from '@turf/turf';
import PolygonBbox from '@turf/bbox';
import { BBox, Feature, MultiPolygon, Polygon } from 'geojson';
import booleanContains from '@turf/boolean-contains';
import { snapBBoxToTileGrid } from '@map-colonies/mc-utils';
import { RoiFeatureCollection, RoiProperties } from '@map-colonies/raster-shared';
import { SERVICES } from '@src/common/constants';
import { IConfig } from '@src/common/interfaces';

const areRoiPropertiesEqual = (props1: RoiProperties, props2: RoiProperties): boolean => {
  return props1.maxResolutionDeg === props2.maxResolutionDeg && props1.minResolutionDeg === props2.minResolutionDeg;
};

const areGeometriesSimilar = (feature1: Feature, feature2: Feature, options: { minContainedPercentage: number; bufferMeter: number }): boolean => {
  // Check direct containment
  const feature1ContainsFeature2 = booleanContains(feature1, feature2);
  const feature2ContainsFeature1 = booleanContains(feature2, feature1);

  if (feature1ContainsFeature2 || feature2ContainsFeature1) {
    // Even with containment, check if areas are within threshold
    const area1 = area(feature1);
    const area2 = area(feature2);

    const areaRatio = Math.min(area1, area2) / Math.max(area1, area2);
    const thresholdRatio = options.minContainedPercentage / 100;

    // If the area ratio is below threshold, they're too different in size
    if (areaRatio < thresholdRatio) {
      return false;
    }
    return true;
  }

  // Create buffered features
  const bufferedFeature1 = buffer(feature1, options.bufferMeter, { units: 'meters' });
  const bufferedFeature2 = buffer(feature2, options.bufferMeter, { units: 'meters' });

  if (bufferedFeature1 === undefined || bufferedFeature2 === undefined) {
    return false;
  }
  // Check if buffered feature1 contains feature2 or vice versa
  return booleanContains(bufferedFeature1, feature2) || booleanContains(bufferedFeature2, feature1);
};

export const checkRoiFeatureCollectionSimilarity = (fc1: RoiFeatureCollection, fc2: RoiFeatureCollection, options: { config: IConfig }): boolean => {
  const roiBufferMeter = options.config.get<number>('roiBufferMeter');
  const minContainedPercentage = options.config.get<number>('minContainedPercentage');
  const logger: Logger = container.resolve(SERVICES.LOGGER);
  // If feature counts differ, they're not similar
  if (fc1.features.length !== fc2.features.length) {
    logger.debug({ msg: 'Feature counts differ, not similar', fc1Count: fc1.features.length, fc2Count: fc2.features.length });
    return false;
  }

  // Track which features have found a match
  const fc1Matched = new Array<boolean>(fc1.features.length).fill(false);
  const fc2Matched = new Array<boolean>(fc2.features.length).fill(false);

  for (let i = 0; i < fc1.features.length; i++) {
    const feature1 = fc1.features[i];

    for (let j = 0; j < fc2.features.length; j++) {
      // Skip already matched features in fc2
      if (fc2Matched[j]) {
        continue;
      }

      const feature2 = fc2.features[j];

      // Check if properties are exactly the same
      const propsEqual = areRoiPropertiesEqual(feature1.properties, feature2.properties);
      logger.debug({ msg: 'Checking properties', propsEqual, feature1Properties: feature1.properties, feature2Properties: feature2.properties });
      if (!propsEqual) {
        continue;
      }

      // Check geometric similarity
      const geometriesSimilar = areGeometriesSimilar(feature1, feature2, { minContainedPercentage, bufferMeter: roiBufferMeter });
      logger.debug({
        msg: 'Checking geometries',
        geometriesSimilar,
        feature1GeometryType: feature1.geometry,
        feature2GeometryType: feature2.geometry,
      });
      if (geometriesSimilar) {
        fc1Matched[i] = true;
        fc2Matched[j] = true;
        break;
      }
    }
  }

  // Return true only if all features in both collections found a match
  const allMatched = fc1Matched.every((matched) => matched) && fc2Matched.every((matched) => matched);
  logger.debug({ msg: 'All features matched?', allMatched });
  return allMatched;
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
