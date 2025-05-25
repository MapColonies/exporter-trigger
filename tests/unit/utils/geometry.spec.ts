import { container } from 'tsyringe';
import { Polygon } from 'geojson';
import jsLogger from '@map-colonies/js-logger';
import { RoiFeatureCollection } from '@map-colonies/raster-shared';
import * as turf from '@turf/turf';
import { configMock, registerDefaultConfig } from '../../mocks/config';
import { sanitizeBboxMock, sanitizeBboxRequestMock, notIntersectedPolygon } from '../../mocks/geometryMocks';
import { checkRoiFeatureCollectionSimilarity, sanitizeBbox } from '../../../src/utils/geometry';
import { SERVICES } from '../../../src/common/constants';

describe('Geometry Utils', () => {
  beforeEach(() => {
    registerDefaultConfig();
    const logger = jsLogger({ enabled: false });
    container.register(SERVICES.LOGGER, { useValue: logger });
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

      const result = checkRoiFeatureCollectionSimilarity(fc1, fc2, { config: configMock });

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

      const result = checkRoiFeatureCollectionSimilarity(fc1, fc2, { config: configMock });

      expect(result).toBeFalsy();
    });

    // Empty feature collections
    it('should return true when both collections are empty', () => {
      const fc1 = turf.featureCollection([]) as RoiFeatureCollection;
      const fc2 = turf.featureCollection([]) as RoiFeatureCollection;

      const result = checkRoiFeatureCollectionSimilarity(fc1, fc2, { config: configMock });

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

      const result = checkRoiFeatureCollectionSimilarity(fc1, fc2, { config: configMock });

      expect(result).toBeFalsy();
    });

    // Containment with area ratio within threshold
    it('should return true when one feature contains another and area ratio is within threshold', () => {
      // Square: 100 sq units
      const outerSquarePolygon: Polygon = {
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

      // Inner square: 96 sq units (96% of outer) - above 90% threshold
      const innerSquarePolygon: Polygon = {
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

      const fc1 = turf.featureCollection([turf.feature(outerSquarePolygon, props1, { id: 'f1' })]);
      const fc2 = turf.featureCollection([turf.feature(innerSquarePolygon, props1, { id: 'f2' })]);

      const result = checkRoiFeatureCollectionSimilarity(fc1, fc2, { config: configMock });

      expect(result).toBeTruthy();
    });

    // Containment with area ratio below threshold
    it('should return false when one feature contains another but area ratio is below threshold', () => {
      // Square: 100 sq units
      const outerSquarePolygon: Polygon = {
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

      // Inner square: 64 sq units (64% of outer) - below 90% threshold
      const innerSquarePolygon: Polygon = {
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

      const fc1 = turf.featureCollection([turf.feature(outerSquarePolygon, props1, { id: 'f1' })]);
      const fc2 = turf.featureCollection([turf.feature(innerSquarePolygon, props1, { id: 'f2' })]);

      const result = checkRoiFeatureCollectionSimilarity(fc1, fc2, { config: configMock });

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

      const result = checkRoiFeatureCollectionSimilarity(fc1, fc2, { config: configMock });

      expect(result).toBeFalsy();
    });

    // Multiple features - all match
    it('should return true when all features in collections find matches', () => {
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

      // Second collection has matching squares (slightly smaller but within threshold)
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
            [20.5, 0.5],
            [20.5, 9.5],
            [29.5, 9.5],
            [29.5, 0.5],
            [20.5, 0.5],
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

      const result = checkRoiFeatureCollectionSimilarity(fc1, fc2, { config: configMock });

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

      const result = checkRoiFeatureCollectionSimilarity(fc1, fc2, { config: configMock });

      expect(result).toBeFalsy();
    });

    // Multiple features - different order
    it('should match features correctly regardless of order', () => {
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

      // Second collection has matching squares but in reverse order
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
            [20.5, 0.5],
            [20.5, 9.5],
            [29.5, 9.5],
            [29.5, 0.5],
            [20.5, 0.5],
          ],
        ],
      };

      const fc1 = turf.featureCollection([
        turf.feature(square1aPolygon, props1, { id: 'f1a' }),
        turf.feature(square1bPolygon, props1, { id: 'f1b' }),
      ]);

      const fc2 = turf.featureCollection([
        // Order reversed compared to fc1
        turf.feature(square2bPolygon, props1, { id: 'f2b' }),
        turf.feature(square2aPolygon, props1, { id: 'f2a' }),
      ]);

      const result = checkRoiFeatureCollectionSimilarity(fc1, fc2, { config: configMock });

      expect(result).toBeTruthy();
    });

    // Ambiguous matching
    it('should handle ambiguous matching correctly', () => {
      // First collection has two identical squares at the same location
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

      // Second collection has two identical squares at the same location
      const square2Polygon: Polygon = {
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

      const fc1 = turf.featureCollection([turf.feature(square1Polygon, props1, { id: 'f1a' }), turf.feature(square1Polygon, props1, { id: 'f1b' })]);
      const fc2 = turf.featureCollection([turf.feature(square2Polygon, props1, { id: 'f2a' }), turf.feature(square2Polygon, props1, { id: 'f2b' })]);

      const result = checkRoiFeatureCollectionSimilarity(fc1, fc2, { config: configMock });

      expect(result).toBeTruthy();
    });

    // Exactly at threshold boundary
    it('should handle area ratio exactly at threshold boundary', () => {
      // Square: 100 sq units
      const outerSquarePolygon: Polygon = {
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

      // Inner square with exactly 90% area of outer square - exactly at the threshold
      // For a square, side length = sqrt(area)
      // So sqrt(90) ≈ 9.487
      const sideLength = Math.sqrt(90);
      const offset = (10 - sideLength) / 2; // To center the smaller square

      const innerSquarePolygon: Polygon = {
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

      const fc1 = turf.featureCollection([turf.feature(outerSquarePolygon, props1, { id: 'f1' })]);
      const fc2 = turf.featureCollection([turf.feature(innerSquarePolygon, props1, { id: 'f2' })]);

      const result = checkRoiFeatureCollectionSimilarity(fc1, fc2, { config: configMock });

      expect(result).toBeTruthy();
    });

    // Invalid geometry handling
    it('should handle invalid geometries gracefully', () => {
      // Create valid geometry
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

      // Create invalid geometry (self-intersecting polygon)
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

      const fc1 = turf.featureCollection([turf.feature(validSquarePolygon, props1, { id: 'f1' })]);
      const fc2 = turf.featureCollection([turf.feature(invalidPolygon, props1, { id: 'f2' })]);

      const result = checkRoiFeatureCollectionSimilarity(fc1, fc2, { config: configMock });

      expect(result).toBeFalsy();
    });
  });
});
