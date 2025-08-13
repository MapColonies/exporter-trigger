/* eslint-disable @typescript-eslint/no-magic-numbers */
import { Logger } from '@map-colonies/js-logger';
import { container } from 'tsyringe';
import { area, buffer, feature, featureCollection, intersect } from '@turf/turf';
import PolygonBbox from '@turf/bbox';
import { BBox, Feature, MultiPolygon, Polygon } from 'geojson';
import booleanEqual from '@turf/boolean-equal';
import { snapBBoxToTileGrid } from '@map-colonies/mc-utils';
import { RoiFeatureCollection, RoiProperties } from '@map-colonies/raster-shared';
import { SERVICES } from '@src/common/constants';
import { IConfig } from '@src/common/interfaces';

const areRoiPropertiesEqual = (props1: RoiProperties, props2: RoiProperties): boolean => {
  return props1.maxResolutionDeg === props2.maxResolutionDeg && props1.minResolutionDeg === props2.minResolutionDeg;
};

/**
 * Check if containment exists and area ratio is within threshold
 */
const isContainedWithAreaThreshold = (containerFeature: Feature, containedFeature: Feature, thresholdRatio: number): boolean => {
  if (!isGeometryContained(containerFeature, containedFeature)) {
    return false;
  }

  const areaRatio = calculateAreaRatio(containedFeature, containerFeature);
  return areaRatio >= thresholdRatio;
};

const areGeometriesSimilar = (
  requestRoiFeature: Feature,
  jobRoiFeature: Feature,
  options: { minContainedPercentage: number; bufferMeter: number }
): boolean => {
  const thresholdRatio = options.minContainedPercentage / 100;

  // Check if job ROI contains the request ROI with area threshold
  if (isContainedWithAreaThreshold(jobRoiFeature, requestRoiFeature, thresholdRatio)) {
    return true;
  }

  // If no direct containment, try with buffered job feature
  const bufferedJobFeature = buffer(jobRoiFeature, options.bufferMeter, { units: 'meters' });

  if (bufferedJobFeature === undefined) {
    return false;
  }

  // Check if buffered job ROI contains the request ROI with area threshold
  return isContainedWithAreaThreshold(bufferedJobFeature, requestRoiFeature, thresholdRatio);
};

const calculateAreaRatio = (feature1: Feature, feature2: Feature): number => {
  const feature1Area = area(feature1);
  const feature2Area = area(feature2);
  const areaRatio = feature1Area / feature2Area;
  return areaRatio;
};

/**
 * Check if a polygon is fully contained within another polygon using intersection-based approach
 * This avoids the Turf.js booleanContains bug with MultiPolygon
 */
const isPolygonContainedInPolygon = (containerPolygon: Feature<Polygon>, candidatePolygon: Feature<Polygon>): boolean => {
  try {
    const intersection = intersect(featureCollection([containerPolygon, candidatePolygon]));
    if (!intersection) {
      return false;
    }

    const candidateArea = area(candidatePolygon);
    const intersectionArea = area(intersection);

    // Use relative epsilon for floating point comparison to handle large area values
    const relativeEpsilon = 1e-9;
    const absoluteDifference = Math.abs(candidateArea - intersectionArea);
    const relativeDifference = absoluteDifference / candidateArea;

    return relativeDifference < relativeEpsilon || intersectionArea >= candidateArea;
  } catch (error) {
    return false;
  }
};

/**
 * Helper function to handle booleanContains with MultiPolygon geometries
 * Works around Turf.js bug with MultiPolygon containment checks
 */
export const isGeometryContained = (completedJobRoi: Feature, requestedRoi: Feature): boolean => {
  try {
    if (booleanEqual(completedJobRoi, requestedRoi)) {
      return true;
    }

    if (completedJobRoi.geometry.type === 'MultiPolygon' && requestedRoi.geometry.type === 'Polygon') {
      const multiPolygon = completedJobRoi.geometry;
      return multiPolygon.coordinates.some((coords) => {
        const polygon = { type: 'Polygon', coordinates: coords } as Polygon;
        const polygonFeature = feature(polygon, completedJobRoi.properties);
        return isPolygonContainedInPolygon(polygonFeature, requestedRoi as Feature<Polygon>);
      });
    }

    if (completedJobRoi.geometry.type === 'Polygon' && requestedRoi.geometry.type === 'Polygon') {
      return isPolygonContainedInPolygon(completedJobRoi as Feature<Polygon>, requestedRoi as Feature<Polygon>);
    }

    return false;

    //commented after decision on how to handle naive cache - kepd code fot possible future use

    /**if (completedJobRoi.geometry.type === 'MultiPolygon' && requestedRoi.geometry.type === 'MultiPolygon') {
      const containedMultiPolygon = requestedRoi.geometry;
      // Every polygon in contained MultiPolygon must be contained by at least one polygon in container MultiPolygon
      return containedMultiPolygon.coordinates.every((containedCoords) => {
        const containedPolygon = { type: 'Polygon', coordinates: containedCoords } as Polygon;
        const containedPolygonFeature = feature(containedPolygon, requestedRoi.properties);
        return isGeometryContained(completedJobRoi, containedPolygonFeature);
      });
      
    }

    // Handle MultiPolygon in containedFeature only
    if (requestedRoi.geometry.type === 'MultiPolygon') {
      return false;
      const multiPolygon = requestedRoi.geometry;
      return multiPolygon.coordinates.every((coords) => {
        const polygon = { type: 'Polygon', coordinates: coords } as Polygon;
        const polygonFeature = feature(polygon, requestedRoi.properties);
        return booleanContains(completedJobRoi, polygonFeature);
      });
      
    }*/
  } catch (error) {
    // If there's any error with the containment check, return false
    return false;
  }
};

export const checkRoiFeatureCollectionSimilarity = (
  requestRoi: RoiFeatureCollection,
  jobRoi: RoiFeatureCollection,
  options: { config: IConfig }
): boolean => {
  const roiBufferMeter = options.config.get<number>('roiBufferMeter');
  const minContainedPercentage = options.config.get<number>('minContainedPercentage');
  const logger: Logger = container.resolve(SERVICES.LOGGER);
  // If feature counts differ, they're not similar
  if (requestRoi.features.length !== jobRoi.features.length) {
    logger.debug({ msg: 'Feature counts differ, not similar', fc1Count: requestRoi.features.length, fc2Count: jobRoi.features.length });
    return false;
  }

  // Track which features have found a match
  const fc1Matched = new Array<boolean>(requestRoi.features.length).fill(false);
  const fc2Matched = new Array<boolean>(jobRoi.features.length).fill(false);

  for (let i = 0; i < requestRoi.features.length; i++) {
    const feature1 = requestRoi.features[i];

    for (let j = 0; j < jobRoi.features.length; j++) {
      // Skip already matched features in fc2
      if (fc2Matched[j]) {
        continue;
      }

      const feature2 = jobRoi.features[j];

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
    if (!fc1Matched[i]) {
      logger.debug({ msg: 'At least one feature in fc1 has no match, featureCollection has no similarity' });
      return false;
    }
  }

  logger.debug({ msg: 'All features matched successfully, featureCollection has similarity' });
  return true;
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
