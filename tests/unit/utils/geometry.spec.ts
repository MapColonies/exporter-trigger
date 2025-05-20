import { container } from 'tsyringe';
import { Feature, MultiPolygon, Polygon } from 'geojson';
import jsLogger from '@map-colonies/js-logger';
import { RoiFeatureCollection, RoiProperties } from '@map-colonies/raster-shared';
import * as turf from '@turf/turf';
import { registerDefaultConfig } from '../../mocks/config';
import { sanitizeBboxMock, sanitizeBboxRequestMock, notIntersectedPolygon } from '../../mocks/geometryMocks';
import { checkRoiFeatureCollectionResemblance, sanitizeBbox } from '../../../src/utils/geometry';
import { SERVICES } from '../../../src/common/constants';

describe('Geometry Utils', () => {
  beforeEach(() => {
    const logger = jsLogger({ enabled: false });
    registerDefaultConfig();
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

  describe('checkRoiFeatureCollectionResemblance', () => {
    function createFeatureCollection(features: Feature<Polygon | MultiPolygon, RoiProperties>[]): RoiFeatureCollection {
      return {
        type: 'FeatureCollection',
        features: features,
      };
    }

    function createPolygonFeature(id: string, coords: number[][], properties: RoiProperties): Feature<Polygon, RoiProperties> {
      return {
        type: 'Feature',
        id,
        properties,
        geometry: {
          type: 'Polygon',
          coordinates: [coords],
        },
      };
    }

    const props1 = { maxResolutionDeg: 0.1, minResolutionDeg: 0.01 };
    const props2 = { maxResolutionDeg: 0.2, minResolutionDeg: 0.02 };

    // Different feature count
    it('should return false when collections have different numbers of features', () => {
      const square = [
        [0, 0],
        [0, 10],
        [10, 10],
        [10, 0],
        [0, 0],
      ];
      const fc1 = createFeatureCollection([createPolygonFeature('f1', square, props1)]);

      const fc2 = createFeatureCollection([createPolygonFeature('f2a', square, props1), createPolygonFeature('f2b', square, props1)]);

      const result = checkRoiFeatureCollectionResemblance(fc1, fc2);
      expect(result).toBe(false);
    });

    // Empty feature collections
    it('should return true when both collections are empty', () => {
      const fc1 = createFeatureCollection([]);
      const fc2 = createFeatureCollection([]);

      const result = checkRoiFeatureCollectionResemblance(fc1, fc2);
      expect(result).toBe(true);
    });

    // Different properties
    it('should return false when features have different properties', () => {
      const square = [
        [0, 0],
        [0, 10],
        [10, 10],
        [10, 0],
        [0, 0],
      ];
      const fc1 = createFeatureCollection([createPolygonFeature('f1', square, props1)]);

      const fc2 = createFeatureCollection([createPolygonFeature('f2', square, props2)]);

      const result = checkRoiFeatureCollectionResemblance(fc1, fc2);
      expect(result).toBe(false);
    });

    // Containment with area ratio within threshold
    it('should return true when one feature contains another and area ratio is within threshold', () => {
      // Square: 100 sq units
      const outerSquare = [
        [0, 0],
        [0, 10],
        [10, 10],
        [10, 0],
        [0, 0],
      ];
      // Inner square: 96 sq units (96% of outer) - above 90% threshold
      const innerSquare = [
        [0.2, 0.2],
        [0.2, 9.8],
        [9.8, 9.8],
        [9.8, 0.2],
        [0.2, 0.2],
      ];

      const fc1 = createFeatureCollection([createPolygonFeature('f1', outerSquare, props1)]);

      const fc2 = createFeatureCollection([createPolygonFeature('f2', innerSquare, props1)]);

      const result = checkRoiFeatureCollectionResemblance(fc1, fc2);
      expect(result).toBe(true);
    });

    // Containment with area ratio below threshold
    it('should return false when one feature contains another but area ratio is below threshold', () => {
      // Square: 100 sq units
      const outerSquare = [
        [0, 0],
        [0, 10],
        [10, 10],
        [10, 0],
        [0, 0],
      ];
      // Inner square: 64 sq units (64% of outer) - below 90% threshold
      const innerSquare = [
        [2, 2],
        [2, 8],
        [8, 8],
        [8, 2],
        [2, 2],
      ];

      const fc1 = createFeatureCollection([createPolygonFeature('f1', outerSquare, props1)]);

      const fc2 = createFeatureCollection([createPolygonFeature('f2', innerSquare, props1)]);

      const result = checkRoiFeatureCollectionResemblance(fc1, fc2);
      expect(result).toBe(false);
    });

    // Buffer doesn't create containment
    it("should return false when buffer doesn't create containment", () => {
      // Two squares that are 10 meters apart - beyond the 5 meter buffer
      const square1 = [
        [0, 0],
        [0, 10],
        [10, 10],
        [10, 0],
        [0, 0],
      ];
      const square2 = [
        [20, 0],
        [20, 10],
        [30, 10],
        [30, 0],
        [20, 0],
      ];

      const fc1 = createFeatureCollection([createPolygonFeature('f1', square1, props1)]);

      const fc2 = createFeatureCollection([createPolygonFeature('f2', square2, props1)]);

      const result = checkRoiFeatureCollectionResemblance(fc1, fc2);
      expect(result).toBe(false);
    });

    // Multiple features - all match
    it('should return true when all features in collections find matches', () => {
      // First collection has two squares
      const square1a = [
        [0, 0],
        [0, 10],
        [10, 10],
        [10, 0],
        [0, 0],
      ];
      const square1b = [
        [20, 0],
        [20, 10],
        [30, 10],
        [30, 0],
        [20, 0],
      ];

      // Second collection has matching squares (slightly smaller but within threshold)
      const square2a = [
        [0.5, 0.5],
        [0.5, 9.5],
        [9.5, 9.5],
        [9.5, 0.5],
        [0.5, 0.5],
      ];
      const square2b = [
        [20.5, 0.5],
        [20.5, 9.5],
        [29.5, 9.5],
        [29.5, 0.5],
        [20.5, 0.5],
      ];

      const fc1 = createFeatureCollection([createPolygonFeature('f1a', square1a, props1), createPolygonFeature('f1b', square1b, props1)]);

      const fc2 = createFeatureCollection([createPolygonFeature('f2a', square2a, props1), createPolygonFeature('f2b', square2b, props1)]);

      const result = checkRoiFeatureCollectionResemblance(fc1, fc2);
      expect(result).toBe(true);
    });

    // Multiple features - some don't match
    it("should return false when some features don't find matches", () => {
      // First collection has two squares
      const square1a = [
        [0, 0],
        [0, 10],
        [10, 10],
        [10, 0],
        [0, 0],
      ];
      const square1b = [
        [20, 0],
        [20, 10],
        [30, 10],
        [30, 0],
        [20, 0],
      ];

      // Second collection has one matching square and one non-matching
      const square2a = [
        [0.5, 0.5],
        [0.5, 9.5],
        [9.5, 9.5],
        [9.5, 0.5],
        [0.5, 0.5],
      ]; // Matches square1a
      const square2b = [
        [40, 0],
        [40, 10],
        [50, 10],
        [50, 0],
        [40, 0],
      ]; // Far from any square in fc1

      const fc1 = createFeatureCollection([createPolygonFeature('f1a', square1a, props1), createPolygonFeature('f1b', square1b, props1)]);

      const fc2 = createFeatureCollection([createPolygonFeature('f2a', square2a, props1), createPolygonFeature('f2b', square2b, props1)]);

      const result = checkRoiFeatureCollectionResemblance(fc1, fc2);
      expect(result).toBe(false);
    });

    // Multiple features - different order
    it('should match features correctly regardless of order', () => {
      // First collection has two squares
      const square1a = [
        [0, 0],
        [0, 10],
        [10, 10],
        [10, 0],
        [0, 0],
      ];
      const square1b = [
        [20, 0],
        [20, 10],
        [30, 10],
        [30, 0],
        [20, 0],
      ];

      // Second collection has matching squares but in reverse order
      const square2a = [
        [0.5, 0.5],
        [0.5, 9.5],
        [9.5, 9.5],
        [9.5, 0.5],
        [0.5, 0.5],
      ]; // Matches square1a
      const square2b = [
        [20.5, 0.5],
        [20.5, 9.5],
        [29.5, 9.5],
        [29.5, 0.5],
        [20.5, 0.5],
      ]; // Matches square1b

      const fc1 = createFeatureCollection([createPolygonFeature('f1a', square1a, props1), createPolygonFeature('f1b', square1b, props1)]);

      const fc2 = createFeatureCollection([
        // Order reversed compared to fc1
        createPolygonFeature('f2b', square2b, props1),
        createPolygonFeature('f2a', square2a, props1),
      ]);

      const result = checkRoiFeatureCollectionResemblance(fc1, fc2);
      expect(result).toBe(true);
    });

    // Ambiguous matching
    it('should handle ambiguous matching correctly', () => {
      // First collection has two identical squares at the same location
      const square1 = [
        [0, 0],
        [0, 10],
        [10, 10],
        [10, 0],
        [0, 0],
      ];

      // Second collection has two identical squares at the same location
      const square2 = [
        [0.5, 0.5],
        [0.5, 9.5],
        [9.5, 9.5],
        [9.5, 0.5],
        [0.5, 0.5],
      ];

      const fc1 = createFeatureCollection([createPolygonFeature('f1a', square1, props1), createPolygonFeature('f1b', square1, props1)]);

      const fc2 = createFeatureCollection([createPolygonFeature('f2a', square2, props1), createPolygonFeature('f2b', square2, props1)]);

      const result = checkRoiFeatureCollectionResemblance(fc1, fc2);
      expect(result).toBe(true);
    });

    // Exactly at threshold boundary
    it('should handle area ratio exactly at threshold boundary', () => {
      // Square: 100 sq units
      const outerSquare = [
        [0, 0],
        [0, 10],
        [10, 10],
        [10, 0],
        [0, 0],
      ];

      // Inner square with exactly 90% area of outer square - exactly at the threshold
      // For a square, side length = sqrt(area)
      // So sqrt(90) ≈ 9.487
      const sideLength = Math.sqrt(90);
      const offset = (10 - sideLength) / 2; // To center the smaller square

      const innerSquare = [
        [offset, offset],
        [offset, offset + sideLength],
        [offset + sideLength, offset + sideLength],
        [offset + sideLength, offset],
        [offset, offset],
      ];

      const fc1 = createFeatureCollection([createPolygonFeature('f1', outerSquare, props1)]);

      const fc2 = createFeatureCollection([createPolygonFeature('f2', innerSquare, props1)]);

      const result = checkRoiFeatureCollectionResemblance(fc1, fc2);
      expect(result).toBe(true);
    });

    // Invalid geometry handling
    it('should handle invalid geometries gracefully', () => {
      // Create valid geometry
      const validSquare = [
        [0, 0],
        [0, 10],
        [10, 10],
        [10, 0],
        [0, 0],
      ];

      // Create invalid geometry (self-intersecting polygon)
      const invalidPolygon = [
        [0, 0],
        [10, 10],
        [0, 10],
        [10, 0],
        [0, 0],
      ];

      const fc1 = createFeatureCollection([createPolygonFeature('f1', validSquare, props1)]);

      const fc2 = createFeatureCollection([createPolygonFeature('f2', invalidPolygon, props1)]);

      const result = checkRoiFeatureCollectionResemblance(fc1, fc2);

      expect(result).toBe(false);
    });
  });
});
