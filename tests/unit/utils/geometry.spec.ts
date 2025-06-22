import { container } from 'tsyringe';
import { Polygon, MultiPolygon } from 'geojson';
import jsLogger from '@map-colonies/js-logger';
import { RoiFeatureCollection } from '@map-colonies/raster-shared';
import * as turf from '@turf/turf';
import { configMock, registerDefaultConfig } from '../../mocks/config';
import { sanitizeBboxMock, sanitizeBboxRequestMock, notIntersectedPolygon } from '../../mocks/geometryMocks';
import { checkRoiFeatureCollectionSimilarity, sanitizeBbox, safeContains } from '../../../src/utils/geometry';
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

  describe('safeContains', () => {
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

        const result = safeContains(outerFeature, innerFeature);
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

        const result = safeContains(feature1, feature2);
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

        const result = safeContains(smallFeature, largeFeature);
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

        const result = safeContains(multiFeature, containedFeature);
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

        const result = safeContains(multiFeature, outsideFeature);
        expect(result).toBeFalsy();
      });
    });

    describe('MultiPolygon as contained feature', () => {
      it('should return true when all polygons in MultiPolygon are contained', () => {
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

        const result = safeContains(containerFeature, multiFeature);
        expect(result).toBeTruthy();
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

        const result = safeContains(containerFeature, multiFeature);
        expect(result).toBeFalsy();
      });
    });

    describe('MultiPolygon to MultiPolygon containment', () => {
      it('should return true when container MultiPolygon contains all polygons of contained MultiPolygon', () => {
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

        const result = safeContains(containerFeature, containedFeature);
        expect(result).toBeTruthy();
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

        const result = safeContains(containerFeature, containedFeature);
        expect(result).toBeFalsy();
      });
    });
  });
});
