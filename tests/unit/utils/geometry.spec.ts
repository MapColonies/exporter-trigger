import { container } from 'tsyringe';
import { Polygon, MultiPolygon } from 'geojson';
import jsLogger from '@map-colonies/js-logger';
import { RoiFeatureCollection } from '@map-colonies/raster-shared';
import * as turf from '@turf/turf';
import { configMock, registerDefaultConfig } from '../../mocks/config';
import { sanitizeBboxMock, sanitizeBboxRequestMock, notIntersectedPolygon } from '../../mocks/geometryMocks';
import { checkRoiFeatureCollectionSimilarity, sanitizeBbox, isGeometryContained } from '../../../src/utils/geometry';
import { SERVICES } from '../../../src/common/constants';

describe('Geometry Utils', () => {
  let ROI_BUFFER_METER = 0;
  let MIN_CONTAINED_PERCENTAGE = 0;
  let logger;
  beforeEach(() => {
    registerDefaultConfig();
    logger = jsLogger({ enabled: false });
    container.register(SERVICES.LOGGER, { useValue: logger });
    ROI_BUFFER_METER = configMock.get<number>('roiBufferMeter');
    MIN_CONTAINED_PERCENTAGE = configMock.get<number>('minContainedPercentage');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('sanitizedBbox', () => {
    it('should return the sanitized bbox for zoom 0', () => {
      const response = sanitizeBbox(sanitizeBboxRequestMock);
      expect(response).toStrictEqual(sanitizeBboxMock);
    });

    it('should return null when polygon and footprint dont intersect', () => {
      const response = sanitizeBbox({ ...sanitizeBboxRequestMock, polygon: notIntersectedPolygon });
      expect(response).toBeNull();
    });

    it('should throw error when some internal error occurred', () => {
      jest.spyOn(turf, 'feature').mockImplementation(() => {
        throw new Error('Mocked feature error');
      });
      const action = () => sanitizeBbox({ ...sanitizeBboxRequestMock, polygon: notIntersectedPolygon });
      expect(action).toThrow(Error);
    });
  });

  describe('checkRoiFeatureCollectionSimilarity', () => {
    const props1 = { maxResolutionDeg: 0.1, minResolutionDeg: 0.01 };
    const props2 = { maxResolutionDeg: 0.2, minResolutionDeg: 0.02 };

    it('should return true when features are identical', () => {
      const squarePolygon: Polygon = {
        type: 'Polygon',
        coordinates: [
          [
            [0, 0],
            [0, 10],
            [10, 10],
            [10, 0],
            [0, 0],
          ],
        ],
      };
      const fc1 = turf.featureCollection([turf.feature(squarePolygon, props1, { id: 'f1' })]);
      const fc2 = turf.featureCollection([turf.feature(squarePolygon, props1, { id: 'f2' })]);

      const result = checkRoiFeatureCollectionSimilarity(fc1, fc2, ROI_BUFFER_METER, MIN_CONTAINED_PERCENTAGE, container.resolve(SERVICES.LOGGER));

      expect(result).toBeTruthy();
    });

    // Different feature count
    it('should return false when collections have different numbers of features', () => {
      const squarePolygon: Polygon = {
        type: 'Polygon',
        coordinates: [
          [
            [0, 0],
            [0, 10],
            [10, 10],
            [10, 0],
            [0, 0],
          ],
        ],
      };

      const fc1 = turf.featureCollection([turf.feature(squarePolygon, props1, { id: 'f1' })]);
      const fc2 = turf.featureCollection([turf.feature(squarePolygon, props1, { id: 'f2a' }), turf.feature(squarePolygon, props1, { id: 'f2b' })]);

      const result = checkRoiFeatureCollectionSimilarity(fc1, fc2, ROI_BUFFER_METER, MIN_CONTAINED_PERCENTAGE, container.resolve(SERVICES.LOGGER));

      expect(result).toBeFalsy();
    });

    // Empty feature collections
    it('should return true when both collections are empty', () => {
      const fc1 = turf.featureCollection([]) as RoiFeatureCollection;
      const fc2 = turf.featureCollection([]) as RoiFeatureCollection;

      const result = checkRoiFeatureCollectionSimilarity(fc1, fc2, ROI_BUFFER_METER, MIN_CONTAINED_PERCENTAGE, container.resolve(SERVICES.LOGGER));

      expect(result).toBeTruthy();
    });

    // Different properties
    it('should return false when features have different properties', () => {
      const squarePolygon: Polygon = {
        type: 'Polygon',
        coordinates: [
          [
            [0, 0],
            [0, 10],
            [10, 10],
            [10, 0],
            [0, 0],
          ],
        ],
      };

      const fc1 = turf.featureCollection([turf.feature(squarePolygon, props1, { id: 'f1' })]);
      const fc2 = turf.featureCollection([turf.feature(squarePolygon, props2, { id: 'f2' })]);

      const result = checkRoiFeatureCollectionSimilarity(fc1, fc2, ROI_BUFFER_METER, MIN_CONTAINED_PERCENTAGE, container.resolve(SERVICES.LOGGER));

      expect(result).toBeFalsy();
    });

    // Job ROI contains request ROI with area ratio within threshold
    it('should return true when job ROI contains request ROI and area ratio is within threshold', () => {
      // Request ROI: Inner square: 96 sq units
      const requestSquarePolygon: Polygon = {
        type: 'Polygon',
        coordinates: [
          [
            [0.2, 0.2],
            [0.2, 9.8],
            [9.8, 9.8],
            [9.8, 0.2],
            [0.2, 0.2],
          ],
        ],
      };

      // Job ROI: Outer square: 100 sq units - contains request (96% ratio above 90% threshold)
      const jobSquarePolygon: Polygon = {
        type: 'Polygon',
        coordinates: [
          [
            [0, 0],
            [0, 10],
            [10, 10],
            [10, 0],
            [0, 0],
          ],
        ],
      };

      const requestRoi = turf.featureCollection([turf.feature(requestSquarePolygon, props1, { id: 'f1' })]);
      const jobRoi = turf.featureCollection([turf.feature(jobSquarePolygon, props1, { id: 'f2' })]);

      const result = checkRoiFeatureCollectionSimilarity(
        requestRoi,
        jobRoi,
        ROI_BUFFER_METER,
        MIN_CONTAINED_PERCENTAGE,
        container.resolve(SERVICES.LOGGER)
      );

      expect(result).toBeTruthy();
    });

    // Job ROI contains request ROI but area ratio below threshold
    it('should return false when job ROI contains request ROI but area ratio is below threshold', () => {
      // Request ROI: Inner square: 64 sq units
      const requestSquarePolygon: Polygon = {
        type: 'Polygon',
        coordinates: [
          [
            [2, 2],
            [2, 8],
            [8, 8],
            [8, 2],
            [2, 2],
          ],
        ],
      };

      // Job ROI: Outer square: 100 sq units - contains request (64% ratio below 90% threshold)
      const jobSquarePolygon: Polygon = {
        type: 'Polygon',
        coordinates: [
          [
            [0, 0],
            [0, 10],
            [10, 10],
            [10, 0],
            [0, 0],
          ],
        ],
      };

      const requestRoi = turf.featureCollection([turf.feature(requestSquarePolygon, props1, { id: 'f1' })]);
      const jobRoi = turf.featureCollection([turf.feature(jobSquarePolygon, props1, { id: 'f2' })]);

      const result = checkRoiFeatureCollectionSimilarity(
        requestRoi,
        jobRoi,
        ROI_BUFFER_METER,
        MIN_CONTAINED_PERCENTAGE,
        container.resolve(SERVICES.LOGGER)
      );

      expect(result).toBeFalsy();
    });

    // Request ROI larger than job ROI - should not be similar
    it('should return false when request ROI is larger than job ROI', () => {
      // Request ROI: Large square: 100 sq units
      const requestSquarePolygon: Polygon = {
        type: 'Polygon',
        coordinates: [
          [
            [0, 0],
            [0, 10],
            [10, 10],
            [10, 0],
            [0, 0],
          ],
        ],
      };

      // Job ROI: Small square: 36 sq units - cannot contain request
      const jobSquarePolygon: Polygon = {
        type: 'Polygon',
        coordinates: [
          [
            [2, 2],
            [2, 8],
            [8, 8],
            [8, 2],
            [2, 2],
          ],
        ],
      };

      const requestRoi = turf.featureCollection([turf.feature(requestSquarePolygon, props1, { id: 'f1' })]);
      const jobRoi = turf.featureCollection([turf.feature(jobSquarePolygon, props1, { id: 'f2' })]);

      const result = checkRoiFeatureCollectionSimilarity(
        requestRoi,
        jobRoi,
        ROI_BUFFER_METER,
        MIN_CONTAINED_PERCENTAGE,
        container.resolve(SERVICES.LOGGER)
      );

      expect(result).toBeFalsy();
    });

    // Buffer doesn't create containment
    it("should return false when buffer doesn't create containment", () => {
      // Two squares that are 10 meters apart - beyond the 5 meter buffer
      const square1Polygon: Polygon = {
        type: 'Polygon',
        coordinates: [
          [
            [0, 0],
            [0, 10],
            [10, 10],
            [10, 0],
            [0, 0],
          ],
        ],
      };

      const square2Polygon: Polygon = {
        type: 'Polygon',
        coordinates: [
          [
            [20, 0],
            [20, 10],
            [30, 10],
            [30, 0],
            [20, 0],
          ],
        ],
      };

      const fc1 = turf.featureCollection([turf.feature(square1Polygon, props1, { id: 'f1' })]);
      const fc2 = turf.featureCollection([turf.feature(square2Polygon, props1, { id: 'f2' })]);

      const result = checkRoiFeatureCollectionSimilarity(fc1, fc2, ROI_BUFFER_METER, MIN_CONTAINED_PERCENTAGE, container.resolve(SERVICES.LOGGER));

      expect(result).toBeFalsy();
    });

    // Multiple features - all match (job ROI contains request ROI)
    it('should return true when all features in collections find matches', () => {
      // Request ROI has two smaller squares
      const requestSquare1: Polygon = {
        type: 'Polygon',
        coordinates: [
          [
            [0.5, 0.5],
            [0.5, 9.5],
            [9.5, 9.5],
            [9.5, 0.5],
            [0.5, 0.5],
          ],
        ],
      };

      const requestSquare2: Polygon = {
        type: 'Polygon',
        coordinates: [
          [
            [20.5, 0.5],
            [20.5, 9.5],
            [29.5, 9.5],
            [29.5, 0.5],
            [20.5, 0.5],
          ],
        ],
      };

      // Job ROI has corresponding larger squares that contain the request squares
      const jobSquare1: Polygon = {
        type: 'Polygon',
        coordinates: [
          [
            [0, 0],
            [0, 10],
            [10, 10],
            [10, 0],
            [0, 0],
          ],
        ],
      };

      const jobSquare2: Polygon = {
        type: 'Polygon',
        coordinates: [
          [
            [20, 0],
            [20, 10],
            [30, 10],
            [30, 0],
            [20, 0],
          ],
        ],
      };

      const requestRoi = turf.featureCollection([
        turf.feature(requestSquare1, props1, { id: 'f1a' }),
        turf.feature(requestSquare2, props1, { id: 'f1b' }),
      ]);

      const jobRoi = turf.featureCollection([turf.feature(jobSquare1, props1, { id: 'f2a' }), turf.feature(jobSquare2, props1, { id: 'f2b' })]);

      const result = checkRoiFeatureCollectionSimilarity(
        requestRoi,
        jobRoi,
        ROI_BUFFER_METER,
        MIN_CONTAINED_PERCENTAGE,
        container.resolve(SERVICES.LOGGER)
      );

      expect(result).toBeTruthy();
    });

    // Multiple features - some don't match
    it("should return false when some features don't find matches", () => {
      // First collection has two squares
      const square1aPolygon: Polygon = {
        type: 'Polygon',
        coordinates: [
          [
            [0, 0],
            [0, 10],
            [10, 10],
            [10, 0],
            [0, 0],
          ],
        ],
      };

      const square1bPolygon: Polygon = {
        type: 'Polygon',
        coordinates: [
          [
            [20, 0],
            [20, 10],
            [30, 10],
            [30, 0],
            [20, 0],
          ],
        ],
      };

      // Second collection has one matching square and one non-matching
      const square2aPolygon: Polygon = {
        type: 'Polygon',
        coordinates: [
          [
            [0.5, 0.5],
            [0.5, 9.5],
            [9.5, 9.5],
            [9.5, 0.5],
            [0.5, 0.5],
          ],
        ],
      };

      const square2bPolygon: Polygon = {
        type: 'Polygon',
        coordinates: [
          [
            [40, 0],
            [40, 10],
            [50, 10],
            [50, 0],
            [40, 0],
          ],
        ],
      };

      const fc1 = turf.featureCollection([
        turf.feature(square1aPolygon, props1, { id: 'f1a' }),
        turf.feature(square1bPolygon, props1, { id: 'f1b' }),
      ]);

      const fc2 = turf.featureCollection([
        turf.feature(square2aPolygon, props1, { id: 'f2a' }),
        turf.feature(square2bPolygon, props1, { id: 'f2b' }),
      ]);

      const result = checkRoiFeatureCollectionSimilarity(fc1, fc2, ROI_BUFFER_METER, MIN_CONTAINED_PERCENTAGE, container.resolve(SERVICES.LOGGER));

      expect(result).toBeFalsy();
    });

    // Multiple features - different order (job ROI contains request ROI)
    it('should match features correctly regardless of order', () => {
      // Request ROI has two smaller squares
      const requestSquare1: Polygon = {
        type: 'Polygon',
        coordinates: [
          [
            [0.5, 0.5],
            [0.5, 9.5],
            [9.5, 9.5],
            [9.5, 0.5],
            [0.5, 0.5],
          ],
        ],
      };

      const requestSquare2: Polygon = {
        type: 'Polygon',
        coordinates: [
          [
            [20.5, 0.5],
            [20.5, 9.5],
            [29.5, 9.5],
            [29.5, 0.5],
            [20.5, 0.5],
          ],
        ],
      };

      // Job ROI has corresponding larger squares that contain the request squares
      const jobSquare1: Polygon = {
        type: 'Polygon',
        coordinates: [
          [
            [0, 0],
            [0, 10],
            [10, 10],
            [10, 0],
            [0, 0],
          ],
        ],
      };

      const jobSquare2: Polygon = {
        type: 'Polygon',
        coordinates: [
          [
            [20, 0],
            [20, 10],
            [30, 10],
            [30, 0],
            [20, 0],
          ],
        ],
      };

      const requestRoi = turf.featureCollection([
        turf.feature(requestSquare1, props1, { id: 'f1a' }),
        turf.feature(requestSquare2, props1, { id: 'f1b' }),
      ]);

      const jobRoi = turf.featureCollection([
        // Order reversed compared to requestRoi
        turf.feature(jobSquare2, props1, { id: 'f2b' }),
        turf.feature(jobSquare1, props1, { id: 'f2a' }),
      ]);

      const result = checkRoiFeatureCollectionSimilarity(
        requestRoi,
        jobRoi,
        ROI_BUFFER_METER,
        MIN_CONTAINED_PERCENTAGE,
        container.resolve(SERVICES.LOGGER)
      );

      expect(result).toBeTruthy();
    });

    // Ambiguous matching (job ROI contains request ROI)
    it('should handle ambiguous matching correctly', () => {
      // Request ROI has two identical smaller squares at the same location
      const requestSquarePolygon: Polygon = {
        type: 'Polygon',
        coordinates: [
          [
            [0.5, 0.5],
            [0.5, 9.5],
            [9.5, 9.5],
            [9.5, 0.5],
            [0.5, 0.5],
          ],
        ],
      };

      // Job ROI has two identical larger squares at the same location that contain the request squares
      const jobSquarePolygon: Polygon = {
        type: 'Polygon',
        coordinates: [
          [
            [0, 0],
            [0, 10],
            [10, 10],
            [10, 0],
            [0, 0],
          ],
        ],
      };

      const requestRoi = turf.featureCollection([
        turf.feature(requestSquarePolygon, props1, { id: 'f1a' }),
        turf.feature(requestSquarePolygon, props1, { id: 'f1b' }),
      ]);
      const jobRoi = turf.featureCollection([
        turf.feature(jobSquarePolygon, props1, { id: 'f2a' }),
        turf.feature(jobSquarePolygon, props1, { id: 'f2b' }),
      ]);

      const result = checkRoiFeatureCollectionSimilarity(
        requestRoi,
        jobRoi,
        ROI_BUFFER_METER,
        MIN_CONTAINED_PERCENTAGE,
        container.resolve(SERVICES.LOGGER)
      );

      expect(result).toBeTruthy();
    });

    it('should return true when buffer polygon contains polygon', () => {
      const smallPolygon: Polygon = {
        type: 'Polygon',
        coordinates: [
          [
            [2, 2],
            [2, 8],
            [8, 8],
            [8, 2],
            [2, 2],
          ],
        ],
      };

      const largePolygon: Polygon = {
        type: 'Polygon',
        coordinates: [
          [
            // Expand small polygon [2,2] to [8,8] by exactly 2 meters on each side
            // 2 meters ≈ 0.000018 degrees, so expand by 0.000018 on each side
            [1.999982, 1.999982],
            [1.999982, 8.000018],
            [8.000018, 8.000018],
            [8.000018, 1.999982],
            [1.999982, 1.999982],
          ],
        ],
      };

      const requestRoi = turf.featureCollection([turf.feature(largePolygon, props1, { id: 'f1a' })]);
      const jobRoi = turf.featureCollection([turf.feature(smallPolygon, props1, { id: 'f2a' })]);

      const result = checkRoiFeatureCollectionSimilarity(
        requestRoi,
        jobRoi,
        ROI_BUFFER_METER,
        MIN_CONTAINED_PERCENTAGE,
        container.resolve(SERVICES.LOGGER)
      );

      expect(result).toBeTruthy();
    });

    it('should return false when buffer polygon doesnt contains polygon', () => {
      const smallPolygon: Polygon = {
        type: 'Polygon',
        coordinates: [
          [
            [2, 2],
            [2, 8],
            [8, 8],
            [8, 2],
            [2, 2],
          ],
        ],
      };

      const largePolygon: Polygon = {
        type: 'Polygon',
        coordinates: [
          [
            // Expand small polygon [2,2] to [8,8] by exactly 10 meters on each side
            // 10 meters ≈ 0.00009 degrees, so expand by 0.00009 on each side
            [1.99991, 1.99991],
            [1.99991, 8.00009],
            [8.00009, 8.00009],
            [8.00009, 1.99991],
            [1.99991, 1.99991],
          ],
        ],
      };

      const requestRoi = turf.featureCollection([turf.feature(largePolygon, props1, { id: 'f1a' })]);
      const jobRoi = turf.featureCollection([turf.feature(smallPolygon, props1, { id: 'f2a' })]);

      const result = checkRoiFeatureCollectionSimilarity(
        requestRoi,
        jobRoi,
        ROI_BUFFER_METER,
        MIN_CONTAINED_PERCENTAGE,
        container.resolve(SERVICES.LOGGER)
      );

      expect(result).toBeFalsy();
    });

    // Exactly at threshold boundary
    it('should handle area ratio exactly at threshold boundary', () => {
      // Request ROI: Inner square with exactly 90% area of job square - exactly at the threshold
      // For a square, side length = sqrt(area)
      // So sqrt(90) ≈ 9.487
      const sideLength = Math.sqrt(90);
      const offset = (10 - sideLength) / 2; // To center the smaller square

      const requestSquarePolygon: Polygon = {
        type: 'Polygon',
        coordinates: [
          [
            [offset, offset],
            [offset, offset + sideLength],
            [offset + sideLength, offset + sideLength],
            [offset + sideLength, offset],
            [offset, offset],
          ],
        ],
      };

      // Job ROI: Outer square: 100 sq units
      const jobSquarePolygon: Polygon = {
        type: 'Polygon',
        coordinates: [
          [
            [0, 0],
            [0, 10],
            [10, 10],
            [10, 0],
            [0, 0],
          ],
        ],
      };

      const requestRoi = turf.featureCollection([turf.feature(requestSquarePolygon, props1, { id: 'f1' })]);
      const jobRoi = turf.featureCollection([turf.feature(jobSquarePolygon, props1, { id: 'f2' })]);

      const result = checkRoiFeatureCollectionSimilarity(
        requestRoi,
        jobRoi,
        ROI_BUFFER_METER,
        MIN_CONTAINED_PERCENTAGE,
        container.resolve(SERVICES.LOGGER)
      );

      expect(result).toBeTruthy();
    });

    // Invalid geometry handling
    it('should handle invalid geometries gracefully', () => {
      // Request ROI: Create invalid geometry (self-intersecting polygon)
      const invalidPolygon: Polygon = {
        type: 'Polygon',
        coordinates: [
          [
            [0, 0],
            [10, 10],
            [0, 10],
            [10, 0],
            [0, 0],
          ],
        ],
      };

      // Job ROI: Create valid geometry
      const validSquarePolygon: Polygon = {
        type: 'Polygon',
        coordinates: [
          [
            [0, 0],
            [0, 10],
            [10, 10],
            [10, 0],
            [0, 0],
          ],
        ],
      };

      const requestRoi = turf.featureCollection([turf.feature(invalidPolygon, props1, { id: 'f1' })]);
      const jobRoi = turf.featureCollection([turf.feature(validSquarePolygon, props1, { id: 'f2' })]);

      const result = checkRoiFeatureCollectionSimilarity(
        requestRoi,
        jobRoi,
        ROI_BUFFER_METER,
        MIN_CONTAINED_PERCENTAGE,
        container.resolve(SERVICES.LOGGER)
      );

      expect(result).toBeFalsy();
    });
  });

  describe('isGeometryContained', () => {
    const props = { maxResolutionDeg: 0.1, minResolutionDeg: 0.01 };

    describe('Regular Polygon containment', () => {
      it('should return true when outer polygon contains inner polygon', () => {
        const outerPolygon: Polygon = {
          type: 'Polygon',
          coordinates: [
            [
              [0, 0],
              [0, 10],
              [10, 10],
              [10, 0],
              [0, 0],
            ],
          ],
        };

        const innerPolygon: Polygon = {
          type: 'Polygon',
          coordinates: [
            [
              [2, 2],
              [2, 8],
              [8, 8],
              [8, 2],
              [2, 2],
            ],
          ],
        };

        const outerFeature = turf.feature(outerPolygon, props);
        const innerFeature = turf.feature(innerPolygon, props);

        const result = isGeometryContained(outerFeature, innerFeature);
        expect(result).toBeTruthy();
      });

      it('should return false when polygons do not overlap', () => {
        const polygon1: Polygon = {
          type: 'Polygon',
          coordinates: [
            [
              [0, 0],
              [0, 5],
              [5, 5],
              [5, 0],
              [0, 0],
            ],
          ],
        };

        const polygon2: Polygon = {
          type: 'Polygon',
          coordinates: [
            [
              [10, 10],
              [10, 15],
              [15, 15],
              [15, 10],
              [10, 10],
            ],
          ],
        };

        const feature1 = turf.feature(polygon1, props);
        const feature2 = turf.feature(polygon2, props);

        const result = isGeometryContained(feature1, feature2);
        expect(result).toBeFalsy();
      });

      it('should return false when inner polygon is larger than outer polygon', () => {
        const smallPolygon: Polygon = {
          type: 'Polygon',
          coordinates: [
            [
              [2, 2],
              [2, 8],
              [8, 8],
              [8, 2],
              [2, 2],
            ],
          ],
        };

        const largePolygon: Polygon = {
          type: 'Polygon',
          coordinates: [
            [
              [0, 0],
              [0, 10],
              [10, 10],
              [10, 0],
              [0, 0],
            ],
          ],
        };

        const smallFeature = turf.feature(smallPolygon, props);
        const largeFeature = turf.feature(largePolygon, props);

        const result = isGeometryContained(smallFeature, largeFeature);
        expect(result).toBeFalsy();
      });
    });

    describe('MultiPolygon as container', () => {
      it('should return true when any polygon in MultiPolygon contains the feature', () => {
        // MultiPolygon with two separate polygons
        const multiPolygon: MultiPolygon = {
          type: 'MultiPolygon',
          coordinates: [
            // First polygon
            [
              [
                [0, 0],
                [0, 10],
                [10, 10],
                [10, 0],
                [0, 0],
              ],
            ],
            // Second polygon
            [
              [
                [20, 20],
                [20, 30],
                [30, 30],
                [30, 20],
                [20, 20],
              ],
            ],
          ],
        };

        // Small polygon contained in the first polygon of the MultiPolygon
        const containedPolygon: Polygon = {
          type: 'Polygon',
          coordinates: [
            [
              [2, 2],
              [2, 8],
              [8, 8],
              [8, 2],
              [2, 2],
            ],
          ],
        };

        const multiFeature = turf.feature(multiPolygon, props);
        const containedFeature = turf.feature(containedPolygon, props);

        const result = isGeometryContained(multiFeature, containedFeature);
        expect(result).toBeTruthy();
      });

      it('should return false when no polygon in MultiPolygon contains the feature', () => {
        // MultiPolygon with two separate polygons
        const multiPolygon: MultiPolygon = {
          type: 'MultiPolygon',
          coordinates: [
            // First polygon
            [
              [
                [0, 0],
                [0, 10],
                [10, 10],
                [10, 0],
                [0, 0],
              ],
            ],
            // Second polygon
            [
              [
                [20, 20],
                [20, 30],
                [30, 30],
                [30, 20],
                [20, 20],
              ],
            ],
          ],
        };

        // Polygon not contained in any part of the MultiPolygon
        const outsidePolygon: Polygon = {
          type: 'Polygon',
          coordinates: [
            [
              [15, 15],
              [15, 18],
              [18, 18],
              [18, 15],
              [15, 15],
            ],
          ],
        };

        const multiFeature = turf.feature(multiPolygon, props);
        const outsideFeature = turf.feature(outsidePolygon, props);

        const result = isGeometryContained(multiFeature, outsideFeature);
        expect(result).toBeFalsy();
      });
    });

    describe('MultiPolygon as contained feature', () => {
      it('should return false when requestRoi is multipolygon and jobRoi is polygon', () => {
        // Large container polygon
        const containerPolygon: Polygon = {
          type: 'Polygon',
          coordinates: [
            [
              [-5, -5],
              [-5, 35],
              [35, 35],
              [35, -5],
              [-5, -5],
            ],
          ],
        };

        // MultiPolygon with two polygons both inside the container
        const multiPolygon: MultiPolygon = {
          type: 'MultiPolygon',
          coordinates: [
            // First polygon - inside container
            [
              [
                [0, 0],
                [0, 10],
                [10, 10],
                [10, 0],
                [0, 0],
              ],
            ],
            // Second polygon - also inside container
            [
              [
                [20, 20],
                [20, 30],
                [30, 30],
                [30, 20],
                [20, 20],
              ],
            ],
          ],
        };

        const containerFeature = turf.feature(containerPolygon, props);
        const multiFeature = turf.feature(multiPolygon, props);

        const result = isGeometryContained(containerFeature, multiFeature);
        expect(result).toBeFalsy();
      });

      it('should return false when some polygons in MultiPolygon are not contained', () => {
        // Small container polygon
        const containerPolygon: Polygon = {
          type: 'Polygon',
          coordinates: [
            [
              [0, 0],
              [0, 15],
              [15, 15],
              [15, 0],
              [0, 0],
            ],
          ],
        };

        // MultiPolygon with one polygon inside and one outside the container
        const multiPolygon: MultiPolygon = {
          type: 'MultiPolygon',
          coordinates: [
            // First polygon - inside container
            [
              [
                [2, 2],
                [2, 8],
                [8, 8],
                [8, 2],
                [2, 2],
              ],
            ],
            // Second polygon - outside container
            [
              [
                [20, 20],
                [20, 30],
                [30, 30],
                [30, 20],
                [20, 20],
              ],
            ],
          ],
        };

        const containerFeature = turf.feature(containerPolygon, props);
        const multiFeature = turf.feature(multiPolygon, props);

        const result = isGeometryContained(containerFeature, multiFeature);
        expect(result).toBeFalsy();
      });
    });

    describe('MultiPolygon to MultiPolygon containment', () => {
      it('should return false when JobRoi is MultiPolygon and RequestedRoi is MultiPolygon but not identical', () => {
        // Container MultiPolygon with one large polygon that contains both small polygons
        const containerMultiPolygon: MultiPolygon = {
          type: 'MultiPolygon',
          coordinates: [
            // One large container polygon that contains both small polygons
            [
              [
                [-10, -10],
                [-10, 40],
                [40, 40],
                [40, -10],
                [-10, -10],
              ],
            ],
          ],
        };

        // Contained MultiPolygon with two smaller polygons inside the large container
        const containedMultiPolygon: MultiPolygon = {
          type: 'MultiPolygon',
          coordinates: [
            // First small polygon
            [
              [
                [0, 0],
                [0, 10],
                [10, 10],
                [10, 0],
                [0, 0],
              ],
            ],
            // Second small polygon
            [
              [
                [20, 20],
                [20, 30],
                [30, 30],
                [30, 20],
                [20, 20],
              ],
            ],
          ],
        };

        const containerFeature = turf.feature(containerMultiPolygon, props);
        const containedFeature = turf.feature(containedMultiPolygon, props);

        const result = isGeometryContained(containerFeature, containedFeature);
        expect(result).toBeFalsy();
      });

      it('should return false when container MultiPolygon cannot contain all polygons of contained MultiPolygon', () => {
        // Container MultiPolygon with one large polygon
        const containerMultiPolygon: MultiPolygon = {
          type: 'MultiPolygon',
          coordinates: [
            // Only one container polygon
            [
              [
                [-5, -5],
                [-5, 15],
                [15, 15],
                [15, -5],
                [-5, -5],
              ],
            ],
          ],
        };

        // Contained MultiPolygon with polygons that can't all fit
        const containedMultiPolygon: MultiPolygon = {
          type: 'MultiPolygon',
          coordinates: [
            // First polygon - fits in container
            [
              [
                [0, 0],
                [0, 10],
                [10, 10],
                [10, 0],
                [0, 0],
              ],
            ],
            // Second polygon - outside container range
            [
              [
                [20, 20],
                [20, 30],
                [30, 30],
                [30, 20],
                [20, 20],
              ],
            ],
          ],
        };

        const containerFeature = turf.feature(containerMultiPolygon, props);
        const containedFeature = turf.feature(containedMultiPolygon, props);

        const result = isGeometryContained(containerFeature, containedFeature);
        expect(result).toBeFalsy();
      });
    });
  });
});
